# Context-Aware Automated Exam Grading System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

## Overview
The **Context-Aware Automated Exam Grading System** is an advanced educational evaluation platform designed to automate the grading of handwritten student answer sheets across **any educational system**—including Higher Education / Universities (Engineering, Sciences, Humanities), School Boards (CBSE, ICSE, Cambridge, State Boards), and Competitive / Professional Certification examinations.

It leverages Google Cloud Vision for OCR and layout parsing, Qdrant Vector Search for textbook-grounded Retrieval-Augmented Generation (RAG), and Gemini AI for multi-criteria grading against answer keys and course curricula with zero hallucinations.

It provides three specialized portals:
- **Teacher / Examiner Portal:** Central hub to extract, create, and assign question papers across any subject or academic level. Gives educators full authority to review and override AI evaluations.
- **Student Portal:** A unified, glassmorphism-themed UI where students upload handwritten answers, monitor tracking indicators, analyze performance trends, and download detailed PDF report cards.
- **Parent Portal:** Dedicated transparency portal for monitoring academic progress.

## Universal System Capabilities
*   **Universal Compatibility:** Dynamically adapts evaluation personas, rubrics, and criteria for Universities (Undergraduate/Postgraduate), School Boards, and Competitive Exams.
*   **What is wrong & Why it is wrong:** The AI parses `errors` into granular `[what, why, impact]` breakdowns.
*   **Missing Concepts & Improvement:** Outputs `missing_concepts` and `improvement_guidance` to tell students exactly how to improve.
*   **Correct Expected Answer:** Outputs `correct_answer_should_include` compared against the student's submission.
*   **Working Flow:** End-to-end integration (Upload -> OCR -> Vector DB RAG -> Gemini LLM Evaluation -> Score/Feedback Generation -> Student Dashboard).

## Quick Install & Usage
### Prerequisites
- Python 3.10+
- PostgreSQL
- Node.js & NPM
- Google Cloud Vision Credentials (`JSON` format)
- Gemini API Key (`GOOGLE_API_KEY`)

### Backend Setup
```bash
git clone https://github.com/your-org/project-k12.git
cd project-k12/k12-answer-evaluator/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Set .env vars, then run database migrations
alembic upgrade head
# Start server
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd project-k12/frontend
npm install
npm run dev
```

For more in-depth system architecture, workflows, and API details, please see the [**DOCUMENTATION.md**](./DOCUMENTATION.md) file. For testing and release notes, visit [**TEST_PLAN.md**](./TEST_PLAN.md) and [**CHANGELOG.md**](./CHANGELOG.md).
