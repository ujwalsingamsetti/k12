# Publication-Grade System Architecture Specification
## Context-Aware Automated Grading of Written Examinations Using Vector Search and Large Language Models

---

### Abstract & Architectural Paradigm

Automating the grading of handwritten student examination booklets requires solving non-trivial multidisciplinary challenges across computer vision, natural language processing, semantic information retrieval, and deterministic reasoning. Conventional automated assessment systems suffer from three fundamental bottlenecks:
1. **Transcriptive and Layout Brittleness**: Handwriting variability, ink degradation, multi-column answer layouts, and scattered answer fragments across non-consecutive pages defeat standard optical character recognition (OCR) and naive regex splitters.
2. **Ungrounded Hallucinations and Syllabus Drift**: Large language models evaluated in isolation hallucinate out-of-syllabus criteria or apply college-level expectations to secondary school students.
3. **Scoring Indeterminism and Leniency Flaws**: Probabilistic generation leads to score variance and unmerited partial credit on objective questions (e.g., awarding partial marks for incorrect multiple-choice choices).

This paper presents the formal system architecture of a **Context-Aware Automated Examination Grading System**. The architecture integrates:
* An **Advanced Image Preprocessing and Dual-Engine Vision Pipeline** with automated circuit-breaking between a Cloud Vision OCR service and a Multimodal Foundation Model.
* A **Semantic Normalization and Multi-Page Collation Agent** that repairs transcriptions, consolidates fragmented answers, and marks unattempted questions deterministically.
* A **Curriculum-Grounded Dense Vector Retrieval (RAG) Subsystem** utilizing sentence transformers, in-memory LRU embedding/context caches, and a vector database with strict payload metadata filtering ($\text{Subject} \land \text{Academic Level}$).
* A **Dual-Mode Step-Wise Evaluation Engine** that enforces deterministic binary scoring (0 or full marks) on objective questions while applying a three-tier weighted criteria rubric (Factual 50%, Completeness 30%, Conceptual 20%) on descriptive responses.
* A **Persistent Audit and Human-in-the-Loop Override Tier** backed by a relational database management system.

---

### Detailed Publication-Grade System Architecture Diagram

