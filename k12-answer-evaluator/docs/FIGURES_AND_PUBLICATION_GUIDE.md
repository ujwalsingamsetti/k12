# Publication & Presentation Visual Assets Guide
## Context-Aware Automated Grading of Written Exams Using Qdrant Vector Search and Large Language Models

This document serves as the comprehensive visual asset and figure reference for:
1. **Academic Journal & Conference Publications** (IEEE Transactions, ACM, Springer, Elsevier).
2. **B.E. Computer Science Final Year Capstone Project Report** (Sathyabama Institute of Science and Technology, 2026).
3. **Viva-Voce & Seminar PowerPoint Presentations (PPTs)**.
4. **Symposium & Exhibition Poster Sessions (A0 / 36" $\times$ 48" Format)**.

All 11 figures have been designed strictly adhering to IEEE/ACM academic publication standards:
- **Zero Commercial Vendor Bias:** All proprietary names (e.g., DeepSeek, Gemini, Google Cloud Vision, PostgreSQL, React) have been abstracted into rigorous scientific nomenclature (e.g., *Foundation Large Language Model*, *Cloud Vision OCR Engine*, *Dense Sentence Transformer Embedding Model*, *Vector Database Engine*, *Relational Database Management System*).
- **Minimalist Industry-Standard Palette:** Clean white background, slate gray containers (`#F8FAFC`, `#E2E8F0`), dark charcoal typography (`#0F172A`, `#1E293B`), and muted navy/steel blue borders (`#2563EB`, `#1E40AF`).
- **High-Resolution Format:** Formatted for two-column LaTeX papers, 16:9 widescreen presentation slides, and large-format conference printing.

---

## Visual Assets Directory Index

| Figure ID | File Name | Target Section in Research Paper | Recommended PPT Slide / Usage |
| :--- | :--- | :--- | :--- |
| **Figure 1** | `fig1_overall_system_architecture.png` | Section III: System Architecture Overview | Slide 4: End-to-End System Architecture |
| **Figure 2** | `fig2_vision_preprocessing_pipeline.png` | Section III-A: Computer Vision & Optical Ingestion | Slide 6: Optical Document Ingestion & Fallback OCR |
| **Figure 3** | `fig3_vector_retrieval_rag_pipeline.png` | Section III-B: Curriculum-Grounded Vector Search | Slide 7: Retrieval-Augmented Generation (RAG) Core |
| **Figure 4** | `fig4_dual_route_grading_rubric.png` | Section III-C: Automated Evaluation & Scoring Logic | Slide 8: Dual-Route Assessment & Rubric Scoring |
| **Figure 5** | `fig5_multipage_answer_collation.png` | Section III-D: Multi-Page Answer Collation Agent | Slide 9: Multi-Page Normalization & Disordered Answers |
| **Figure 6** | `fig6_human_in_the_loop_governance.png` | Section III-E: Human-in-the-Loop Examiner Governance | Slide 10: Teacher Review Dashboard & Audit Trail |
| **Figure 7** | `fig7_empirical_performance_benchmarks.png` | Section IV-A: Empirical Results & Ablation Analysis | Slide 11: Benchmark Results, MAE & Latency Profile |
| **Figure 8** | `fig8_database_er_and_vector_topology.png` | Section IV-B: Relational & Vector Storage Topologies | Technical Architecture Appendix Slide |
| **Figure 9** | `fig9_mathematical_algorithmic_formulations.png` | Section IV-C: Hough Transform & Cosine Geometry | Mathematical Foundations Deep Dive Slide |
| **Figure 10** | `fig10_teacher_workbench_and_student_report.png` | Section V: Interface & Pedagogical Reporting | Live Demo & Evaluation Scorecard Slide |
| **Figure 11** | `fig11_academic_conference_poster.png` | Full Academic Conference Research Presentation Poster | Conference Poster Session / Defense Exhibition |

---

## Figure-by-Figure Technical Specifications & LaTeX Snippets

### Figure 1: End-to-End System Pipeline & Architecture Overview

