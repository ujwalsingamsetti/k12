"""Direct Evaluation Endpoint Tests.

Validates:
- GET /api/evaluation/presets returns 5 verified official presets
- POST /api/evaluation/evaluate evaluates typed text directly
- POST /api/evaluation/override applies examiner adjustments
"""

import pytest
import requests
from loguru import logger

BASE_URL = "http://localhost:8000"


class TestDirectEvaluationEndpoints:
    """Test suite for direct multimodal evaluation and preset endpoints."""

    def test_get_presets_returns_official_presets(self) -> None:
        """Verify that GET /api/evaluation/presets returns 5 official CBSE presets."""
        url = f"{BASE_URL}/api/evaluation/presets"
        response = requests.get(url, timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of presets"
        assert len(data) >= 5, f"Expected at least 5 presets, got {len(data)}"
        
        # Verify first preset has all required fields
        first = data[0]
        assert "id" in first
        assert "title" in first
        assert "question_text" in first
        assert "marking_scheme" in first
        assert "max_score" in first
        logger.info(f"Verified presets endpoint returned {len(data)} items successfully")

    def test_direct_evaluate_typed_answer(self) -> None:
        """Verify direct AI evaluation of a typed student answer via DeepSeek."""
        url = f"{BASE_URL}/api/evaluation/evaluate"
        payload = {
            "question_text": "A shiny brown coloured element 'X' on heating in air becomes black in colour. Name element 'X' and the compound formed.",
            "marking_scheme": "Element X is Copper (Cu) [1 Mark]. Compound is Copper Oxide (CuO) [1 Mark].",
            "subject": "science",
            "academic_level": "Class 10",
            "max_score": "2.0",
            "student_answer_text": "Element X is Copper (Cu). On heating with oxygen it forms black Copper(II) oxide (CuO)."
        }
        response = requests.post(url, data=payload, timeout=40)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "score" in data
        assert "max_score" in data
        assert data["max_score"] == 2.0
        assert data["score"] >= 1.5, f"Expected near-full score for perfect answer, got {data['score']}"
        assert data["status"] in ["EXEMPLARY", "PASS"]
        assert "breakdown" in data
        assert data["provider"] in ["deepseek", "gemini"]
        logger.info(f"Verified direct evaluation returned score {data['score']}/{data['max_score']} with provider {data['provider']}")

    def test_score_override(self) -> None:
        """Verify examiner score adjustment on an evaluated submission."""
        url = f"{BASE_URL}/api/evaluation/override"
        payload = {
            "evaluation_id": "test-eval-123",
            "adjusted_score": 1.5,
            "max_score": 2.0,
            "examiner_notes": "Granted partial credit for identification."
        }
        response = requests.post(url, json=payload, timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["adjusted_score"] == 1.5
        assert data["percentage"] == 75.0
        assert data["status"] == "PASS"
        assert "examiner_notes" in data
        logger.info("Verified examiner score override applied successfully")