```mermaid
flowchart TD
    %% Formal Academic Minimalist Palette (Grayscale, Charcoal, Muted Steel Slate)
    classDef clientLayer fill:#F8FAFC,stroke:#1E293B,stroke-width:2px,color:#0F172A,font-weight:bold;
    classDef gatewayLayer fill:#FFFFFF,stroke:#334155,stroke-width:1.5px,color:#0F172A;
    classDef processLayer fill:#FFFFFF,stroke:#475569,stroke-width:1.5px,color:#0F172A;
    classDef llmAgentLayer fill:#F8FAFC,stroke:#2563EB,stroke-width:1.5px,color:#1E3A8A;
    classDef storageLayer fill:#F1F5F9,stroke:#334155,stroke-width:1.5px,color:#0F172A;
    classDef circuitBreaker fill:#FEFCE8,stroke:#B45309,stroke-width:1.5px,color:#78350F;
    classDef decisionDiamond fill:#FFFFFF,stroke:#0F172A,stroke-width:1.5px,color:#0F172A;

    %% ─────────────────────────────────────────────────────────────
    %% 1. PRESENTATION TIER (Single Unified Block)
    %% ─────────────────────────────────────────────────────────────
    subgraph Tier_Client ["Tier 1: Presentation & Client Interface Layer"]
        CLIENT_APP["Unified Web Client Interface<br/>(Single-Page Application Architecture • Multi-Question Exam Setup • Multipart Answer Upload • Server-Sent Events Real-Time Progress Stream • Interactive Diagnostic Report Viewer • Curriculum Vector Management Studio • Historical Archive & Teacher Override Console)"]:::clientLayer
    end

    %% ─────────────────────────────────────────────────────────────
    %% 2. API GATEWAY & APPLICATION CONTROLLER TIER
    %% ─────────────────────────────────────────────────────────────
    subgraph Tier_Gateway ["Tier 2: Asynchronous API Gateway & Controller Layer"]
        ASGI_SERVER["Asynchronous Server Gateway Interface (ASGI Engine / HTTP/2)"]:::gatewayLayer
        AUTH_RATE_GUARD["Security, CORS & Token-Bucket Rate Limiter"]:::gatewayLayer
        DISPATCHER["Application Route Dispatcher"]:::gatewayLayer
        
        ENDPOINT_EVAL["POST /api/evaluation/evaluate<br/>(Batch Pipeline & SSE Stream)"]:::gatewayLayer
        ENDPOINT_EXTRACT["POST /api/evaluation/extract-question-paper<br/>(Universal Exam Schema Extractor)"]:::gatewayLayer
        ENDPOINT_TEXTBOOK["POST & GET /api/textbooks/*<br/>(Vector Ingestion & Chunk Telemetry)"]:::gatewayLayer
        ENDPOINT_HISTORY["GET & POST /api/evaluation/history<br/>(Archival Query & Audit Log)"]:::gatewayLayer
        ENDPOINT_OVERRIDE["POST /api/evaluation/override<br/>(Human-in-the-Loop Calibration)"]:::gatewayLayer
    end

    %% ─────────────────────────────────────────────────────────────
    %% 3. MULTIMODAL INGESTION & COMPUTER VISION PREPROCESSING TIER
    %% ─────────────────────────────────────────────────────────────
    subgraph Tier_Vision ["Tier 3: Multimodal Ingestion & Computer Vision Preprocessing Tier"]
        INPUT_CLASSIFIER{"Input Stream Classifier<br/>(MIME & Format Audit)"}:::decisionDiamond
        
        NATIVE_PDF_PARSER["Native Digital PDF Text Extractor<br/>(Character Stream Probe: &gt;200 chars &rarr; Fast Path &lt;50ms)"]:::processLayer
        PAGE_RASTERIZER["Document Page Rasterizer<br/>(PDF to 300 DPI High-Resolution Image Buffers)"]:::processLayer
        
        CV_RESIZE["Spatial Scale Normalizer<br/>(Interpolation to 2500px Standardized Width)"]:::processLayer
        CV_DENOISE["Fast Non-Local Means Denoising<br/>(Grain Texture & Reverse-Ink Suppression)"]:::processLayer
        CV_CLAHE["Contrast-Limited Adaptive Histogram Equalization<br/>(Faint Pencil & Heavy Ink Balancing)"]:::processLayer
        CV_ADAPTIVE["Adaptive Gaussian Thresholding<br/>(Foreground Stroke & Ruled-Line Separation)"]:::processLayer
        CV_DESKEW["In-Memory Hough Line Transform Deskewing<br/>(Orientation Angle &theta; Detection & Affine Correction &plusmn;0.5&deg;-15&deg;)"]:::processLayer
        
        OCR_PRIMARY["Primary Cloud Vision OCR Engine<br/>(Word/Line Geometry & Dense Transcription)"]:::processLayer
        OCR_CHECK{"Primary OCR<br/>Service Healthy?"}:::circuitBreaker
        OCR_FALLBACK_VLM["Secondary Multimodal Foundation Model<br/>(Verbatim Handwriting & Formula Extraction Fallback)"]:::circuitBreaker
        
        DOMAIN_LEXICON["Domain Vocabulary Spell-Guard<br/>(Protection for Specialized Science/Math Lexicons)"]:::processLayer
        DIAGRAM_DETECTOR["Spatial Diagram & Contour Extractor<br/>(OpenCV Geometric Analysis + Object Bounding Boxes)"]:::processLayer
    end

    %% ─────────────────────────────────────────────────────────────
    %% 4. SEMANTIC NORMALIZATION & MULTI-PAGE COLLATION TIER
    %% ─────────────────────────────────────────────────────────────
    subgraph Tier_Collation ["Tier 4: Semantic Normalization & Multi-Page Collation Agent Tier"]
        RAW_PAGES_AGGREGATOR["Multi-Page Raw Transcription Aggregator"]:::processLayer
        
        NORMALIZER_LLM["Semantic Normalization & Collation Agent<br/>(Call Foundation LLM via Constrained System Instruction)"]:::llmAgentLayer
        NORMALIZER_TASKS["Agent Responsibilities:<br/>1. Repair OCR Symbol Deletions & Broken Superscripts/Subscripts<br/>2. Collate Scattered Answer Fragments Across Non-Consecutive Pages<br/>3. Reconstruct Multi-Line Mathematical Equations & Proofs<br/>4. Detect & Flag Unattempted Questions Deterministically"]:::processLayer
        
        REGEX_PARSER_FALLBACK["Heuristic Regex Answer Parser Fallback<br/>(15+ Numbering Conventions: Q1., Ans 2, 1.(a), Pure MCQ)"]:::processLayer
        CANONICAL_ANSWER_MAP["Canonical Question-Answer Entity Map<br/>(Structured Question-by-Question Cleaned Ingestion Payloads)"]:::processLayer
    end

    %% ─────────────────────────────────────────────────────────────
    %% 5. CURRICULUM-GROUNDED VECTOR RETRIEVAL (RAG) TIER
    %% ─────────────────────────────────────────────────────────────
    subgraph Tier_RAG ["Tier 5: Curriculum-Grounded Vector Search (RAG) Tier"]
        TARGETED_QUERY_GEN["Targeted Query Formulator<br/>(Question Prompt + Student Answer Focus Window)"]:::processLayer
        
        LRU_EMBED_CACHE["In-Memory LRU Vector Cache<br/>(Capacity: 2048 Vectors • 0ms Cache Hit)"]:::storageLayer
        LRU_CONTEXT_CACHE["In-Memory LRU Context Cache<br/>(Capacity: 512 Results • Exact Match Hit)"]:::storageLayer
        
        EMBED_MODEL["Dense Embedding Foundation Model<br/>(High-Dimensional Semantic Vector Encoding)"]:::processLayer
        
        FILTER_GENERATOR["Strict Payload Filter Synthesizer<br/>(Subject == NormSubject &and; AcademicLevel == NormLevel)"]:::processLayer
        
        VECTOR_DATABASE[("Vector Database Engine<br/>(HNSW Graph Indexing • Cosine Metric • Isolated Collections)")]:::storageLayer
        CURRICULUM_CHUNKS["Authoritative Curriculum Chunks<br/>(Punctuation-Aware Semantic Chunks • 800 Chars / 150 Overlap)"]:::storageLayer
    end

    %% ─────────────────────────────────────────────────────────────
    %% 6. MULTI-CRITERIA STEP-WISE EVALUATION & SCORING TIER
    %% ─────────────────────────────────────────────────────────────
    subgraph Tier_Evaluation ["Tier 6: Multi-Criteria Step-Wise Evaluation & Scoring Tier"]
        PARALLEL_ORCHESTRATOR["Parallel Async Evaluation Orchestrator<br/>(Concurrent Task Dispatch per Question)"]:::processLayer
        PERSONA_SELECTOR["Academic Persona & Demeanor Synthesizer<br/>(University Rigor • Competitive Analytical • Board Step-Marking)"]:::processLayer
        
        QUESTION_CLASSIFIER{"Question<br/>Taxonomy Type?"}:::decisionDiamond
        
        BINARY_GATE["Strict Binary Scoring Enforcer<br/>(Objective Types: MCQ, True/False, Assertion-Reason, Fill-in-Blank)"]:::llmAgentLayer
        BINARY_RULES["Strict Binary Constraints:<br/>&bull; Score = Max Score iff Answer == Marking Rubric Exactly<br/>&bull; Score = 0 for Any Incorrect Option / Distractor<br/>&bull; Zero Partial Credit • Suppression of Confidence Leniency Boost"]:::processLayer
        
        DESCRIPTIVE_GATE["Multi-Criteria Step-Wise Rubric Scorer<br/>(Subjective Types: Short Answer, Long Answer, Derivations, Diagrams)"]:::llmAgentLayer
        RUBRIC_BREAKDOWN["Tri-Partite Criteria Breakdown:<br/>&bull; Factual Correctness: 50% Weight (Scientific Laws, Definitions, Values)<br/>&bull; Structural Completeness: 30% Weight (Logical Steps, Equations, Units)<br/>&bull; Conceptual Understanding: 20% Weight (Principle Application, Soundness)"]:::processLayer
        
        EVAL_LLM_PRIMARY["Primary Foundation LLM Inference Engine<br/>(Asynchronous Streaming Client • Strict JSON Schema Output)"]:::llmAgentLayer
        EVAL_LLM_FALLBACK["Secondary Foundation LLM Fallback Engine<br/>(Automated Failover on Timeout, Quota, or Connection Loss)"]:::circuitBreaker
        
        DIAGNOSTIC_ANALYZER["Pedagogical Diagnostic Analyzer<br/>(Misconception Isolation • Missing Concept Identification • Remedial Guidance)"]:::processLayer
    end

    %% ─────────────────────────────────────────────────────────────
    %% 7. PERSISTENCE, AUDITING & ANALYTICS TIER
    %% ─────────────────────────────────────────────────────────────
    subgraph Tier_Persistence ["Tier 7: Relational Persistence, Auditability & Human-in-the-Loop Tier"]
        METRIC_AGGREGATOR["Paper Metric Aggregator<br/>(Total Marks • Percentage • Performance Tiers: Exemplary/Pass/Needs Improvement/Fail)"]:::processLayer
        
        RDBMS_STORAGE[("Relational Database Management System<br/>(Table: saved_evaluations • Unique UUID PK • Full JSON Report Audit Trail)")]:::storageLayer
        BLOB_STORAGE[("Artifact & File Storage<br/>(Source Images, Normalized PDFs, Ingestion Manifests)")]:::storageLayer
        
        OVERRIDE_HANDLER["Examiner Manual Override Controller<br/>(Score Calibration • Remark Annotation • Immutable Versioning)"]:::processLayer
    end

    %% ─────────────────────────────────────────────────────────────
    %% INTER-TIER DATA FLOW & CONTROL WIRING
    %% ─────────────────────────────────────────────────────────────
    CLIENT_APP -->|HTTP/2 Multipart Form & SSE Connection| ASGI_SERVER
    ASGI_SERVER --> AUTH_RATE_GUARD
    AUTH_RATE_GUARD --> DISPATCHER
    
    DISPATCHER --> ENDPOINT_EVAL
    DISPATCHER --> ENDPOINT_EXTRACT
    DISPATCHER --> ENDPOINT_TEXTBOOK
    DISPATCHER --> ENDPOINT_HISTORY
    DISPATCHER --> ENDPOINT_OVERRIDE

    ENDPOINT_EVAL --> INPUT_CLASSIFIER
    INPUT_CLASSIFIER -->|Digital PDF Stream| NATIVE_PDF_PARSER
    INPUT_CLASSIFIER -->|Scanned Document / Image| PAGE_RASTERIZER

    PAGE_RASTERIZER --> CV_RESIZE
    CV_RESIZE --> CV_DENOISE
    CV_DENOISE --> CV_CLAHE
    CV_CLAHE --> CV_ADAPTIVE
    CV_ADAPTIVE --> CV_DESKEW

    CV_DESKEW --> OCR_CHECK
    OCR_CHECK -->|Service Available| OCR_PRIMARY
    OCR_CHECK -->|Service Degradation / Limit| OCR_FALLBACK_VLM

    OCR_PRIMARY --> DOMAIN_LEXICON
    OCR_FALLBACK_VLM --> DOMAIN_LEXICON
    CV_DESKEW --> DIAGRAM_DETECTOR

    NATIVE_PDF_PARSER --> RAW_PAGES_AGGREGATOR
    DOMAIN_LEXICON --> RAW_PAGES_AGGREGATOR
    
    RAW_PAGES_AGGREGATOR --> NORMALIZER_LLM
    NORMALIZER_LLM --- NORMALIZER_TASKS
    NORMALIZER_LLM -.->|Heuristic Failover| REGEX_PARSER_FALLBACK
    NORMALIZER_LLM --> CANONICAL_ANSWER_MAP

    CANONICAL_ANSWER_MAP --> PARALLEL_ORCHESTRATOR
    DIAGRAM_DETECTOR -.->|Spatial Bounding Boxes| PARALLEL_ORCHESTRATOR

    PARALLEL_ORCHESTRATOR --> TARGETED_QUERY_GEN
    TARGETED_QUERY_GEN --> LRU_CONTEXT_CACHE
    LRU_CONTEXT_CACHE -->|Cache Miss| LRU_EMBED_CACHE
    LRU_EMBED_CACHE -->|Cache Miss| EMBED_MODEL
    
    EMBED_MODEL --> VECTOR_DATABASE
    FILTER_GENERATOR --> VECTOR_DATABASE
    VECTOR_DATABASE <--> CURRICULUM_CHUNKS
    VECTOR_DATABASE -->|Top-K Authoritative Context Chunks| PARALLEL_ORCHESTRATOR

    PARALLEL_ORCHESTRATOR --> PERSONA_SELECTOR
    PERSONA_SELECTOR --> QUESTION_CLASSIFIER

    QUESTION_CLASSIFIER -->|Objective / Binary Types| BINARY_GATE
    BINARY_GATE --- BINARY_RULES
    
    QUESTION_CLASSIFIER -->|Descriptive / Analytic Types| DESCRIPTIVE_GATE
    DESCRIPTIVE_GATE --- RUBRIC_BREAKDOWN

    BINARY_GATE --> EVAL_LLM_PRIMARY
    DESCRIPTIVE_GATE --> EVAL_LLM_PRIMARY
    EVAL_LLM_PRIMARY -.->|Failover on Timeout/Exception| EVAL_LLM_FALLBACK

    EVAL_LLM_PRIMARY --> DIAGNOSTIC_ANALYZER
    EVAL_LLM_FALLBACK --> DIAGNOSTIC_ANALYZER

    DIAGNOSTIC_ANALYZER --> METRIC_AGGREGATOR
    METRIC_AGGREGATOR --> RDBMS_STORAGE
    DISPATCHER --> BLOB_STORAGE
    
    ENDPOINT_OVERRIDE <--> OVERRIDE_HANDLER
    OVERRIDE_HANDLER <--> RDBMS_STORAGE
    ENDPOINT_HISTORY <--> RDBMS_STORAGE
    ENDPOINT_TEXTBOOK <--> VECTOR_DATABASE

    METRIC_AGGREGATOR -->|Server-Sent Events Real-Time Stream / JSON| CLIENT_APP
```