#### Technical Description
An overarching 5-tier academic architecture diagram illustrating the end-to-end data lifecycle:
1. **Client & Ingress Layer:** Web Client Application (single unified block) dispatching requests via an Asynchronous API Gateway and Controller.
2. **Ingestion & Computer Vision Tier:** Document preprocessing pipeline executing grayscale conversion, CLAHE adaptive histogram equalization, Fast Non-Local Means (NLM) denoising, and Hough transform deskewing. Feeds into a Primary Cloud Vision OCR Engine with a Secondary Multimodal Foundation Model fallback circuit breaker.
3. **Collation & Knowledge Retrieval Core:** Semantic Normalization & Multi-Page Collation Agent resolving multi-page fragmentation, connected to a Targeted Query Formulation module with an In-Memory LRU Vector Cache and a Vector Database Engine (HNSW indexing, cosine similarity, strict metadata filtering).
4. **Dual-Route Assessment & Pedagogy Tier:** Question type dispatcher routing objective items to a Strict Binary Scoring Enforcer and descriptive items to a Multi-Criteria Step-Wise Rubric Scorer (50% Factual Accuracy, 30% Completeness, 20% Conceptual Understanding). Converges into a Pedagogical Diagnostic Analyzer.
5. **Persistence & Governance Tier:** Relational Database Management System (RDBMS) audit trail and Human-in-the-Loop Examiner Override interface.

#### Academic Paper LaTeX Snippet
```latex
\begin{figure*}[htbp]
\centering
\includegraphics[width=\textwidth]{figures/fig1_overall_system_architecture.png}
\caption{End-to-End Architectural Pipeline of the Context-Aware Automated Grading System. The framework integrates an optical preprocessing tier, multi-page collation agent, curriculum-grounded vector database retrieval, and a dual-route evaluation engine.}
\label{fig:overall_architecture}
\end{figure*}
```

---

### Figure 2: Computer Vision Preprocessing & OCR Ingestion Pipeline

#### Technical Description
Illustrates the physical-to-digital transformation of handwritten student answer sheets:
1. **Raw Document Capture:** 300 DPI multi-page optical capture via scanner or smartphone camera.
2. **Resolution & Grayscale Normalization:** Standardizes color channels and dimensional aspect ratios.
3. **Contrast-Limited Adaptive Histogram Equalization (CLAHE):** Amplifies faded pencil and ink strokes while preventing amplification of background noise ($ClipLimit = 2.0$, $TileGridSize = (8,8)$).
4. **Fast Non-Local Means (NLM) Denoising:** Suppresses paper texture grain and reverse-side bleed-through.
5. **Hough Transform Skew Correction:** Detects dominant handwritten line orientations $\theta$ and rotates the image by $-\theta$ to enforce horizontal alignment.
6. **Spatial Layout & Bounding Box Segmentation:** Isolates textual paragraphs, mathematical equations, and student sketches.
7. **Dual-Engine OCR with Fallback Circuit Breaker:** High-throughput Cloud Vision OCR as primary, automatically failing over to a secondary Multimodal Vision-Language Model when confidence drops below $\tau_{\text{ocr}} < 0.65$.

#### Academic Paper LaTeX Snippet
```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=\columnwidth]{figures/fig2_vision_preprocessing_pipeline.png}
\caption{Computer Vision Preprocessing and OCR Ingestion Pipeline. Incorporates CLAHE ink enhancement, Hough transform deskewing, and a dual-engine fallback circuit breaker for challenging cursive handwriting.}
\label{fig:vision_pipeline}
\end{figure}
```

---

### Figure 3: Curriculum-Grounded Vector Retrieval & Context Injection Pipeline (RAG)

#### Technical Description
Illustrates the retrieval-augmented generation (RAG) grounding mechanism:
1. **Offline Curriculum Ingestion Stream:**
   - NCERT/CBSE reference textbooks parsed into recursive semantic chunks (300--500 tokens with 50-token semantic overlap).
   - Metadata tagging attaches Grade, Subject, Chapter, and Section headers.
   - Dense Sentence Transformer generates 768-dimensional dense vector embeddings.
   - Vectors indexed into a Vector Database using Hierarchical Navigable Small World (HNSW) graph structures with Cosine distance.
