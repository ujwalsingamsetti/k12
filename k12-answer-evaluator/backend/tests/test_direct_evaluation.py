"""Direct Evaluation Endpoint Tests.

Validates:
- GET /api/evaluation/presets returns official multi-question presets
- POST /api/evaluation/extract-question-paper extracts questions from exam PDF
- POST /api/evaluation/evaluate evaluates multi-question exam with RAG trace
- POST /api/evaluation/override applies per-question examiner adjustments
"""

import os
import json
import pytest
import requests
from loguru import logger

BASE_URL = "http://localhost:8000"


class TestDirectEvaluationEndpoints:
    """Test suite for direct multimodal evaluation and preset endpoints."""

    def test_get_presets_returns_official_presets(self) -> None:
        """Verify that GET /api/evaluation/presets returns 5 official CBSE presets with multi-question lists."""
        url = f"{BASE_URL}/api/evaluation/presets"
        response = requests.get(url, timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of presets"
        assert len(data) >= 5, f"Expected at least 5 presets, got {len(data)}"
        
        first = data[0]
        assert "id" in first
        assert "title" in first
        assert "questions" in first
        assert len(first["questions"]) >= 3, f"Expected multi-question preset, got {len(first['questions'])}"
        logger.info(f"Verified presets endpoint returned {len(data)} items with multi-question structures")

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
        logger.info(f"Verified direct evaluation returned score {data['score']}/{data['max_score']}")

    def test_multi_question_evaluation_with_rag_trace(self) -> None:
        """Verify batch multi-question evaluation with AnswerParser and Qdrant RAG trace."""
        url = f"{BASE_URL}/api/evaluation/evaluate"
        questions = [
            {
                "question_number": 1,
                "question_text": "Name element X that turns black on heating in air and give the balanced equation.",
                "marking_scheme": "Element X is Copper (Cu), black compound is CuO. Equation: 2Cu + O2 -> 2CuO.",
                "max_score": 2.0
            },
            {
                "question_number": 2,
                "question_text": "What is a neutralisation reaction? Give the balanced equation for NaOH and HCl.",
                "marking_scheme": "Reaction of acid and base to form salt and water. NaOH + HCl -> NaCl + H2O.",
                "max_score": 2.0
            }
        ]
        student_script = (
            "Q1. Element X is Copper (Cu). When heated in air it forms black Copper Oxide (CuO).\n"
            "Equation: 2Cu + O2 -> 2CuO\n\n"
            "Ans 2. Neutralisation reaction is when an acid reacts with a base to produce salt and water.\n"
            "Equation: NaOH + HCl -> NaCl + H2O"
        )
        payload = {
            "questions_json": json.dumps(questions),
            "subject": "science",
            "academic_level": "Class 10",
            "student_answer_text": student_script
        }
        response = requests.post(url, data=payload, timeout=40)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["total_questions"] == 2
        assert "total_score" in data
        assert data["total_max_score"] == 4.0
        assert len(data["questions"]) == 2
        
        q1 = data["questions"][0]
        assert q1["question_number"] == 1
        assert "rag_trace" in q1
        assert q1["rag_trace"]["qdrant_collection"] == "k12_textbooks"
        assert q1["rag_trace"]["vector_dimension"] == 384
        logger.info(f"Verified multi-question evaluation: {data['total_score']}/{data['total_max_score']} with RAG trace")

    def test_extract_question_paper_endpoint(self) -> None:
        """Verify extraction of questions from uploaded Question Paper PDF."""
        pdf_path = "/Users/ujwalsingamsetti/project-k12/test_assets/question_papers/Class10_Science_SQP_2023-24.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test asset PDF not available")
        
        url = f"{BASE_URL}/api/evaluation/extract-question-paper"
        with open(pdf_path, "rb") as f:
            files = {"file": ("Class10_Science_SQP.pdf", f, "application/pdf")}
            data = {"subject": "science", "academic_level": "Class 10"}
            response = requests.post(url, files=files, data=data, timeout=60)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        assert "questions" in result
        assert len(result["questions"]) > 0, "Expected at least 1 extracted question"
        assert result["questions"][0]["question_number"] >= 1
        logger.info(f"Extracted {len(result['questions'])} questions from exam paper PDF successfully")

    def test_score_override(self) -> None:
        """Verify examiner score adjustment on an evaluated submission."""
        url = f"{BASE_URL}/api/evaluation/override"
        payload = {
            "evaluation_id": "test-eval-123",
            "question_number": 1,
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
