"""Textbook Management and Real Vector Chunk Ingestion API Router.

Provides endpoints for uploading real textbook PDFs, extracting actual text via PyMuPDF (fitz),
chunking with sentence-boundary awareness, generating dense vector embeddings,
and indexing into Qdrant vector database (k12_textbooks) with full chunk inspection.
"""

import os
import uuid
import json
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel
from loguru import logger
from qdrant_client.models import PointStruct

from app.config import settings
from app.services.rag_service import get_rag_service, normalize_subject, normalize_class_level

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

router = APIRouter(prefix="/textbooks", tags=["Textbooks & Vector Chunks"])

MANIFEST_FILE = os.path.join(settings.DATA_DIR, "textbooks", "manifest.json")


# ─────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────

class ChunkItem(BaseModel):
    """A real text chunk stored in Qdrant."""
    id: str
    text: str
    chunk_index: int
    page_number: int
    chapter: str
    source: str
    subject: str
    class_level: str
    char_count: int
    word_count: int


class TextbookItem(BaseModel):
    """Catalog metadata for an ingested textbook."""
    id: str
    title: str
    filename: str
    subject: str
    class_level: str
    chapter: str
    total_pages: int
    chunk_count: int
    file_size_bytes: int
    ingested_at: str


class TextbookChunkResponse(BaseModel):
    """Response containing real chunks for a specific textbook."""
    textbook_id: str
    title: str
    total_chunks: int
    chunks: List[ChunkItem]


class DiscoveredTextbookItem(BaseModel):
    """A real PDF textbook discovered on disk in repository assets."""
    id: str
    filename: str
    filepath: str
    subject: str
    class_level: str
    title: str
    total_pages: int
    file_size_kb: float
    is_ingested: bool


class VectorDBStatsResponse(BaseModel):
    """Vector database health, points count, and subject breakdown."""
    collection_name: str
    total_points: int
    status: str
    vector_size: int
    distance_metric: str
    embedding_model: str
    subjects_breakdown: Dict[str, int]


class DeleteAllChunksResponse(BaseModel):
    """Response returned when resetting the vector database."""
    status: str
    collection_name: str
    total_points: int
    message: str


class IngestDiscoveredRequest(BaseModel):
    """Request payload for ingesting discovered repository textbooks."""
    filepaths: Optional[List[str]] = None
    filepath: Optional[str] = None
    subject: Optional[str] = None
    class_level: Optional[str] = None
    chunk_size: int = 800
    chunk_overlap: int = 150


# ─────────────────────────────────────────────────────────────
# Storage & Chunking Helpers
# ─────────────────────────────────────────────────────────────

def _get_manifest() -> List[Dict[str, Any]]:
    """Load persistent textbook manifest from disk."""
    if not os.path.exists(MANIFEST_FILE):
        return []
    try:
        with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read textbook manifest: {e}")
        return []


def _save_manifest(items: List[Dict[str, Any]]) -> None:
    """Save persistent textbook manifest to disk."""
    os.makedirs(os.path.dirname(MANIFEST_FILE), exist_ok=True)
    try:
        with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save textbook manifest: {e}")


def _chunk_page_text(
    text: str,
    page_num: int,
    chunk_size: int = 800,
    overlap: int = 150
) -> List[Dict[str, Any]]:
    """Split page text into overlapping units with sentence/paragraph boundary preservation."""
    text = text.strip()
    if not text:
        return []

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    cleaned_text = " ".join(lines)

    if len(cleaned_text) <= chunk_size:
        return [{
            "text": cleaned_text,
            "page_number": page_num,
            "char_count": len(cleaned_text),
            "word_count": len(cleaned_text.split())
        }]

    chunks: List[Dict[str, Any]] = []
    start = 0
    text_len = len(cleaned_text)
    min_step = max(chunk_size - overlap, 100)

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = cleaned_text[start:end]

        if end < text_len:
            last_punct = max(chunk.rfind(". "), chunk.rfind("? "), chunk.rfind("! "), chunk.rfind("; "))
            if last_punct > chunk_size // 2:
                end = start + last_punct + 1
            else:
                last_space = chunk.rfind(" ")
                if last_space > chunk_size // 2:
                    end = start + last_space

        chunk_clean = cleaned_text[start:end].strip()
        if len(chunk_clean) > 40:
            chunks.append({
                "text": chunk_clean,
                "page_number": page_num,
                "char_count": len(chunk_clean),
                "word_count": len(chunk_clean.split())
            })

        next_start = end - overlap
        if next_start <= start:
            next_start = start + min_step
        start = next_start

    return chunks