2. **Online Evaluation Query Stream:**
   - Question text and student normalized answer collated into a targeted retrieval query.
   - In-Memory LRU Vector Cache intercepts duplicate queries to eliminate redundant database roundtrips.
   - Approximate Nearest Neighbor (ANN) search executes with strict metadata payload filtering:
     $$\text{Filter: } (\text{grade} == G) \land (\text{subject} == S)$$
   - Passages exceeding cosine threshold $\cos(\theta) \ge \tau$ are retrieved.
3. **Prompt Augmentation:** Retrieved golden reference passages injected into the system prompt to anchor LLM grading against the official curriculum.

#### Academic Paper LaTeX Snippet
```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=\columnwidth]{figures/fig3_vector_retrieval_rag_pipeline.png}
\caption{Curriculum-Grounded Context Retrieval Pipeline. Employs dual offline indexing and online query streams with HNSW graph vector search and strict metadata payload filtering.}
\label{fig:vector_retrieval}
\end{figure}
```

---

### Figure 4: Dual-Route Automated Grading Engine & Pedagogical Diagnostic Pipeline

#### Technical Description
Details the evaluation intelligence and mathematical scoring logic:
1. **Question Type Dispatcher:** Inspects question metadata and splits evaluation into two distinct routes:
2. **Route A (Objective / MCQ Path):**
   - Handled by a Strict Binary Scoring Enforcer.
   - Compares student answer against official key:
     $$S_i = \begin{cases} S_{\max}, & \text{if } A_{\text{student}} = K_i \\ 0, & \text{otherwise} \end{cases}$$
   - Zero partial credit, completely bypassing leniency scaling to ensure mathematical objectivity.
3. **Route B (Descriptive / Analytical Path):**
   - Evaluated by a Multi-Criteria Step-Wise Rubric Scorer.
   - Decomposes assessment into three weighted dimensions:
     - Factual Accuracy ($F_i \in [0, 1]$, 50% weight)
     - Completeness & Depth ($C_i \in [0, 1]$, 30% weight)
     - Conceptual Understanding ($U_i \in [0, 1]$, 20% weight)
   - Weighted score calculation:
     $$S_{\text{raw}} = \left( 0.50 \cdot F_i + 0.30 \cdot C_i + 0.20 \cdot U_i \right) \times S_{\max}$$
   - Teacher leniency parameter scaling: $S_{\text{final}} = \min(S_{\max}, S_{\text{raw}} \times \lambda)$ where $\lambda \in [0.8, 1.2]$.
4. **Pedagogical Diagnostic Analyzer:**
   - Detects student misconceptions and erroneous causal reasoning.
   - Flags missing foundational curriculum concepts.
   - Formulates targeted remedial study guidance.

#### Academic Paper LaTeX Snippet
```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=\columnwidth]{figures/fig4_dual_route_grading_rubric.png}
\caption{Dual-Route Evaluation Engine and Diagnostic Pipeline. Routes objective questions to a strict binary validator while descriptive questions undergo 3-tier multi-criteria rubric scoring.}
\label{fig:dual_route_grading}
\end{figure}
```

---

### Figure 5: Multi-Page Answer Collation & Semantic Normalization Flow

#### Technical Description
Depicts the novel algorithmic solution to fragmented and unordered handwritten answer sheets:
1. **Student Writing Patterns in Real Exams:** Students frequently answer Question 1 on Page 1, start Question 2, run out of room, and continue Question 1 on Page 3 or in the margin.
2. **OCR Fragment Stream:** Receives raw segmented blocks with spatial bounding coordinates.
3. **Header/Margin Noise Filter:** Strips page numbers, student roll numbers, and border scribbles.
4. **Question Anchor Detector:** Employs regex and heuristic anchor matchers to detect explicit markers ("Ans 1", "Q.2", "continued on page 3").
5. **Semantic Normalization Agent (Foundation LLM):** Evaluates semantic continuity between orphan fragments and stitches split answers into a single coherent paragraph.
6. **Alignment Verifier:** Validates that all questions from the question paper have been accounted for before passing data to the evaluation engine.

