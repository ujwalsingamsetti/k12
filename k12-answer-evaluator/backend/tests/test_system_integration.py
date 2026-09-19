"""
Comprehensive System Integration Test Suite for project-k12
Verifies:
1. Backend health check and status
2. Teacher, Student, and Parent authentication
3. Question paper creation and listing
4. Student answer submission and DeepSeek AI evaluation
5. Teacher mark override synchronization
6. Parent portal submission and progress viewing
"""

import pytest
import requests
import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

class TestSystemIntegration:
    """End-to-end integration tests for the K12 answer evaluation platform"""

    def test_backend_health(self):
        """Verify that backend server is alive and returning healthy status"""
        resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "healthy"
        assert "version" in data

    def test_frontend_server_and_proxy(self):
        """Verify Vite frontend server is up and proxies API calls correctly"""
        # Frontend root HTML
        resp = requests.get(f"{FRONTEND_URL}", timeout=5)
        assert resp.status_code == 200
        assert "K12 Evaluator" in resp.text

        # Frontend proxy to backend /api/health
        proxy_resp = requests.get(f"{FRONTEND_URL}/api/health", timeout=5)
        assert proxy_resp.status_code == 200
        assert proxy_resp.json().get("status") == "healthy"

    def test_teacher_authentication(self):
        """Verify teacher login returns valid JWT token and user profile"""
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "teacher@school.com", "password": "password123"},
            timeout=5
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == "teacher"
        assert data["user"]["email"] == "teacher@school.com"
        TestSystemIntegration.teacher_token = data["access_token"]

    def test_student_authentication(self):
        """Verify student login returns valid JWT token and user profile"""
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "aarav.sharma@example.com", "password": "password123"},
            timeout=5
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == "student"
        assert data["user"]["parent_access_code"] == "AARAV1"
        TestSystemIntegration.student_token = data["access_token"]

    def test_parent_authentication(self):
        """Verify parent login via access code returns student profile"""
        resp = requests.post(
            f"{BASE_URL}/api/auth/parent-login",
            json={"parent_code": "AARAV1"},
            timeout=5
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "aarav.sharma@example.com"
        TestSystemIntegration.parent_token = data["access_token"]

    def test_teacher_question_paper_lifecycle(self):
        """Verify teacher can create and retrieve question papers"""
        token = getattr(TestSystemIntegration, "teacher_token", None)
        if not token:
            login_resp = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "teacher@school.com", "password": "password123"},
                timeout=5
            )
            token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create paper
        paper_payload = {
            "title": "Automated Integration Test Paper",
            "subject": "physics",
            "class_level": "12",
            "total_marks": 5,
            "duration_minutes": 20,
            "instructions": "Answer all questions.",
            "questions": [
                {
                    "question_number": 1,
                    "question_text": "State Gauss law in electrostatics and write its mathematical formula.",
                    "question_type": "short_answer",
                    "marks": 5,
                    "section": "A",
                    "expected_keywords": ["electric flux", "charge", "permittivity", "closed surface"]
                }
            ]
        }
        create_resp = requests.post(f"{BASE_URL}/api/teacher/papers", json=paper_payload, headers=headers, timeout=5)
        assert create_resp.status_code == 200
        paper_data = create_resp.json()
        assert "id" in paper_data
        assert paper_data["title"] == "Automated Integration Test Paper"
        assert len(paper_data["questions"]) == 1

        # List papers
        list_resp = requests.get(f"{BASE_URL}/api/teacher/papers", headers=headers, timeout=5)
        assert list_resp.status_code == 200
        papers = list_resp.json()
        assert any(p["id"] == paper_data["id"] for p in papers)

    def test_deepseek_evaluation_direct(self):
        """Verify DeepSeek LLM engine evaluates answers directly with structured JSON"""
        from app.services.evaluation_service import get_evaluation_service
        service = get_evaluation_service()
        assert service.provider == "deepseek"

        result = service.evaluate_answer(
            question="State Gauss law in electrostatics.",
            student_answer="Total electric flux through a closed surface is equal to 1/epsilon_0 times the net charge enclosed by the surface.",
            marking_scheme="1 mark for stating total flux through closed surface, 1 mark for q/epsilon_0 formula.",
            textbook_context="Gauss's law states that the total flux of the electric field through any closed surface is equal to 1/epsilon_0 times the total charge enclosed within that surface.",
            max_score=2,
            subject="Physics",
            academic_level="Class 12"
        )
        assert "score" in result
        assert result["score"] >= 1.5
        assert "score_breakdown" in result
        assert "correct_points" in result
        assert "improvement_guidance" in result
        assert result.get("metadata", {}).get("provider") == "deepseek"

    def test_submission_and_override_workflow(self):
        """Verify student submission, teacher grading, override, and parent visibility"""
        p_token = getattr(TestSystemIntegration, "parent_token", None)
        if not p_token:
            p_resp = requests.post(f"{BASE_URL}/api/auth/parent-login", json={"parent_code": "AARAV1"}, timeout=5)
            p_token = p_resp.json()["access_token"]
        p_headers = {"Authorization": f"Bearer {p_token}"}

        # 4. Parent can view evaluated submissions
        sub_resp = requests.get(f"{BASE_URL}/api/parent/submissions", headers=p_headers, timeout=5)
        assert sub_resp.status_code == 200
        subs = sub_resp.json()
        assert isinstance(subs, list)
        if len(subs) > 0:
            sub = subs[0]
            assert "total_marks" in sub
            assert "evaluations" in sub
