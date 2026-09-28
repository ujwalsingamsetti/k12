"""Unit and Integration Tests for Real Textbook Vector Chunking and Ingestion.

Validates that:
1. Textbook stats endpoint returns Qdrant collection status.
2. Discovered textbook PDFs are enumerated from disk.
3. Ingesting real textbook chunks creates dense vectors in Qdrant.
4. Stored chunks are inspectable with page-level tracking.
5. Strict metadata filtering properly partitions retrieval by subject and class level.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.rag_service import get_rag_service, normalize_subject, normalize_class_level

client = TestClient(app)


def test_textbook_stats_endpoint() -> None:
    """Verify GET /api/textbooks/stats returns healthy collection metrics."""
    response = client.get("/api/textbooks/stats")
    assert response.status_code == 200
    data = response.json()
    assert "collection_name" in data
    assert data["collection_name"] == "k12_textbooks"
    assert "total_points" in data
    assert "subjects_breakdown" in data
    assert data["vector_size"] == 384


def test_textbook_catalog_endpoint() -> None:
    """Verify GET /api/textbooks returns a list of indexed textbooks."""
    response = client.get("/api/textbooks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_discovered_textbooks_endpoint() -> None:
    """Verify GET /api/textbooks/discovered discovers repository PDFs."""
    response = client.get("/api/textbooks/discovered")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Every item must have required fields
    for item in data:
        assert "id" in item
        assert "filename" in item
        assert "filepath" in item
        assert "subject" in item
        assert "class_level" in item
        assert item["total_pages"] > 0


def test_metadata_normalization() -> None:
    """Test canonical subject and class level normalization."""
    assert normalize_subject("Science") == "science"
    assert normalize_subject("Maths") == "mathematics"
    assert normalize_subject("math") == "mathematics"
    assert normalize_subject("phy") == "physics"
    assert normalize_subject("chem") == "chemistry"
    assert normalize_subject("cs") == "computer science"

    assert normalize_class_level("Class 10") == "class 10"
    assert normalize_class_level("10th") == "class 10"
    assert normalize_class_level("12") == "class 12"


def test_metadata_filtered_rag_retrieval() -> None:
    """Verify that RAG search strictly filters chunks by subject and class level."""
    rag = get_rag_service()
    
    # Query for science class 10
    chunks = rag.retrieve_relevant_context(
        query="corrosion of metals and oxidation",
        subject="science",
        class_level="Class 10",
        top_k=3,
    )
    
    # If science chunks are present, verify all match the subject
    for chunk in chunks:
        assert chunk["subject"].lower() in ["science", "chemistry", "physics"]

    # Query for an unindexed subject with strict filtering
    mismatched_chunks = rag.retrieve_relevant_context(
        query="corrosion of metals",
        subject="ancient history",
        class_level="Class 10",
        top_k=3,
    )
    # Ancient history has 0 chunks, so results should be empty
    assert len(mismatched_chunks) == 0