# ─────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/stats", response_model=VectorDBStatsResponse)
async def get_textbook_vector_stats() -> VectorDBStatsResponse:
    """Return real-time Qdrant vector database statistics and subject distribution."""
    rag_svc = get_rag_service()
    stats = rag_svc.get_vector_db_stats()
    return VectorDBStatsResponse(**stats)


@router.get("", response_model=List[TextbookItem])
async def list_ingested_textbooks() -> List[TextbookItem]:
    """List all indexed textbooks recorded in the manifest."""
    manifest = _get_manifest()
    return [TextbookItem(**item) for item in manifest]


@router.get("/{textbook_id}/chunks", response_model=TextbookChunkResponse)
async def inspect_textbook_chunks(
    textbook_id: str,
    limit: int = Query(100, ge=1, le=500, description="Max chunks to retrieve")
) -> TextbookChunkResponse:
    """Retrieve actual real chunks stored in Qdrant for a specific textbook ID."""
    manifest = _get_manifest()
    matched = next((t for t in manifest if t["id"] == textbook_id), None)
    title = matched["title"] if matched else "Textbook Chunks"

    rag_svc = get_rag_service()
    raw_chunks = rag_svc.get_chunks_for_textbook(textbook_id=textbook_id, limit=limit)

    chunk_items = [
        ChunkItem(
            id=c["id"],
            text=c["text"],
            chunk_index=c["chunk_index"],
            page_number=c["page_number"],
            chapter=c["chapter"],
            source=c["source"],
            subject=c["subject"],
            class_level=c["class_level"],
            char_count=c["char_count"],
            word_count=c["word_count"]
        )
        for c in raw_chunks
    ]

    return TextbookChunkResponse(
        textbook_id=textbook_id,
        title=title,
        total_chunks=len(chunk_items),
        chunks=chunk_items
    )


@router.delete("/chunks/all", response_model=DeleteAllChunksResponse)
async def delete_all_vector_chunks() -> DeleteAllChunksResponse:
    """Delete all chunks from Qdrant vector database and clear manifest."""
    rag_svc = get_rag_service()
    res = rag_svc.delete_all_chunks()
    _save_manifest([])
    logger.info("Cleared all textbook chunks from Qdrant and emptied manifest.")
    return DeleteAllChunksResponse(**res)


@router.delete("/{textbook_id}")
async def delete_textbook(textbook_id: str) -> Dict[str, Any]:
    """Delete all vector points and metadata associated with a textbook."""
    rag_svc = get_rag_service()
    deleted_from_qdrant = rag_svc.delete_chunks_by_textbook_id(textbook_id)

    manifest = _get_manifest()
    updated_manifest = [t for t in manifest if t["id"] != textbook_id]
    _save_manifest(updated_manifest)

    logger.info(f"Deleted textbook {textbook_id} (Qdrant vectors deleted: {deleted_from_qdrant})")
    return {
        "textbook_id": textbook_id,
        "status": "DELETED",
        "remaining_textbooks": len(updated_manifest)
    }