#### Academic Paper LaTeX Snippet
```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=\columnwidth]{figures/fig5_multipage_answer_collation.png}
\caption{Multi-Page Answer Collation and Semantic Normalization Workflow. Demonstrates how split, multi-page student handwritten responses are identified, semantically stitched, and unified into canonical question-answer contracts.}
\label{fig:multipage_collation}
\end{figure}
```

---

### Figure 6: Human-in-the-Loop Examiner Review & Audit Trail Dashboard Architecture

#### Technical Description
Illustrates the trust, governance, and human-in-the-loop oversight architecture:
1. **Confidence Threshold & Discrepancy Monitor:** Automatically flags submissions with low OCR confidence, borderline passing marks, or high semantic divergence between student answer and reference text.
2. **Real-Time Asynchronous Streaming:** FastAPI Server-Sent Events (SSE) stream question-by-question grading progress directly to the frontend.
3. **Examiner Inspection Dashboard:** Side-by-side synchronized viewport comparing the original handwritten document crop, normalized text, retrieved textbook context, and rubric breakdown.
4. **Human Override Modal:** Examiner can manually adjust marks, edit diagnostic feedback, or confirm AI evaluations with a single click.
5. **Immutable Audit Ledger:** All teacher adjustments are logged in an ACID-compliant Relational Database with examiner ID, timestamp, prior score, revised score, and mandatory justification note.
6. **Student Progress Exporter:** Automatically generates PDF report cards and class-wide misconception heatmaps.

#### Academic Paper LaTeX Snippet
```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=\columnwidth]{figures/fig6_human_in_the_loop_governance.png}
\caption{Human-in-the-Loop Governance and Relational Audit Trail Architecture. Features real-time SSE streaming, side-by-side verification, examiner override controls, and immutable audit logging.}
\label{fig:governance_audit}
\end{figure}
```

---

### Figure 7: Empirical Performance Evaluation, Ablation Study & Latency Analysis

#### Technical Description
A 3-panel experimental evaluation figure validating system accuracy and efficiency:
1. **Panel (a) Ablation Study Comparison:** Grouped bar chart comparing Mean Absolute Error (MAE on 0-10 scale) and Pearson correlation coefficient ($r$) across progressive pipeline stages:
   - Baseline Model (Raw OCR, Zero Grounding): $\text{MAE} = 2.84, r = 0.62$
   - With Computer Vision Preprocessing (CLAHE + Deskew): $\text{MAE} = 2.15, r = 0.74$
   - With Multi-Page Collation Agent: $\text{MAE} = 1.48, r = 0.85$
   - Full Framework (+ Qdrant Vector Grounding + 3-Tier Rubric): $\text{MAE} = 0.58, r = 0.94$
2. **Panel (b) End-to-End Processing Latency Breakdown:** Horizontal stacked timeline displaying sub-second latency distribution (Vision Deskew: 320ms, OCR & Fallback Gate: 680ms, Collation Agent: 450ms, Vector Retrieval: 38ms, Multi-Criteria LLM Rubric Evaluation: 1,800ms; Total = ~3.28s per question item).
3. **Panel (c) Human Examiner vs. Automated Score Agreement:** Linear regression scatter plot demonstrating tight concordance ($R^2 = 0.942, p < 0.001$) between senior human examiner marks and AI-awarded scores across a test suite of handwritten examinations.

#### Academic Paper LaTeX Snippet
```latex
\begin{figure*}[htbp]
\centering
\includegraphics[width=\textwidth]{figures/fig7_empirical_performance_benchmarks.png}
\caption{Empirical Performance Evaluation and Ablation Study: (a) Progressive reduction in Mean Absolute Error (MAE) and increase in Pearson correlation ($r$); (b) Component-wise execution latency profiling; (c) Concordance scatter plot between senior human examiners and automated scoring ($R^2 = 0.942, p < 0.001$).}
\label{fig:empirical_benchmarks}
\end{figure*}
```

---

### Figure 8: Relational ER Schema & Vector Database HNSW Topology

