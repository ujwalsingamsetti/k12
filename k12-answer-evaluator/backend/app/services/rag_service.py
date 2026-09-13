import logging
import asyncio
from typing import List, Dict, Optional
from collections import OrderedDict
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer
from app.config import settings

logger = logging.getLogger(__name__)

class RAGService:
    """High-performance RAG service for retrieving relevant textbook context with embedding caching"""
    
    def __init__(self):
        logger.info("Initializing RAGService...")
        self._embedding_model = None
        self._qdrant_client = None
        
        # In-memory LRU caches
        self._embedding_cache: OrderedDict[str, List[float]] = OrderedDict()
        self._embedding_cache_max_size = 2048
        
        self._context_cache: OrderedDict[str, List[Dict]] = OrderedDict()
        self._context_cache_max_size = 512
        
        self._indexes_ensured = False
        logger.info("RAGService initialized")
    
    @property
    def embedding_model(self) -> SentenceTransformer:
        """Lazy-loaded embedding model to minimize startup latency and memory footprint"""
        if self._embedding_model is None:
            logger.info(f"Loading embedding model '{settings.EMBEDDING_MODEL}' on {settings.EMBEDDING_DEVICE}...")
            self._embedding_model = SentenceTransformer(
                settings.EMBEDDING_MODEL,
                device=settings.EMBEDDING_DEVICE
            )
            logger.info("Embedding model loaded successfully")
        return self._embedding_model
    
    @property
    def qdrant_client(self) -> QdrantClient:
        """Lazy-loaded Qdrant client with automatic connection reuse"""
        if self._qdrant_client is None:
            self._qdrant_client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY
            )
            self._ensure_payload_indexes()
        return self._qdrant_client

    def _ensure_payload_indexes(self):
        """Ensure Qdrant has indexed payload fields for fast filtered lookups"""
        if self._indexes_ensured:
            return
        try:
            from qdrant_client.models import PayloadSchemaType
            for field in ["subject", "class_level"]:
                try:
                    self._qdrant_client.create_payload_index(
                        collection_name=settings.QDRANT_COLLECTION_NAME,
                        field_name=field,
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                except Exception:
                    pass
            self._indexes_ensured = True
        except Exception as e:
            logger.debug(f"Payload index initialization skipped: {e}")

    def get_query_embedding(self, query: str) -> List[float]:
        """Compute or retrieve cached embedding for query (0ms latency on cache hit)"""
        norm_query = query.strip().lower()
        if norm_query in self._embedding_cache:
            # Move to end for LRU freshness
            self._embedding_cache.move_to_end(norm_query)
            return self._embedding_cache[norm_query]
        
        vector = self.embedding_model.encode(query).tolist()
        
        # Evict oldest entry if cache is full
        if len(self._embedding_cache) >= self._embedding_cache_max_size:
            self._embedding_cache.popitem(last=False)
        self._embedding_cache[norm_query] = vector
        return vector

    async def retrieve_relevant_context_async(
        self,
        query: str,
        subject: str,
        top_k: int = 5,
        question_paper_context: str = None,
        class_level: str = None
    ) -> List[Dict]:
        """Asynchronously retrieve relevant context without blocking the FastAPI event loop"""
        return await asyncio.to_thread(
            self.retrieve_relevant_context,
            query=query,
            subject=subject,
            top_k=top_k,
            question_paper_context=question_paper_context,
            class_level=class_level
        )

    def retrieve_relevant_context(
        self,
        query: str,
        subject: str,
        top_k: int = 5,
        question_paper_context: str = None,
        class_level: str = None
    ) -> List[Dict]:
        """Retrieve relevant context using hybrid search with embedding & result caching"""
        
        # Check context cache for identical query + subject + level
        cache_key = f"{subject.lower()}:{class_level or 'any'}:{query.strip().lower()}"
        if not question_paper_context and cache_key in self._context_cache:
            self._context_cache.move_to_end(cache_key)
            logger.debug(f"Cache hit for RAG context: {cache_key[:40]}")
            return [dict(c) for c in self._context_cache[cache_key]]

        results = []
        
        # First priority: Question paper context
        if question_paper_context:
            results.append({
                "text": question_paper_context,
                "score": 1.0,
                "chapter": "Question Paper",
                "source": "question_paper"
            })
        
        try:
            # Extract keywords for hybrid re-ranking
            keywords = self._extract_keywords(query)
            
            # Cached query embedding
            query_vector = self.get_query_embedding(query)
            
            # Build filters
            conditions = [
                FieldCondition(
                    key="subject",
                    match=MatchValue(value=subject.lower())
                )
            ]
            
            if class_level and class_level.lower() not in ["general", "any", "all", "none"]:
                conditions.append(
                    FieldCondition(
                        key="class_level",
                        match=MatchValue(value=class_level.lower())
                    )
                )

            # Fast vector search with payload projection
            search_result = self.qdrant_client.query_points(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                query=query_vector,
                query_filter=Filter(must=conditions),
                with_payload=["text", "chapter", "source", "subject", "class_level"],
                limit=top_k * 2
            ).points
            
            # Fallback to subject-only if level filter produced 0 results
            if not search_result and len(conditions) > 1:
                search_result = self.qdrant_client.query_points(
                    collection_name=settings.QDRANT_COLLECTION_NAME,
                    query=query_vector,
                    query_filter=Filter(must=[conditions[0]]),
                    with_payload=["text", "chapter", "source", "subject", "class_level"],
                    limit=top_k * 2
                ).points
            
            # Re-rank results using keyword matching
            ranked_results = self._rerank_with_keywords(search_result, keywords)
            
            # Format top results
            for point in ranked_results[:top_k]:
                payload = point.payload or {}
                results.append({
                    "text": payload.get("text", ""),
                    "score": point.score,
                    "chapter": payload.get("chapter", "unknown"),
                    "source": payload.get("source", "textbook")
                })
            
            # Save to context cache (excluding question paper context which is dynamic)
            if not question_paper_context and results:
                if len(self._context_cache) >= self._context_cache_max_size:
                    self._context_cache.popitem(last=False)
                self._context_cache[cache_key] = [dict(r) for r in results]

            logger.info(f"Retrieved {len(results)} chunks for '{query[:30]}...' (hybrid search)")
            return results
        
        except Exception as e:
            logger.error(f"RAG retrieval failed: {e}")
            return results if results else [{
                "text": "No reference material available.",
                "score": 0.0,
                "chapter": "unknown",
                "source": "fallback"
            }]
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Extract important keywords from question"""
        import re
        stop_words = {'what', 'why', 'how', 'when', 'where', 'is', 'are', 'the', 'a', 'an', 'of', 'in', 'to', 'for', 'with', 'from'}
        words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9]*\b', query.lower())
        keywords = [w for w in words if w not in stop_words and len(w) > 3]
        return keywords[:10]
    
    def _rerank_with_keywords(self, search_results, keywords: List[str]):
        """Re-rank results by boosting keyword matches"""
        if not keywords:
            return search_results
        
        for point in search_results:
            payload = point.payload or {}
            text_lower = payload.get("text", "").lower()
            keyword_matches = sum(1 for kw in keywords if kw in text_lower)
            keyword_boost = (keyword_matches / len(keywords)) * 0.2
            point.score = min(point.score + keyword_boost, 1.0)
        
        return sorted(search_results, key=lambda x: x.score, reverse=True)
    
    def format_context_for_llm(self, chunks: List[Dict], max_tokens: int = 2000) -> str:
        """Format retrieved chunks for LLM with token-efficient structure"""
        if not chunks:
            return "No specific reference available."
        
        context_parts = []
        
        qp_chunks = [c for c in chunks if c.get("source") == "question_paper"]
        tb_chunks = [c for c in chunks if c.get("source") != "question_paper"]
        
        if qp_chunks:
            context_parts.append(f"[EXAM CONTEXT]\n{qp_chunks[0]['text'].strip()}")
        
        if tb_chunks:
            tb_items = []
            for idx, chunk in enumerate(tb_chunks[:3], 1):
                chapter = chunk.get("chapter", "Ref")
                tb_items.append(f"Source {idx} ({chapter}, score: {chunk.get('score', 0):.2f}):\n{chunk['text'].strip()}")
            context_parts.append("[TEXTBOOK REFERENCE]\n" + "\n\n".join(tb_items))
        
        full_context = "\n\n".join(context_parts)
        
        # 1 English token ≈ 3.8 to 4.0 characters (corrected from 0.75 chars bug)
        max_chars = int(max_tokens * 3.8)
        if len(full_context) > max_chars:
            full_context = full_context[:max_chars] + "..."
        
        return full_context


# Global singleton instance
_rag_service_instance = None


def get_rag_service() -> RAGService:
    """Thread-safe lazy singleton for RAGService to avoid reloading transformer weights"""
    global _rag_service_instance
    if _rag_service_instance is None:
        _rag_service_instance = RAGService()
    return _rag_service_instance