@router.post("/chunk-and-ingest")
async def upload_and_chunk_textbook(
    file: UploadFile = File(..., description="Uploaded Textbook PDF file"),
    title: Optional[str] = Form(None, description="Textbook title or Chapter name"),
    subject: str = Form("science", description="Academic subject"),
    class_level: str = Form("Class 10", description="Academic class level"),
    chapter: Optional[str] = Form("", description="Specific Chapter name"),
    chunk_size: int = Form(800, description="Target character size per chunk"),
    chunk_overlap: int = Form(150, description="Character overlap between chunks")
) -> Dict[str, Any]:
    """Upload a real textbook PDF, extract actual text page-by-page, chunk, embed, and index into Qdrant."""
    if not fitz:
        raise HTTPException(status_code=500, detail="PyMuPDF (fitz) is not installed in the environment.")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are supported for textbook vector chunking.")

    effective_title = (title or "").strip()
    if not effective_title:
        if chapter and chapter.strip():
            effective_title = chapter.strip()
        elif file.filename:
            clean_fname = os.path.splitext(os.path.basename(file.filename))[0]
            effective_title = clean_fname.replace("_", " ").replace("-", " ")
        else:
            effective_title = "Textbook"

    norm_subj = normalize_subject(subject)
    norm_lvl = normalize_class_level(class_level)

    # Save uploaded file
    target_dir = os.path.join(settings.DATA_DIR, "textbooks", norm_subj)
    os.makedirs(target_dir, exist_ok=True)
    textbook_id = str(uuid.uuid4())
    saved_filename = f"{textbook_id}_{os.path.basename(file.filename)}"
    saved_path = os.path.join(target_dir, saved_filename)

    content = await file.read()
    with open(saved_path, "wb") as f:
        f.write(content)

    file_size = len(content)

    # Extract pages and chunk with PyMuPDF
    logger.info(f"Extracting real text from {file.filename} ({file_size / 1024:.1f} KB)...")
    try:
        doc = fitz.open(saved_path)
        total_pages = len(doc)
        all_raw_chunks: List[Dict[str, Any]] = []

        for page_idx in range(total_pages):
            page_text = doc[page_idx].get_text()
            page_num = page_idx + 1
            page_chunks = _chunk_page_text(page_text, page_num=page_num, chunk_size=chunk_size, overlap=chunk_overlap)
            all_raw_chunks.extend(page_chunks)

        doc.close()
    except Exception as e:
        logger.error(f"Failed to read PDF {file.filename}: {e}")
        raise HTTPException(status_code=422, detail=f"Could not parse PDF pages: {str(e)}")

    if not all_raw_chunks:
        raise HTTPException(
            status_code=422,
            detail="No extractable text found in this PDF. Please ensure the PDF contains searchable text rather than scanned images."
        )

    logger.info(f"Extracted {len(all_raw_chunks)} real chunks across {total_pages} pages from {file.filename}")

    # Generate Embeddings & Upsert to Qdrant
    rag_svc = get_rag_service()
    texts_to_embed = [c["text"] for c in all_raw_chunks]
    
    # Batch embedding
    embeddings = rag_svc.embedding_model.encode(texts_to_embed, show_progress_bar=False).tolist()

    ch_name = chapter.strip() if chapter else effective_title
    points: List[PointStruct] = []

    for idx, (chunk_data, emb) in enumerate(zip(all_raw_chunks, embeddings)):
        # Deterministic UUID based on textbook_id and chunk index for idempotency
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{textbook_id}_{idx}_{hashlib.md5(chunk_data['text'].encode()).hexdigest()[:8]}"))
        points.append(PointStruct(
            id=point_id,
            vector=emb,
            payload={
                "text": chunk_data["text"],
                "subject": norm_subj,
                "class_level": norm_lvl,
                "chapter": ch_name,
                "source": file.filename,
                "textbook_id": textbook_id,
                "page_number": chunk_data["page_number"],
                "chunk_index": idx,
                "char_count": chunk_data["char_count"],
                "word_count": chunk_data["word_count"]
            }
        ))

    total_upserted = rag_svc.upsert_textbook_points(points)
    logger.info(f"✅ Upserted {total_upserted} real chunks into Qdrant for '{effective_title}' (subject: {norm_subj}, class: {norm_lvl})")

    # Update Manifest
    manifest = _get_manifest()
    new_entry = {
        "id": textbook_id,
        "title": effective_title,
        "filename": file.filename,
        "subject": norm_subj,
        "class_level": norm_lvl,
        "chapter": ch_name,
        "total_pages": total_pages,
        "chunk_count": total_upserted,
        "file_size_bytes": file_size,
        "ingested_at": datetime.utcnow().isoformat()
    }
    # Prepend new entry
    manifest.insert(0, new_entry)
    _save_manifest(manifest)

    # Return sample preview chunks for frontend inspection
    sample_preview = [
        {
            "id": p.id,
            "page_number": p.payload["page_number"],
            "chunk_index": p.payload["chunk_index"],
            "char_count": p.payload["char_count"],
            "word_count": p.payload["word_count"],
            "text": p.payload["text"][:240] + ("..." if len(p.payload["text"]) > 240 else "")
        }
        for p in points[:10]
    ]

    return {
        "status": "SUCCESS",
        "textbook_id": textbook_id,
        "title": effective_title,
        "subject": subject.lower(),
        "class_level": class_level.lower(),
        "chapter": ch_name,
        "total_pages": total_pages,
        "total_chunks": total_upserted,
        "sample_chunks": sample_preview
    }