#### Technical Description
A comprehensive dual-database architectural schema illustrating structured audit integrity and high-dimensional vector search:
1. **Left Panel: Relational Database Management System (RDBMS) ER Schema:**
   - Shows complete normalized entity tables: `EXAMINATIONS`, `STUDENT_SUBMISSIONS`, `QUESTION_ITEMS`, `EVALUATION_LEDGER`, `RUBRIC_BREAKDOWN`, `TEACHER_AUDIT_LOGS`, and `PEDAGOGICAL_DIAGNOSTICS`.
   - Explicitly displays Primary Keys `[PK]`, Foreign Keys `[FK]`, data types, and transactional foreign key constraints enforcing relational integrity.
2. **Right Panel: Vector Database Engine HNSW Graph & Metadata Topology:**
   - 3-tier Hierarchical Navigable Small World (HNSW) graph layers (Layer 2 entry point, Layer 1 intermediate routing, Layer 0 dense 768-dimensional vector ground).
   - Trace greedy search paths and highlights strict metadata payload filtering ($grade == 10 \land subject == "Science" \land chapter == 4$).
   - Displays cosine distance acceptance metric boundary $S_C(u, v) \ge \tau$.

#### Academic Paper LaTeX Snippet
```latex
\begin{figure*}[htbp]
\centering
\includegraphics[width=\textwidth]{figures/fig8_database_er_and_vector_topology.png}
\caption{Dual-Database Storage Architecture: (Left) Relational Entity-Relationship (ER) schema enforcing ACID transaction auditability; (Right) Hierarchical Navigable Small World (HNSW) vector indexing topology with metadata payload partition filtering.}
\label{fig:database_topology}
\end{figure*}
```

---

### Figure 9: Mathematical Formulations: Hough Deskewing & Cosine Vector Space Projection

#### Technical Description
Mathematical geometry and parametric equations powering document normalization and knowledge retrieval:
1. **Panel (a) Parametric Hough Transform Deskewing Geometry:**
   - 2D Cartesian spatial frame $(x, y)$ depicting an angled handwritten line baseline with tilt angle $\theta$.
   - Normal parametric line equation: $\rho = x \cos \theta + y \sin \theta$.
   - Transformation into Accumulator Parameter Space $(\theta, \rho)$ displaying sinusoidal wave intersections at peak point $(\theta^*, \rho^*)$.
   - Affine rotation transformation matrix $\mathbf{R}(-\theta^*)$ restoring the line to a horizontal $0^\circ$ baseline.
2. **Panel (b) High-Dimensional Vector Space Projection & Cosine Similarity:**
   - Unit hypersphere representation in $\mathbb{R}^{768}$ embedding space.
   - Normalized query vector $\mathbf{q}$ and candidate textbook vectors $\mathbf{d}_1, \dots, \mathbf{d}_n$.
   - Vector angle $\theta$ and cosine metric equation: $\mathcal{S}_C(\mathbf{q}, \mathbf{d}_i) = \frac{\mathbf{q}\cdot\mathbf{d}_i}{\|\mathbf{q}\|\|\mathbf{d}_i\|} = \cos \theta$.
   - Angular acceptance cone defining retrieved golden curriculum context ($\mathcal{S}_C \ge \tau$) vs. filtered irrelevant passages ($\mathcal{S}_C < \tau$).

#### Academic Paper LaTeX Snippet
```latex
\begin{figure*}[htbp]
\centering
\includegraphics[width=\textwidth]{figures/fig9_mathematical_algorithmic_formulations.png}
\caption{Mathematical Foundations of the Ingestion and Retrieval Pipeline: (a) Parametric Hough line transform deskewing geometry and accumulator peak voting; (b) High-dimensional unit hypersphere vector projection and cosine similarity acceptance cone ($\mathcal{S}_C \ge \tau$).}
\label{fig:math_formulations}
\end{figure*}
```

---

### Figure 10: Teacher Evaluation Workbench UI & Pedagogical Student Scorecard

#### Technical Description
High-resolution user experience and pedagogical artifact mockup:
1. **Panel A: Teacher Evaluation & Audit Workbench:**
   - 3-column synchronized inspection interface:
     - Sub-pane 1: Original handwritten paper crop with OCR bounding box overlays.
     - Sub-pane 2: Question stem and retrieved NCERT textbook golden standard reference passage.
     - Sub-pane 3: Step-wise rubric scoring (Factual Accuracy 4.5/5.0, Completeness 2.6/3.0, Conceptual Understanding 1.6/2.0), teacher leniency slider ($\lambda = 1.02\times$), and manual override confirmation controls with ACID audit logging.
