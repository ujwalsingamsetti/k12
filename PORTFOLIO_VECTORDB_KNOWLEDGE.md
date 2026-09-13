# PORTFOLIO KNOWLEDGE BASE: CONTEXT-AWARE AUTOMATED EXAM GRADING SYSTEM

> **Metadata for Vector DB Ingestion**
> - **Candidate / Engineer**: Ujwal Singamsetti
> - **Project Title**: Context-Aware Automated Grading of Written Exams Using Qdrant Vector Search and Large Language Model
> - **Domain**: Generative AI, RAG Systems, Natural Language Processing, Computer Vision / OCR, EdTech
> - **Target Role**: Generative AI Engineer / AI Software Engineer / LLM Application Developer
> - **Codebase Name**: `project-k12` / `k12-answer-evaluator`

---

## 1. PROJECT EXECUTIVE SUMMARY & CORE VALUE PROPOSITION

### Summary
The **Context-Aware Automated Exam Grading System** is an end-to-end AI-powered educational evaluation platform designed to automate the grading of handwritten student answer scripts with high accuracy, curriculum alignment, and transparent feedback across **any educational system**—including Higher Education / Universities (Engineering, Computer Science, Sciences, Management), School Boards (CBSE, ICSE, Cambridge IB/IGCSE, State Boards), and Competitive / Professional Certification examinations. The system combines **Google Cloud Vision OCR** for digitizing handwritten text and formulas, **Qdrant Vector Database** with `all-mpnet-base-v2` embeddings for Retrieval-Augmented Generation (RAG), and **Google Gemini 1.5 Flash** for grounded LLM scoring and point-by-point error diagnostics (*what is wrong, why it is wrong, and score impact*).

### Problem Solved
1. **Universal System Adaptability**: Operates seamlessly across any educational board, university degree, or competitive exam through dynamic evaluator personas and rubric scaling.
2. **Manual Correction Fatigue & Bias**: Replaces slow, subjective manual evaluation with deterministic, multi-criteria AI grading.
3. **LLM Hallucinations**: Eliminates out-of-syllabus grading penalties by grounding LLM evaluation directly in retrieved textbook chapters and scoring rubrics.
4. **Lack of Formative Feedback**: Moves beyond raw numerical scores by providing actionable diagnostic feedback for every evaluated question.

---

## 2. COMPREHENSIVE TECHNOLOGY STACK

### Generative AI & Large Language Models (LLMs)
* **LLM Engine**: Google Gemini 1.5 Flash (via `google-generativeai` SDK).
* **Prompt Engineering Strategy**: Context-Grounded System Prompts with strict JSON-only output constraints to guarantee zero prose and deterministic parsing.
* **Evaluation Framework**: Multi-attribute rubric evaluation (numerical score, error category, missing concepts, model answer comparison).

### Vector Database & RAG Infrastructure
* **Vector Database**: **Qdrant Vector Engine** (Self-hosted / Local & Cloud API).
* **Embedding Model**: `sentence-transformers` (`all-mpnet-base-v2`, 768-dimensional dense vectors).
* **Indexing Algorithm**: Hierarchical Navigable Small World (**HNSW**) vector indexing for sub-millisecond retrieval.
* **Payload Filtering**: Metadata filtering by `subject` and `class_level` to isolate relevant domain textbook chunks before search execution.

### Computer Vision & Optical Character Recognition (OCR)
* **OCR Service**: Google Cloud Vision API REST v1.
* **Capabilities**: Digitization of handwritten text, mathematical expression parsing, and spatial layout reconstruction via bounding-box coordinates `(x, y, w, h)`.

### Backend Software Engineering
* **Language & Runtime**: Python 3.11.
* **API Framework**: FastAPI with asynchronous handlers (`async/await`) and Uvicorn ASGI web server.
* **Database & ORM**: PostgreSQL, SQLAlchemy ORM, Alembic schema migrations.
* **Logging & Config**: Loguru structured logging, `pydantic-settings` for type-safe environment configuration.

### Frontend Application Layer
* **Framework**: React 18 / React 19, Vite build tool.
* **Styling**: Tailwind CSS (Modern dark mode, glassmorphism UI).
* **Portals**:
  - **Teacher Portal**: Create question papers, upload textbook reference PDFs, review AI evaluations, and execute final score overrides.
  - **Student Portal**: Upload answer sheet scans, track submission progress, analyze performance analytics charts, and download detailed PDF report cards.

---

## 3. CORE SYSTEM ARCHITECTURE & WORKFLOW PIPELINE

```
[1. Handwritten Script Image]
         │
         ▼
[2. Google Cloud Vision OCR] ──► Spatial Layout Reconstruction & Math Parsing
         │
         ▼
[3. sentence-transformers]  ──► 768-dim Embedding Generation (all-mpnet-base-v2)
         │
         ▼
[4. Qdrant Vector DB]       ──► HNSW Vector Search + Subject Payload Filter
         │
         ▼
[5. Hybrid Re-Ranker]       ──► Boost Semantic Score with Keyword Density Ratio
         │
         ▼
[6. Gemini 1.5 Flash LLM]   ──► Grounded Evaluation Prompt (Answer + Qdrant Context + Rubric)
         │
         ▼
[7. JSON Output Parser]     ──► Scores + Error Breakdown [What, Why, Impact] + Model Answer
         │
         ▼
[8. Dual Portals & DB]      ──► Teacher Verification/Override + Student PDF Report Card
```

---

## 4. KEY ALGORITHMIC INNOVATIONS

### 1. Hybrid Qdrant RAG + Keyword Re-ranking Formula
To prevent dense embedding retrieval from missing specific technical keywords in student answers, Ujwal implemented a hybrid re-ranking algorithm that boosts semantic vector similarity based on domain keyword match ratio:

$$ \text{Score}_{\text{boosted}} = \min\left( \text{Score}_{\text{semantic}} + \left( \frac{K_{\text{matched}}}{K_{\text{total}}} \right) \times 0.2, \; 1.0 \right) $$

Where:
* $\text{Score}_{\text{semantic}}$: Qdrant HNSW vector similarity score.
* $K_{\text{matched}}$: Number of domain keywords matched in the retrieved reference chunk.
* $K_{\text{total}}$: Total extracted technical keywords from the question paper rubric.
* $0.2$: Maximum keyword boost weight applied.

### 2. Point-by-Point Diagnostic Error Parsing
Unlike traditional automated essay scoring systems that output a single numeric grade, this system outputs a 3-part diagnostic breakdown for every student mistake:
* **What**: Concise statement of the exact error made.
* **Why**: Conceptual explanation of why the answer is mathematically or scientifically incorrect.
* **Impact**: Exact mark deduction penalty resulting from the error.

---

## 5. REPOSITORY STRUCTURE & FILE ORGANIZATION

```
project-k12/
├── README.md                           # Main repository documentation & setup guide
├── PRESENTATION.md                     # 15-slide academic presentation deck
├── PROJECT_REPORT_PHASE_1.docx         # Formatted university capstone report (Word)
├── PROJECT_REPORT_PHASE_1.md           # Full markdown report document
├── build_full_report.py                # Report build script with footer & page numbering rules
├── system_architecture.png             # Overall system architecture diagram
├── ocr_pipeline_flow.png               # OCR layout parsing workflow diagram
├── rag_retrieval_flow.png              # Qdrant RAG retrieval pipeline diagram
├── gemini_eval_flow.png                # Gemini 1.5 Flash evaluation engine diagram
├── frontend/                           # React 18 / Vite / Tailwind CSS Web App
│   ├── src/
│   │   ├── components/
│   │   │   ├── teacher/                # Create paper, analytics, submissions review
│   │   │   ├── student/                # Upload answer, dashboard, report card view
│   │   │   └── parent/                 # Parent access portal
│   │   └── services/api.js             # Axios API integration layer
└── k12-answer-evaluator/
    └── backend/                        # FastAPI Python 3.11 Backend Services
        ├── app/
        │   ├── api/                    # REST route handlers (students, teachers, phase3)
        │   ├── models/                 # SQLAlchemy DB models (submission, textbook, paper)
        │   ├── schemas/                # Pydantic schemas
        │   └── services/               # Core evaluation & OCR business logic
        │       ├── ocr_service.py      # Google Cloud Vision OCR integration
        │       ├── rag_service.py      # Qdrant RAG search & keyword re-ranking
        │       ├── evaluation_service.py # Gemini 1.5 Flash prompt & scoring engine
        │       └── vector_db.py        # Qdrant client connection & collection management
        ├── init_qdrant.py              # Qdrant collection initialization script
        └── requirements.txt            # Python dependencies
```

---

## 6. SAMPLE VECTOR DB QUESTION-ANSWER PAIRS (For Candidate RAG Interview Search)

### Q1: What is Ujwal's project about?
**Answer**: Ujwal built a Context-Aware Automated Grading System for written exams. It uses Google Cloud Vision OCR to parse handwritten answer scripts, Qdrant Vector Database for Retrieval-Augmented Generation (RAG) against textbook content, and Google Gemini 1.5 Flash to generate accurate scores and detailed error diagnostic feedback (*what, why, impact*).

### Q2: Which technologies were used in the backend of this project?
**Answer**: The backend is built with Python 3.11, FastAPI, Uvicorn, PostgreSQL (SQLAlchemy ORM, Alembic migrations), Qdrant Vector Database, `sentence-transformers` (`all-mpnet-base-v2` for 768-dim embeddings), Google Cloud Vision API for OCR, and Google Gemini 1.5 Flash API for LLM evaluation.

### Q3: How does the system prevent AI hallucinations during grading?
**Answer**: The system uses a RAG pipeline anchored in Qdrant Vector DB. Before evaluating student responses, it retrieves relevant textbook chapters and scoring keys filtered by `subject` and `class_level`. The retrieved context is injected into Gemini 1.5 Flash with strict system prompt constraints that enforce deterministic JSON outputs.

### Q4: Why was Qdrant chosen as the vector database?
**Answer**: Qdrant was selected for its high-throughput HNSW vector indexing, fast sub-millisecond similarity search, support for 768-dimensional dense embeddings (`all-mpnet-base-v2`), and native payload metadata filtering (`subject`, `class_level`) which filters reference passages before search execution.

### Q5: What makes Ujwal's grading system unique compared to standard LLM grading?
**Answer**: 
1. It handles handwritten text and mathematical formulas via Google Cloud Vision OCR.
2. It uses a custom hybrid re-ranking algorithm combining Qdrant dense vector similarity with keyword match density.
3. It provides a granular 3-part error diagnostic breakdown (*what, why, impact*) rather than just a single numeric score.
4. It includes a Teacher Override Portal so educators maintain final authority over AI-assigned marks.

---

## 7. KEY ENGINEERING METRICS & PERFORMANCE

* **Vector Retrieval Latency**: < 15ms per search query in Qdrant HNSW index.
* **OCR Character Accuracy**: ~94.2% on standard handwritten exam script samples.
* **LLM API Cost**: < $0.001 per evaluated script sheet using Gemini 1.5 Flash.
* **Embedding Size**: 768 dimensions (`sentence-transformers/all-mpnet-base-v2`).
* **Plagiarism / Originality**: < 10% similarity score across project documentation and code.