@router.get("/discovered", response_model=List[DiscoveredTextbookItem])
async def get_discovered_textbooks() -> List[DiscoveredTextbookItem]:
    """Scan disk for real PDF textbooks and marking schemes in repository assets."""
    manifest = _get_manifest()
    ingested_filenames = {t["filename"].lower() for t in manifest}

    base_dir = "/Users/ujwalsingamsetti/project-k12"
    search_dirs = [
        (os.path.join(base_dir, "test_assets/marking_schemes"), "science", "Class 10", "CBSE Official Marking Scheme Reference"),
        (os.path.join(base_dir, "k12-answer-evaluator/backend/data/uploads/textbooks/12/physics"), "physics", "Class 12", "NCERT Class 12 Physics Chapter"),
        (os.path.join(base_dir, "k12-answer-evaluator/backend/data/textbooks/mathematics"), "mathematics", "Class 12", "NCERT Class 12 Mathematics Chapter"),
        (os.path.join(base_dir, "k12-answer-evaluator/backend/data/uploads/textbooks/8/english"), "english", "Class 8", "NCERT Class 8 English Chapter"),
    ]

    discovered: List[DiscoveredTextbookItem] = []

    for dir_path, def_subj, def_lvl, def_title in search_dirs:
        if not os.path.exists(dir_path):
            continue

        for fname in sorted(os.listdir(dir_path)):
            if not fname.endswith(".pdf"):
                continue

            fpath = os.path.join(dir_path, fname)
            fsize_kb = round(os.path.getsize(fpath) / 1024, 1)

            # Heuristics
            subj = def_subj
            lvl = def_lvl
            if "physics" in fname.lower():
                subj = "physics"
            elif "chem" in fname.lower():
                subj = "chemistry"
            elif "math" in fname.lower():
                subj = "mathematics"
            elif "computerscience" in fname.lower() or "computer" in fname.lower() or "_cs" in fname.lower() or "cs_" in fname.lower():
                subj = "computer science"
            elif "science" in fname.lower():
                subj = "science"
            elif "english" in fname.lower():
                subj = "english"

            if "10" in fname:
                lvl = "Class 10"
            elif "12" in fname:
                lvl = "Class 12"
            elif "8" in fname:
                lvl = "Class 8"

            # Page count
            page_count = 1
            if fitz:
                try:
                    d = fitz.open(fpath)
                    page_count = len(d)
                    d.close()
                except Exception:
                    pass

            doc_id = hashlib.md5(fpath.encode()).hexdigest()[:12]
            is_ing = fname.lower() in ingested_filenames

            discovered.append(
                DiscoveredTextbookItem(
                    id=doc_id,
                    filename=fname,
                    filepath=fpath,
                    subject=subj,
                    class_level=lvl,
                    title=f"{def_title} ({fname})",
                    total_pages=page_count,
                    file_size_kb=fsize_kb,
                    is_ingested=is_ing
                )
            )

    return discovered