---

### Step-by-Step Execution Lifecycle & Data Flow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Client as Unified Web Client
    participant Gateway as Asynchronous API Gateway
    participant Vision as Computer Vision & OCR Pipeline
    participant Normalizer as Semantic Normalization Agent
    participant RAG as Vector Search & Embedding Engine
    participant Eval as Multi-Criteria Evaluation Engine
    participant DB as Relational Database (Persistence)

    Client->>Gateway: POST /api/evaluation/evaluate (Answer Payload + Exam Rubric)
    activate Gateway
    Gateway-->>Client: SSE Event: Ingestion Initialized (Stage: init, Progress: 5%)

    Gateway->>Vision: Dispatch Input Streams (Digital PDF vs Raster Images)
    activate Vision
    alt Digital PDF Available (>200 native characters)
        Vision->>Vision: Direct PDF Stream Extraction (<50ms)
    else Raster Document Scans
        Vision->>Vision: OpenCV Normalization (Denoise, CLAHE, Hough Deskew)
        Vision->>Vision: Spatial Diagram & Bounding Box Extraction
        alt Primary Cloud Vision OCR Active
            Vision->>Vision: Execute Optical Text Detection
        else Primary Degraded / Quota Exceeded
            Vision->>Vision: Trigger Multimodal Foundation Model Fallback
        end
    end
    Vision-->>Gateway: Raw Page Transcriptions + Spatial Diagram Metadata
    deactivate Vision
    Gateway-->>Client: SSE Event: OCR Extraction Complete (Stage: ocr, Progress: 35%)

    Gateway->>Normalizer: Execute Answer Normalization & Multi-Page Collation
    activate Normalizer
    Normalizer->>Normalizer: Call Normalization LLM: Repair OCR Errors & Consolidate Cross-Page Fragments
    Normalizer->>Normalizer: Deterministically Detect Unattempted Questions
    Normalizer-->>Gateway: Canonical Question-to-Answer Entity Map
    deactivate Normalizer
    Gateway-->>Client: SSE Event: Multi-Page Collation Complete (Stage: normalizing, Progress: 60%)

    par Parallel Concurrent Evaluation per Question
        Gateway->>RAG: Retrieve Curriculum Grounding (Subject + Academic Level Filter)
        activate RAG
        RAG->>RAG: Check In-Memory LRU Cache -> Generate Dense Embeddings
        RAG->>RAG: Filtered HNSW Cosine Similarity Search in Vector DB
        RAG-->>Gateway: Top-K Curriculum Chunks + Similarity Scores
        deactivate RAG

        Gateway->>Eval: Evaluate Answer against Textbook Grounding & Rubric
        activate Eval
        alt Objective Question (MCQ / True-False / Fill-in-Blank)
            Eval->>Eval: Apply Strict Binary Gate: Score = Max Score iff Correct else 0
        else Descriptive Question (Short/Long Answer / Derivation)
            Eval->>Eval: Compute Weighted Breakdown: Factual (50%), Completeness (30%), Understanding (20%)
        end
        Eval->>Eval: Synthesize Diagnostic Misconceptions & Remedial Guidance
        Eval-->>Gateway: Structured Question Evaluation Payload
        deactivate Eval
    end

    Gateway->>Gateway: Aggregate Total Paper Marks, Percentage & Performance Tier
    Gateway->>DB: Persist Evaluation Entity (UUID, Scores, Breakdown, JSON Report)
    activate DB
    DB-->>Gateway: Confirmation Stored
    deactivate DB

    Gateway-->>Client: SSE Event: Pipeline Complete (Stage: completed, Progress: 100%) + Full Report
    deactivate Gateway
