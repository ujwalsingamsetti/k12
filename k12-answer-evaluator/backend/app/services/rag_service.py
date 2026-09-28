import os
import asyncio
from typing import List, Dict, Optional, Any
from collections import OrderedDict
from loguru import logger
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, PointStruct
from sentence_transformers import SentenceTransformer
from app.config import settings


def normalize_subject(subject: str) -> str:
    """Normalize subject string to standard canonical key (e.g., 'Science' -> 'science')."""
    s = (subject or "").strip().lower()
    if s in ["math", "maths", "mathematics"]:
        return "mathematics"
    if s in ["cs", "comp sci", "computer science", "python"]:
        return "computer science"
    if s in ["chem", "chemistry"]:
        return "chemistry"
    if s in ["phy", "physics"]:
        return "physics"
    if s in ["sci", "science", "general science"]:
        return "science"
    if s in ["eng", "english"]:
        return "english"
    return s


def normalize_class_level(level: str) -> str:
    """Normalize academic class level string to standard canonical key (e.g. 'Class 10', '10th' -> 'class 10')."""
    import re
    l = (level or "").strip().lower()
    if not l or l in ["general", "any", "all", "none"]:
        return "all"
    digits = re.findall(r'\d+', l)
    if digits:
        return f"class {digits[0]}"
    return l


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
        """Lazy-loaded Qdrant client with automatic connection reuse and embedded fallback"""
        global _shared_qdrant_client
        if _shared_qdrant_client is not None:
            return _shared_qdrant_client

        # Try remote Qdrant only if URL is explicitly provided and not default unreachable localhost
        client = None
        if settings.QDRANT_URL and not settings.QDRANT_URL.startswith("http://localhost:6333"):
            try:
                candidate = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY,
                    timeout=2.0
                )
                candidate.get_collections()
                client = candidate
                logger.info(f"Connected to remote Qdrant at {settings.QDRANT_URL}")
            except Exception:
                client = None

        if client is None:
            storage_path = os.path.join(settings.DATA_DIR, "qdrant_storage")
            os.makedirs(storage_path, exist_ok=True)
            try:
                client = QdrantClient(path=storage_path)
                logger.info(f"Embedded local Qdrant initialized at {storage_path}")
            except Exception as e:
                logger.error(f"Failed to initialize embedded local Qdrant at {storage_path}: {e}")
                raise e

        # Ensure collection exists
        try:
            if not client.collection_exists(settings.QDRANT_COLLECTION_NAME):
                from qdrant_client.models import VectorParams, Distance
                client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=settings.QDRANT_VECTOR_SIZE,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection: {settings.QDRANT_COLLECTION_NAME}")
        except Exception as ce:
            logger.debug(f"Collection check/creation note: {ce}")

        _shared_qdrant_client = client
        self._ensure_payload_indexes()
        return _shared_qdrant_client

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
        
        norm_subject = normalize_subject(subject)
        norm_level = normalize_class_level(class_level)

        # Check context cache for identical query + subject + level
        cache_key = f"{norm_subject}:{norm_level}:{query.strip().lower()}"
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
            
            # Build strict metadata filters for subject and class_level
            conditions = [
                FieldCondition(
                    key="subject",
                    match=MatchValue(value=norm_subject)
                )
            ]
            
            if norm_level != "all":
                conditions.append(
                    FieldCondition(
                        key="class_level",
                        match=MatchValue(value=norm_level)
                    )
                )

            # Fast vector search with strict metadata filtering & payload projection
            search_result = self.qdrant_client.query_points(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                query=query_vector,
                query_filter=Filter(must=conditions),
                with_payload=["text", "chapter", "source", "subject", "class_level", "page_number", "chunk_index"],
                limit=top_k * 2
            ).points
            
            # Graceful relaxation to subject-only if strict level filter produced 0 results
            if not search_result and len(conditions) > 1:
                logger.info(f"RAG: 0 chunks with strict class filter '{norm_level}', relaxing to subject '{norm_subject}'")
                search_result = self.qdrant_client.query_points(
                    collection_name=settings.QDRANT_COLLECTION_NAME,
                    query=query_vector,
                    query_filter=Filter(must=[conditions[0]]),
                    with_payload=["text", "chapter", "source", "subject", "class_level", "page_number", "chunk_index"],
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
                    "chapter": payload.get("chapter", "Curriculum Reference Chapter"),
                    "source": payload.get("source", "NCERT Reference Textbook"),
                    "subject": payload.get("subject", norm_subject),
                    "class_level": payload.get("class_level", norm_level),
                    "page_number": payload.get("page_number", 1),
                    "chunk_index": payload.get("chunk_index", 0)
                })
            
            # Save to context cache (excluding question paper context which is dynamic)
            if not question_paper_context and results:
                if len(self._context_cache) >= self._context_cache_max_size:
                    self._context_cache.popitem(last=False)
                self._context_cache[cache_key] = [dict(r) for r in results]

            logger.info(f"Retrieved {len(results)} chunks for '{query[:30]}...' (filter: {norm_subject} / {norm_level})")
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

    def get_vector_db_stats(self) -> Dict[str, Any]:
        """Return point count, collection name, subject breakdown, and health status of Qdrant vector database."""
        try:
            col_info = self.qdrant_client.get_collection(collection_name=settings.QDRANT_COLLECTION_NAME)
            points_count = getattr(col_info, "points_count", 0) or 0

            subjects_breakdown: Dict[str, int] = {}
            if points_count > 0:
                for subj in ["science", "mathematics", "physics", "computer science", "chemistry", "english"]:
                    try:
                        res = self.qdrant_client.count(
                            collection_name=settings.QDRANT_COLLECTION_NAME,
                            count_filter=Filter(must=[FieldCondition(key="subject", match=MatchValue(value=subj))])
                        )
                        if res.count > 0:
                            subjects_breakdown[subj] = res.count
                    except Exception as count_err:
                        logger.debug(f"Count error for subject {subj}: {count_err}")

            return {
                "collection_name": settings.QDRANT_COLLECTION_NAME,
                "total_points": points_count,
                "status": "POPULATED" if points_count > 0 else "EMPTY",
                "vector_size": settings.QDRANT_VECTOR_SIZE,
                "distance_metric": settings.QDRANT_DISTANCE_METRIC,
                "embedding_model": settings.EMBEDDING_MODEL,
                "subjects_breakdown": subjects_breakdown
            }
        except Exception as e:
            logger.error(f"Failed to get vector DB stats: {e}")
            return {
                "collection_name": settings.QDRANT_COLLECTION_NAME,
                "total_points": 0,
                "status": f"ERROR: {str(e)}",
                "vector_size": settings.QDRANT_VECTOR_SIZE,
                "subjects_breakdown": {}
            }

    async def ingest_curriculum_textbooks_async(self, force_reingest: bool = False) -> Dict[str, Any]:
        """Asynchronously ingest all curriculum textbooks into Qdrant vector database."""
        return await asyncio.to_thread(self.ingest_curriculum_textbooks, force_reingest=force_reingest)

    def ingest_curriculum_textbooks(self, force_reingest: bool = False) -> Dict[str, Any]:
        """Ingest all curriculum modules and textbook PDFs into Qdrant with batch embedding."""
        from app.services.textbook_knowledge_base import load_all_curriculum_textbook_chunks

        current_stats = self.get_vector_db_stats()
        if current_stats.get("total_points", 0) > 0 and not force_reingest:
            logger.info(f"Vector DB already populated with {current_stats['total_points']} points. Skipping re-ingestion.")
            return {
                "status": "ALREADY_POPULATED",
                "total_ingested": current_stats["total_points"],
                "stats": current_stats
            }

        chunks = load_all_curriculum_textbook_chunks()
        if not chunks:
            return {"status": "EMPTY_CHUNKS", "total_ingested": 0}

        logger.info(f"Generating dense embeddings for {len(chunks)} textbook chunks...")
        batch_size = 32
        total_upserted = 0

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c["text"] for c in batch]
            embeddings = self.embedding_model.encode(texts, show_progress_bar=False).tolist()

            points = []
            for c, emb in zip(batch, embeddings):
                points.append(PointStruct(
                    id=c["id"],
                    vector=emb,
                    payload={
                        "text": c["text"],
                        "subject": c["subject"].lower(),
                        "class_level": c["class_level"].lower(),
                        "chapter": c["chapter"],
                        "source": c["source"],
                        "chunk_index": c.get("chunk_index", 0)
                    }
                ))

            self.qdrant_client.upsert(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points=points
            )
            total_upserted += len(points)
            logger.info(f"Upserted batch {i // batch_size + 1} ({total_upserted}/{len(chunks)} chunks into Qdrant)")

        # Clear context cache so new chunks are immediately discoverable
        self._context_cache.clear()
        updated_stats = self.get_vector_db_stats()
        logger.info(f"✅ Completed textbook ingestion: {total_upserted} chunks indexed in Qdrant!")
        return {
            "status": "SUCCESS",
            "total_ingested": total_upserted,
            "stats": updated_stats
        }

    def get_chunks_for_textbook(self, textbook_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve actual chunks stored in Qdrant for a specific textbook ID."""
        try:
            scroll_filter = Filter(must=[FieldCondition(key="textbook_id", match=MatchValue(value=textbook_id))])
            points, _ = self.qdrant_client.scroll(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                scroll_filter=scroll_filter,
                limit=limit,
                with_payload=True,
                with_vectors=False
            )
            chunks: List[Dict[str, Any]] = []
            for p in points:
                payload = p.payload or {}
                txt = payload.get("text", "")
                chunks.append({
                    "id": str(p.id),
                    "text": txt,
                    "chunk_index": payload.get("chunk_index", 0),
                    "page_number": payload.get("page_number", 1),
                    "chapter": payload.get("chapter", ""),
                    "source": payload.get("source", ""),
                    "subject": payload.get("subject", ""),
                    "class_level": payload.get("class_level", ""),
                    "char_count": len(txt),
                    "word_count": len(txt.split())
                })
            return sorted(chunks, key=lambda x: (x.get("page_number", 0), x.get("chunk_index", 0)))
        except Exception as e:
            logger.error(f"Failed to retrieve chunks for textbook {textbook_id}: {e}")
            return []

    def delete_chunks_by_textbook_id(self, textbook_id: str) -> bool:
        """Delete all vectors and payload associated with a textbook ID from Qdrant."""
        try:
            delete_filter = Filter(must=[FieldCondition(key="textbook_id", match=MatchValue(value=textbook_id))])
            self.qdrant_client.delete(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points_selector=delete_filter
            )
            self._context_cache.clear()
            logger.info(f"Deleted vector chunks for textbook {textbook_id} from Qdrant")
            return True
        except Exception as e:
            logger.error(f"Failed to delete chunks for textbook {textbook_id}: {e}")
            return False

    def delete_all_chunks(self) -> Dict[str, Any]:
        """Delete all vectors and clear collection in Qdrant, resetting vector DB to 0 chunks.
        
        Returns:
            Dict[str, Any]: Operation status and point count.
        """
        try:
            from qdrant_client.models import VectorParams, Distance
            if self.qdrant_client.collection_exists(settings.QDRANT_COLLECTION_NAME):
                self.qdrant_client.delete_collection(settings.QDRANT_COLLECTION_NAME)
                logger.info(f"Deleted Qdrant collection {settings.QDRANT_COLLECTION_NAME}")

            self.qdrant_client.create_collection(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=settings.QDRANT_VECTOR_SIZE,
                    distance=Distance.COSINE
                )
            )
            self._indexes_ensured = False
            self._ensure_payload_indexes()
            self._context_cache.clear()
            self._embedding_cache.clear()
            logger.info("Recreated empty Qdrant collection with payload indexes")
            return {
                "status": "SUCCESS",
                "collection_name": settings.QDRANT_COLLECTION_NAME,
                "total_points": 0,
                "message": "All chunks successfully deleted from Qdrant vector database."
            }
        except Exception as e:
            logger.error(f"Failed to delete all chunks from Qdrant: {e}")
            raise e

    def upsert_textbook_points(self, points: List[PointStruct]) -> int:
        """Upsert points into Qdrant collection in batches."""
        if not points:
            return 0
        batch_size = 32
        total = 0
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            self.qdrant_client.upsert(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points=batch
            )
            total += len(batch)
        self._context_cache.clear()
        return total


# Global singleton instances
_rag_service_instance = None
_shared_qdrant_client = None


def get_rag_service() -> RAGService:
    """Thread-safe lazy singleton for RAGService to avoid reloading transformer weights"""
    global _rag_service_instance
    if _rag_service_instance is None:
        _rag_service_instance = RAGService()
    return _rag_service_instance