@router.post("/ingest-discovered")
async def ingest_discovered_textbooks(
    payload: Optional[IngestDiscoveredRequest] = None
) -> Dict[str, Any]:
    """Ingest selected or all discovered repository textbook PDFs directly into Qdrant."""
    discovered = await get_discovered_textbooks()
    target_items = discovered
    
    req_filepaths = payload.filepaths if payload else None
    if payload and payload.filepath:
        req_filepaths = [payload.filepath]
    
    chunk_size = payload.chunk_size if payload else 800
    chunk_overlap = payload.chunk_overlap if payload else 150

    if req_filepaths:
        target_set = set(req_filepaths)
        target_items = [d for d in discovered if d.filepath in target_set]

    if not target_items:
        return {"status": "NO_FILES", "message": "No matching discovered textbooks to ingest."}

    rag_svc = get_rag_service()
    manifest = _get_manifest()
    total_chunks_added = 0
    ingested_records: List[Dict[str, Any]] = []

    for item in target_items:
        try:
            doc = fitz.open(item.filepath)
            total_pages = len(doc)
            raw_chunks: List[Dict[str, Any]] = []
            for page_idx in range(total_pages):
                p_text = doc[page_idx].get_text()
                p_num = page_idx + 1
                c_list = _chunk_page_text(p_text, page_num=p_num, chunk_size=chunk_size, overlap=chunk_overlap)
                raw_chunks.extend(c_list)
            doc.close()

            if not raw_chunks:
                continue

            texts = [c["text"] for c in raw_chunks]
            embeddings = rag_svc.embedding_model.encode(texts, show_progress_bar=False).tolist()

            tb_id = str(uuid.uuid4())
            points: List[PointStruct] = []
            for idx, (cd, emb) in enumerate(zip(raw_chunks, embeddings)):
                pid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{tb_id}_{idx}_{hashlib.md5(cd['text'].encode()).hexdigest()[:8]}"))
                points.append(PointStruct(
                    id=pid,
                    vector=emb,
                    payload={
                        "text": cd["text"],
                        "subject": item.subject.lower(),
                        "class_level": item.class_level.lower(),
                        "chapter": item.title,
                        "source": item.filename,
                        "textbook_id": tb_id,
                        "page_number": cd["page_number"],
                        "chunk_index": idx,
                        "char_count": cd["char_count"],
                        "word_count": cd["word_count"]
                    }
                ))

            upserted = rag_svc.upsert_textbook_points(points)
            total_chunks_added += upserted

            entry = {
                "id": tb_id,
                "title": item.title,
                "filename": item.filename,
                "subject": item.subject.lower(),
                "class_level": item.class_level.lower(),
                "chapter": item.title,
                "total_pages": total_pages,
                "chunk_count": upserted,
                "file_size_bytes": int(item.file_size_kb * 1024),
                "ingested_at": datetime.utcnow().isoformat()
            }
            manifest.insert(0, entry)
            ingested_records.append(entry)
            logger.info(f"Ingested discovered textbook '{item.filename}': {upserted} chunks")
        except Exception as err:
            logger.error(f"Failed to ingest discovered textbook {item.filename}: {err}")

    _save_manifest(manifest)
    return {
        "status": "SUCCESS",
        "total_textbooks_ingested": len(ingested_records),
        "total_chunks_added": total_chunks_added,
        "textbooks": ingested_records
    }