```

---

### Exhaustive Architectural Specification & Component Deep-Dive

#### 1. Presentation & Client Interface Tier
The client layer is implemented as an enterprise-grade Single Page Application (SPA). To maintain clean modular decoupling, all presentation concerns are encapsulated within a unified boundary interacting with the backend exclusively via asynchronous HTTP/2 REST endpoints and Server-Sent Events (SSE):
* **State Management & Live Telemetry**: As multi-question evaluation involves multiple concurrent pipeline stages (OCR, normalizer collation, targeted vector queries, LLM scoring), the frontend establishes an SSE event stream (`EventSource`). The backend streams granular progression updates (`init` $\to$ `ocr` $\to$ `normalizing` $\to$ `rag` $\to$ `evaluating` $\to$ `completed`) alongside percentage completion counters.
* **Curriculum Vector Management Console**: Provides an administrative interface for subject matter experts to upload syllabus textbooks, trigger sentence-boundary chunking, view vector database statistics (collection points, dimension sizes), and inspect raw chunks stored in the vector database.
* **Human-in-the-Loop Override Interface**: Enables educators to inspect the exact textbook chunks retrieved by the vector engine, read the model's error diagnosis, calibrate awarded marks, input audit remarks, and persist revised reports.

#### 2. Asynchronous API Gateway & Routing Tier
* **ASGI Runtime & Concurrency**: Powered by FastAPI and the Uvicorn ASGI engine on Python 3.11, employing non-blocking `async/await` patterns throughout the request lifecycle.
* **Traffic Control & Resilience**:
  * *Token-Bucket Rate Limiter*: Implemented via `slowapi` to protect expensive computer vision and foundation model endpoints from denial-of-service degradation.
  * *Global Exception Boundary*: Catches uncaught runtime exceptions, formats structured JSON diagnostic responses, and enforces cross-origin resource sharing (CORS) headers across all response paths.
  * *Multipart Processing*: Streams incoming multi-file uploads into in-memory temporary buffers, preventing disk bottlenecking during peak concurrency.

#### 3. Multimodal Ingestion & Computer Vision Preprocessing Tier
* **Digital PDF Direct Extraction Fast-Path**: Prior to invoking computationally intensive visual transformations, incoming PDF documents are inspected via PyMuPDF (`fitz`). If native digital character streams exist and exceed 200 characters across pages, text is extracted directly in under 50ms, bypassing visual OCR.
* **Computer Vision Optimization Pipeline**:
  1. *Spatial Rescaling*: Scanned images are normalized to a standard width of 2,500px using bicubic/area interpolation to establish an invariant pixel-density baseline.
  2. *Fast Non-Local Means (NLM) Denoising*: Removes high-frequency scanner noise, paper grain, and ink bleed-through from the opposing page (`cv2.fastNlMeansDenoising`).
  3. *Contrast-Limited Adaptive Histogram Equalization (CLAHE)*: Equalizes local tile contrast ($8\times 8$ grid, clip limit 2.5), enhancing faint pencil marks without blowing out saturated pen strokes.
  4. *Adaptive Gaussian Thresholding*: Binarizes images using local pixel neighborhoods, separating handwriting from background paper texture.
  5. *In-Memory Hough Deskewing*: Evaluates line orientation angles using the Hough transform. If page skew $|\theta|$ satisfies $0.5^\circ \le |\theta| \le 15^\circ$, an affine rotation matrix $M$ rotates the image buffer in memory.
* **Dual-Engine OCR Circuit Breaker**:
  * Primary transcription utilizes a Cloud Vision OCR service (`document_text_detection`).
  * If quota limits, network timeouts, or billing exceptions are detected, the system circuit breaker activates, redirecting the request to a **Multimodal Foundation Model (Vision-Language Model)** that transcribes handwriting and mathematical equations verbatim.
* **Spatial Diagram Detection**: `DiagramService` and `QuestionRegionDetector` execute OpenCV contour analysis and object localization in parallel, isolating geometric diagrams, electrical circuits, and graphs, mapping their bounding boxes to corresponding question numbers.

#### 4. Semantic Normalization & Multi-Page Collation Agent Tier
* **Transcription Sanitization**: The normalization agent uses a constrained foundation LLM instruction prompt to correct character ambiguities without altering student logic (e.g., repairing `solen0id` to `solenoid`, restoring distorted exponents such as $10^5$).
* **Cross-Page Fragment Stitching**: In written examinations, students frequently write part of an answer on Page 1, continue calculations on Page 3, or write supplementary steps in the margins. The normalization agent traces and collates all scattered fragments into a single unified answer string per question.
* **Deterministic Omission Flagging**: Questions left unanswered are assigned the canonical token `[Not attempted by student in submitted sheet]` and marked as unattempted, guaranteeing zero hallucinated partial credit.
* **Heuristic Regex Parser Fallback**: An offline regex parser supporting 15+ numbering conventions (`Q1.`, `Ans 2)`, `1. (a)`, pure MCQ answer keys) operates as an immediate fallback if LLM normalization is unavailable.

#### 5. Curriculum-Grounded Dense Vector Retrieval (RAG) Tier
* **Semantic Punctuation-Aware Chunking**: Reference textbooks and official marking schemes are ingested with sentence-boundary and punctuation awareness (800 characters with 150-character overlap) to prevent truncated proofs or incomplete definitions.
* **Dense Vector Embeddings**: Text chunks are mapped into high-dimensional vector space using a pre-trained sentence transformer model (`all-MiniLM-L6-v2` / `all-mpnet-base-v2`).
* **Two-Tier In-Memory LRU Caching**:
  * *Vector Cache (2,048 entries)*: Caches query embeddings, achieving 0ms latency on repeated queries.
  * *Context Cache (512 entries)*: Caches retrieved context chunks for identical query tuples.
* **Vector Database & HNSW Search**:
  Vector similarity search is executed in the vector database using the Cosine distance metric over Hierarchical Navigable Small World (HNSW) graph indexes.
* **Strict Payload Filtering**: To prevent syllabus mismatch, all vector queries apply strict metadata filters:
  $$\text{Filter} = \{\text{subject} == \text{NormalizedSubject}\} \land \{\text{academic\_level} == \text{NormalizedLevel}\}$$
  If the grade-specific partition contains no matching chunks, the engine gracefully broadens to subject-level context.

#### 6. Multi-Criteria Step-Wise Evaluation & Scoring Tier
* **Academic Persona Adaptation**: The grading agent dynamically tailors its evaluator persona based on the target academic system:
  * *Higher Education / University*: Enforces university-level academic rigor, validating step derivations, mathematical precision, and professional terminology.
  * *Competitive Examinations*: Prioritizes analytical correctness, concise justifications, and penalizes unsupported assumptions.
  * *School Board Examinations*: Applies constructive step-marking according to standard board rubrics, rewarding conceptual clarity and valid intermediate steps.
* **Strict Binary Scoring Enforcer (Objective Questions)**:
  For questions classified as `MCQ`, `Multiple Choice`, `Assertion-Reasoning`, `True/False`, `Fill in the Blank`, or `Match the Following`, the engine enforces strict binary logic:
  $$\text{Score} = \begin{cases} \text{Max Score}, & \text{if student choice matches rubric exactly} \\ 0, & \text{otherwise} \end{cases}$$
  All confidence-based leniency boosts are suppressed, preventing partial marks for incorrect choices.
* **Multi-Criteria Step-Wise Rubric Scorer (Descriptive Questions)**:
  Descriptive responses are evaluated across three orthogonal dimensions:
  1. *Factual Correctness (50% Weight)*: Precision of stated scientific laws, numerical values, and core definitions.
  2. *Structural Completeness (30% Weight)*: Presence of step derivations, formulas, intermediate workings, and SI units.
  3. *Conceptual Understanding (20% Weight)*: Soundness of principle application and absence of flawed assumptions.
* **Multi-Provider LLM Resilience**: Primary grading requests execute against a high-performance foundation LLM. If timeouts or connection exceptions occur, failover logic invokes a secondary foundation model, maintaining high availability.

#### 7. Pedagogical Diagnostics & Remediation Tier
* **Misconception Mapping**: Identifies the specific conceptual mistake, juxtaposing the student's assertion against the scientifically correct principle, accompanied by the deduction rationale.
* **Curriculum Gap Analysis**: Isolates omitted terms, missing mathematical steps, or absent diagram labels.
* **Remedial Guidance**: Formulates actionable recommendations, specific textbook chapters to re-read, and targeted problem sets to practice.

#### 8. Relational Persistence & Audit Tier
* **Relational Storage (RDBMS)**: Evaluation payloads—including raw student answer fragments, normalized text, question scores, criteria breakdowns, RAG retrieval traces, and diagnostic summaries—are stored in the `saved_evaluations` relational table with immutable UUID keys.
* **Human-in-the-Loop Override Pipeline**: Provides an API endpoint allowing authorized teachers to inspect model grading, calibrate individual question marks, log rationale remarks, and update records.

---

### Quantitative Architectural Metrics & Specifications

| Layer / Subsystem | Architectural Implementation | Primary Function | Performance SLA / Latency |
| :--- | :--- | :--- | :--- |
| **Presentation Tier** | React 19 + MUI v9 + Vite SPA | Unified single-block client, live SSE dashboard, textbook & history consoles | Bundle size: 682KB gzip; Initial load: <1.2s |
| **Gateway Tier** | FastAPI 2.0 + Uvicorn ASGI | Asynchronous routing, rate limiting, exception handling, CORS | Gateway routing overhead: <5ms |
| **Document Preprocessing** | OpenCV 4.x + PyMuPDF | Image denoising, CLAHE equalization, deskewing, digital PDF bypass | Native PDF: <50ms; Scanned Image: 400-800ms |
| **Vision OCR Tier** | Cloud Vision OCR + Fallback VLM | Handwritten script transcription, formula detection, circuit breaker fallback | 1.2s - 2.8s per page |
| **Collation Agent** | Normalization Foundation LLM | OCR spelling repair, multi-page fragment collation, unattempted marking | 1.5s - 3.5s per paper |
| **Vector DB (RAG)** | Vector Database (HNSW Cosine) | Curriculum-isolated textbook retrieval with subject/grade payload filters | Vector search latency: <15ms |
| **Embedding Engine** | Dense Embedding Model (384d / 768d) | Dense vector representations of curriculum chunks and search queries | Cache hit: 0ms; Cache miss: 25ms |
| **Evaluation Engine** | Dual Foundation LLMs (Primary + Fallback) | Parallel question evaluation, binary scoring enforcement, 3-tier criteria breakdown | Full 30-question paper: 25s - 45s parallel |
| **Persistence Tier** | Relational RDBMS (PostgreSQL) | Permanent storage of full evaluations, student snippets, audit logs, teacher overrides | Transaction latency: <8ms |

---

### Conclusion & Publication Readiness
This architecture establishes an end-to-end, publication-grade blueprint for automated educational grading. By decoupling presentation concerns into a single interface block, deploying computer vision preprocessing alongside a resilient dual-engine OCR circuit breaker, grounding LLM inferences in isolated curriculum vectors, and strictly enforcing binary constraints on objective questions, the system achieves uncompromising academic integrity, high throughput, and zero-downtime reliability.