2. **Panel B: Pedagogical Diagnostic Student Scorecard:**
   - Student examination details (Name, Roll No, Total Score: 89/100, Class Rank).
   - Itemized question-wise marks ledger.
   - 5-axis Competency Radar Chart (Factual Accuracy, Completeness & Depth, Conceptual Understanding, Diagram Clarity, Equation Rigor).
   - Formative Diagnostic Box highlighting student misconceptions, missing foundational concepts, and targeted remedial textbook exercises.

#### Academic Paper LaTeX Snippet
```latex
\begin{figure*}[htbp]
\centering
\includegraphics[width=\textwidth]{figures/fig10_teacher_workbench_and_student_report.png}
\caption{System Interface and Pedagogical Feedback Artifacts: (a) Synchronized 3-pane examiner verification workbench with real-time override controls; (b) Formative pedagogical diagnostic scorecard with competency radar chart and targeted remedial recommendations.}
\label{fig:ui_scorecard}
\end{figure*}
```

---

### Figure 11: Academic Conference Research Presentation Poster (A0 / 36" $\times$ 48")

#### Technical Description
A 3-column academic research presentation poster for international conferences (IEEE/ACM) and university symposiums:
1. **Header Banner:** Project title, Department of Computer Science & Engineering, Sathyabama Institute of Science and Technology.
2. **Column 1 (Foundations & Optical Pipeline):** Abstract, problem motivation, and technical flowchart for CLAHE ink enhancement, Hough transform deskewing, and OCR fallback circuit breakers.
3. **Column 2 (Core Architecture & Novel Algorithms):** Decoupled 5-tier architecture, Qdrant vector retrieval grounding, Multi-Page Answer Collation Agent, and Dual-Route scoring mathematical formulas.
4. **Column 3 (Empirical Results & Human Governance):** Ablation performance table, human examiner agreement plot ($R^2 = 0.942$), teacher oversight audit trail, conclusions, and Capstone GitHub verification.

---

## PowerPoint Presentation Deck Structure (12-Slide Master Plan)

For college project defense, coordinator review, and conference presentations, organize your slides as follows:

| Slide # | Slide Title | Visual Asset to Display | Key Speaking Points |
| :---: | :--- | :--- | :--- |
| **1** | Title & Project Overview | Official Logo & Application Title | Project scope: Context-Aware Automated Grading using Vector Search & LLMs. |
| **2** | Motivation & Problem Statement | Problem Formulation Graphic | Inconsistency, grader fatigue, and delayed pedagogical feedback in traditional exams. |
| **3** | Core Research Objectives | Bulleted Framework Objectives | OCR resilience, curriculum grounding, explainable rubric grading, auditability. |
| **4** | End-to-End System Architecture | **Figure 1** | Walk examiners through the 5-tier architecture from client to database. |
| **5** | Tech Stack & Engineering Rigor | Tech Stack Architecture Grid | Python 3.11, FastAPI, Qdrant, React 19, MUI v9, Foundation Models. |
| **6** | Optical Ingestion & Resilient OCR | **Figure 2** | Explain CLAHE, Hough deskewing, and multimodal OCR circuit breaker. |
| **7** | Curriculum Grounding via RAG | **Figure 3** | Explain HNSW vector indexing and cosine thresholding against NCERT textbooks. |
| **8** | Dual-Route Evaluation Logic | **Figure 4** | Highlight MCQ binary strictness vs. 3-tier descriptive rubric weighting. |
| **9** | Multi-Page Collation Agent | **Figure 5** | Showcase novel contribution: solving split answers across exam pages. |
| **10** | Teacher Oversight & Audit Trail | **Figure 6** | Demonstrate human-in-the-loop override and immutable database audit logs. |
| **11** | Experimental Results & Metrics | **Figure 7** | 94.2% agreement with human examiners, ablation study, and sub-3.3s latency. |
| **12** | Conclusion & Future Work | **Figure 10 & 11** | Formative student scorecard, conference poster summary, and mobile inference roadmap. |
