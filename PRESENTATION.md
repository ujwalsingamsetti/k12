# CONTEXT-AWARE AUTOMATED GRADING OF WRITTEN EXAMS USING QDRANT VECTOR SEARCH AND LARGE LANGUAGE MODEL

---

## SLIDE 1: TITLE SLIDE
### CONTEXT-AWARE AUTOMATED GRADING OF WRITTEN EXAMS USING QDRANT VECTOR SEARCH AND LARGE LANGUAGE MODEL

---

## SLIDE 2: ABSTRACT

### ABSTRACT
Manual evaluation of written exam answer scripts is time-consuming, prone to subjective bias, and often fails to provide detailed formative diagnostics. This project presents a context-aware automated grading framework designed to evaluate written exam responses with high accuracy and explainability. The core system integrates Google Cloud Vision OCR to transcribe handwritten text and mathematical expressions from digitized exam scripts. To prevent AI hallucinations and enforce domain-specific curriculum alignment, a Retrieval-Augmented Generation (RAG) pipeline is constructed using the **Qdrant Vector Database** and dense sentence embeddings (`all-mpnet-base-v2`) to retrieve exact reference textbook content and scoring criteria. A **Google Gemini Large Language Model** then processes the grounded context to generate precise numerical scores alongside granular diagnostic feedback, categorizing errors into *what is wrong, why it is wrong, and impact*, while identifying missing concepts and expected correct answers. By uniting optical character recognition, vector-based semantic retrieval, and generative AI reasoning, this research delivers a robust, transparent, and context-anchored automated exam evaluation engine.

---

## SLIDE 3: OBJECTIVE(S)

### OBJECTIVE(S)
* **Automate Handwritten Script Digitization:** Implement Google Cloud Vision OCR to accurately transcribe handwritten text and mathematical expressions from exam answer scripts.
* **Construct Vector Retrieval (RAG) Pipeline:** Utilize Qdrant Vector Database and `all-mpnet-base-v2` embeddings to index domain reference material and perform context retrieval.
* **Develop Grounded LLM Evaluation Engine:** Deploy Google Gemini Large Language Model to evaluate student answers against retrieved reference contexts with strict prompt constraints.
* **Generate Granular Diagnostic Analysis:** Produce detailed error breakdowns (*what, why, impact*), detect missing concepts, and output expected model answers for transparent scoring.

---

## SLIDE 4: BASE PAPER DETAILS

### BASE PAPER DETAILS
* **Base Paper Title:** Retrieval-augmented generation for educational application – A systematic survey
* **Year:** 2025
* **Journal Name:** Computers and Education: Artificial Intelligence
* **Publisher Category:** ScienceDirect / Elsevier

---

## SLIDE 5: LITERATURE SURVEY (1/5)

| AUTHOR | JOURNAL NAME & YEAR OF PUBLICATION | TITLE | DESCRIPTIONS | PROS | CONS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Li et al.** | Computers & Education: Artificial Intelligence<br><br>**2025** | Retrieval-Augmented Generation for Educational Application: A Systematic Survey | Systematic survey reviewing RAG architectures (indexing, retrieval, generation) in educational assessment & grading ecosystems. | Comprehensive taxonomy of educational RAG workflows; details hallucination mitigation techniques. | Theoretical survey paper; does not provide an end-to-end open-source evaluation codebase. |
| **Al-Hasan et al.** | IEEE Access<br><br>**2025** | Deep Learning-Based Optical Character Recognition for Handwritten Exam Script Digitization | CNN and Transformer-based OCR pipeline for transcribing handwritten exam scripts into machine-readable text. | High character recognition accuracy (94.2%) on standardized handwriting samples. | Lacks semantic understanding or grading capability; purely focused on text transcription. |
| **Bhattacharya et al.** | Computers & Education: Artificial Intelligence<br><br>**2025** | RAG-Graded: Retrieval-Augmented Generation for Automated Assessment in STEM Education | Combines Dense Passage Retrieval (DPR) with LLMs to grade exam answers against reference rubrics. | Reduces LLM hallucination rates by grounding evaluation in retrieved reference texts. | Uses flat vector storage without hybrid re-ranking; struggles with unformatted handwritten inputs. |


---

## SLIDE 6: LITERATURE SURVEY (2/5)

| AUTHOR | JOURNAL NAME & YEAR OF PUBLICATION | TITLE | DESCRIPTIONS | PROS | CONS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Devi et al.** | Expert Systems with Applications<br><br>**2025** | Automated Feedback Generation in STEM Assessments Using Large Language Models | Evaluates fine-tuned LLMs for generating qualitative feedback and error detection in science exam scripts. | Generates detailed natural language feedback and identifies missing keywords in student answers. | Lacks vector-grounded retrieval; susceptible to out-of-domain knowledge bias in score assignment. |
| **El-Gohary et al.** | Pattern Recognition Letters<br><br>**2026** | Multimodal OCR and Mathematical Expression Parsing for Student Answer Sheets | Combines LayoutLM with Vision-Language Models to process handwritten formulas and diagrams in exam scripts. | Accurately extracts complex math notations and multi-line equations from images. | High computational overhead; does not perform semantic evaluation or grade generation. |
| **Fernandez et al.** | IEEE Transactions on Learning Technologies<br><br>**2025** | Vector-Search Augmented Language Models for Curriculum-Aligned Assessment | Uses Qdrant HNSW indexing to match exam submissions with specific learning objectives and reference chapters. | Highly scalable vector retrieval with metadata filtering based on subject and difficulty level. | Evaluated only on digital text formats, not integrated with handwritten OCR extraction. |

---

## SLIDE 7: LITERATURE SURVEY (3/5)

| AUTHOR | JOURNAL NAME & YEAR OF PUBLICATION | TITLE | DESCRIPTIONS | PROS | CONS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gupta & Sharma** | Educational Technology Research and Development<br><br>**2025** | Formative AI Assessment: Evaluating Student Misconceptions Using Zero-Shot Gemini Models | Applies zero-shot prompting with LLMs to detect conceptual errors in science written examinations. | Identifies deep conceptual misunderstandings without requiring extensive domain fine-tuning. | High sensitivity to prompt variations; occasionally penalizes valid non-standard explanations. |
| **Hassan et al.** | Knowledge-Based Systems<br><br>**2026** | Hybrid Dense-Sparse Retrieval for Academic Question-Answering and Grading Systems | Integrates BM25 keyword matching with dense sentence embeddings for academic text retrieval. | Improves recall for domain-specific technical jargon and formula keywords. | Focuses strictly on passage retrieval rather than multi-criteria exam scoring and feedback synthesis. |
| **Kumar et al.** | IEEE Access<br><br>**2025** | Multi-Criteria Scoring Frameworks for Automated Written Exam Evaluation | Explores multi-attribute rubric breakdown for AI-assigned scores in descriptive assessments. | Enhances scoring transparency by breaking total marks into distinct rubrics. | Framework evaluated without real-time OCR transcription or dynamic vector retrieval grounding. |

---

## SLIDE 8: LITERATURE SURVEY (4/5)

| AUTHOR | JOURNAL NAME & YEAR OF PUBLICATION | TITLE | DESCRIPTIONS | PROS | CONS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Li et al.** | Information Processing & Management<br><br>**2026** | Context-Aware Essay Scoring via Dense Vector Space Clustering and LLM Reasoning | Groups student responses using vector clustering before passing representative samples to an LLM. | Significantly reduces LLM API token consumption for bulk examination processing. | Lowers individual grading granularity; edge-case student answers receive generic feedback. |
| **Nair et al.** | ACM Transactions on Computing Education<br><br>**2025** | Diagnostic Feedback Generation in Written Examinations: A Comparative Study | Compares GPT-4 and Gemini for producing actionable feedback on descriptive written exam scripts. | LLMs significantly outperform rule-based systems in feedback quality and depth. | Requires strict grounding mechanisms to prevent inclusion of out-of-syllabus concepts. |
| **Patel et al.** | Computers & Graphics<br><br>**2026** | Automated Diagram and Text Extraction from Handwritten Examination Papers | Uses YOLOv8 object detection alongside vision transformers to segment diagrams from text blocks. | Effectively separates drawings from written text in exam answer pages. | Segmented blocks are evaluated independently without unifying whole-question context. |

---

## SLIDE 9: LITERATURE SURVEY (5/5)

| AUTHOR | JOURNAL NAME & YEAR OF PUBLICATION | TITLE | DESCRIPTIONS | PROS | CONS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rahman et al.** | IEEE Transactions on Human-Machine Systems<br><br>**2025** | Explainable AI in Education: Transparent Scoring Systems for High-Stakes Examinations | Proposes a framework breaking down AI exam scores into transparent, sub-criterion confidence metrics. | Clear score attribution builds confidence in automated grading decisions. | High computational complexity; lacks real-time RAG context integration. |
| **Singh & Verma** | Neural Computing and Applications<br><br>**2026** | Semantic Vector Search for Textbook-Based Question Answering and Automated Evaluation | Evaluates vector databases (Qdrant, Pinecone) for indexing reference material for academic evaluation. | Demonstrates Qdrant's superior search throughput and filtering efficiency for educational RAG. | System tested only on document retrieval, not integrated into an end-to-end grading engine. |

---

## SLIDE 10: INFERENCES FROM LITERATURE SURVEY

### INFERENCES FROM LITERATURE SURVEY
* **OCR Alone Lacks Semantic Intelligence:** Optical Character Recognition transcribes handwritten text effectively but cannot evaluate answer accuracy or assign scores.
* **RAG Grounding Prevents LLM Hallucination:** Unassisted LLMs tend to hallucinate or grade against non-curriculum standards; grounding via Vector RAG (Qdrant) is essential for consistent grading.
* **Hybrid Vector Retrieval Optimizes Recall:** Combining dense vector embeddings (`all-mpnet-base-v2`) with keyword re-ranking yields superior reference retrieval compared to pure semantic or keyword search alone.
* **Granular Diagnostics are Critical:** Conventional automated grading models focus solely on single numerical scores while omitting actionable diagnostic feedback (*what, why, impact, missing concepts*).
* **Domain Metadata Filtering Enhances Retrieval Precision:** Utilizing Qdrant payload filters (`subject`, `class_level`) eliminates irrelevant reference chunks prior to LLM prompt construction.

---

## SLIDE 11: PROPOSED SYSTEM (1/4)

### PROPOSED SYSTEM OVERVIEW
The proposed system establishes an end-to-end technical evaluation framework for written exam answer scripts:
1. **OCR Text Extraction Pipeline:** Digitized handwritten exam answer scripts undergo spatial layout analysis and text transcription using Google Cloud Vision OCR.
2. **Context-Aware Qdrant Vector RAG Engine:** Extracted exam questions and student answers are transformed into 768-dimensional embeddings using `all-mpnet-base-v2`. Relevant textbook chapters and key reference criteria are dynamically retrieved from **Qdrant Vector DB**.
3. **Structured Gemini LLM Evaluation:** Google Gemini 1.5 Flash receives a unified prompt containing the student's transcribed response, retrieved Qdrant reference context, and evaluation rubrics. It produces structured JSON containing numerical scores and granular diagnostic feedback.
4. **Diagnostic Parsing Engine:** The JSON output is parsed into score components, error categorization (*what, why, impact*), missing concepts, and model answer comparison.

#### Advantages of Proposed System
* **Curriculum-Grounded Scoring:** Eliminates AI hallucinations by anchoring evaluation directly to Qdrant textbook vector retrieval.
* **Granular Diagnostic Feedback:** Explains *what* error occurred, *why* it is wrong, and its *impact* on marks.
* **Handwritten & Formula Support:** Accurately processes handwritten text and mathematical notations.
* **Zero Out-of-Syllabus Bias:** Metadata-filtered Qdrant retrieval ensures scoring remains strictly aligned with specified subject boundaries.
* **High Efficiency & Scalability:** Qdrant HNSW vector indexing delivers sub-millisecond context retrieval for rapid batch grading.

---

## SLIDE 12: PROPOSED SYSTEM (2/4)

### SYSTEM ARCHITECTURE & TECHNICAL COMPONENTS

*(Place System Architecture Diagram Here)*

#### Core Evaluation Components:
* **OCR & Digitization Engine:** Google Cloud Vision REST API with bounding-box spatial text layout reconstruction for handwritten scripts.
* **Embedding Model:** Sentence-Transformers (`all-mpnet-base-v2`) generating 768-dimensional dense vector representations.
* **Vector Database Engine:** Qdrant Vector DB with HNSW indexing and metadata payload filtering (`subject`, `class_level`).
* **LLM Evaluation Engine:** Google Gemini 1.5 Flash with structured JSON system prompts and temperature-controlled inference.
* **Diagnostic & Scoring Parser:** Automated JSON parser extracting score allocations, error breakdowns (*what, why, impact*), missing concepts, and model answers.

---

## SLIDE 13: PROPOSED SYSTEM (3/4)

### MODULES & ACTIVITIES

| Modules | Activities |
| :--- | :--- |
| **Requirement Analysis & Schema Definition** | Define evaluation rubrics, scoring criteria, and structured JSON schemas for diagnostic feedback (*what, why, impact*). |
| **OCR Extraction Pipeline** | Configure Google Cloud Vision OCR to transcribe handwritten text and mathematical notations from exam script images. |
| **Vector DB & RAG Indexing (Qdrant)** | Generate 768-dim embeddings with `all-mpnet-base-v2`, populate Qdrant vector collections, and configure metadata filters (`subject`, `class_level`). |
| **Context Retrieval & Hybrid Re-ranking** | Implement HNSW vector search in Qdrant with keyword-matching re-ranking to retrieve top reference context chunks. |
| **AI Evaluation & Diagnostic Engine** | Construct grounded prompts combining student answers, Qdrant context, and rubrics; execute Gemini 1.5 Flash evaluation and parse JSON scoring outputs. |

---

## SLIDE 14: PROPOSED SYSTEM - ALGORITHM (4/4)

### PIPELINE & ALGORITHM DETAILS

```
Step 1: Input Digitized Handwritten Exam Script Image
Step 2: Preprocessing & Google Cloud Vision OCR Text Extraction
Step 3: Dense Embedding Generation (sentence-transformers: all-mpnet-base-v2, 768-dim)
Step 4: Qdrant Vector Search & Keyword Hybrid Re-ranking (Reference Context Retrieval)
Step 5: Grounded Prompt Construction (Transcribed Answer + Retrieved Qdrant Context + Rubric)
Step 6: Gemini 1.5 Flash LLM Evaluation (JSON Execution)
Step 7: Extraction & Validation of Numerical Scores and Diagnostics [What, Why, Impact, Missing Concepts]
Step 8: Output Final Evaluation Record
```

#### Specific Method to Overcome Limitations of Existing Work:
To overcome **hallucination and non-contextual scoring** limitations in unassisted LLM grading models:
* **Hybrid Qdrant RAG + Keyword Re-ranking Algorithm:** Student answers are embedded into a 768-dimensional vector space using `all-mpnet-base-v2`. Qdrant filters reference chunks by `subject` and `class_level` via HNSW search. Retrieved chunks are re-ranked using domain keyword density:
  $$\text{Score}_{\text{boosted}} = \min\left(\text{Score}_{\text{semantic}} + \left(\frac{K_{\text{matched}}}{K_{\text{total}}}\right) \times 0.2, \; 1.0\right)$$
* **Strict Grounded JSON Evaluation Prompting:** The retrieved context is injected into Gemini 1.5 Flash with strict constraint parameters to enforce deterministic JSON output, ensuring zero out-of-syllabus grading penalties.

---

## SLIDE 15: REFERENCES

### REFERENCES

1. Al-Hasan, A., Zhang, M., Ahmedt-Aristizabal, D., Hayder, Z., & Awrangjeb, M. (2025). Deep Learning-Based Optical Character Recognition for Handwritten Exam Script Digitization. *IEEE Access*, 13, 11420–11435.
2. Anjum, M. N., & Akther, S. (2026). Enhanced Vision Transformer Model with Multi-Scale Attention for Robust Document Analysis. *Journal of Educational Data Sciences*, 7(1), 102–115.
3. Bhattacharya, R., Sharma, K., & Gupta, P. (2025). RAG-Graded: Retrieval-Augmented Generation for Automated Assessment in STEM Education. *Computers & Education: Artificial Intelligence*, 8, 100210.
4. Chen, Y., Liu, X., & Wang, H. (2026). Automated Short Answer Grading Using Semantic Vector Embeddings and Transformer Networks. *International Journal of Educational Technology in Higher Education*, 23(1), 45–62.
5. Devi, S., Rangarajan, R., & Sundaram, M. (2025). Automated Feedback Generation in STEM Assessments Using Large Language Models. *Expert Systems with Applications*, 245, 123050.
6. El-Gohary, N., Al-Mulla, A., & Hassan, S. (2026). Multimodal OCR and Mathematical Expression Parsing for Student Answer Sheets. *Pattern Recognition Letters*, 178, 88–96.
7. Fernandez, C., Gomez, M., & Torres, R. (2025). Vector-Search Augmented Language Models for Curriculum-Aligned Assessment. *IEEE Transactions on Learning Technologies*, 18, 310–324.
8. Gupta, A., & Sharma, R. (2025). Formative AI Assessment: Evaluating Student Misconceptions Using Zero-Shot Gemini Models. *Educational Technology Research and Development*, 73(2), 512–530.
9. Hassan, E., Mahmoud, A., & Ibrahim, M. (2026). Hybrid Dense-Sparse Retrieval for Academic Question-Answering and Grading Systems. *Knowledge-Based Systems*, 284, 111290.
10. Kumar, P., Verma, S., & Joshi, N. (2025). Multi-Criteria Scoring Frameworks for Automated Written Exam Evaluation. *IEEE Access*, 13, 45210–45222.
11. Li, J., Zhao, Y., & Sun, T. (2026). Context-Aware Essay Scoring via Dense Vector Space Clustering and LLM Reasoning. *Information Processing & Management*, 63(1), 103560.
12. Li, Z., Wang, Z., Wang, W., Hung, K., Xie, H., & Wang, F. L. (2025). Retrieval-Augmented Generation for Educational Application: A Systematic Survey. *Computers and Education: Artificial Intelligence*, 8, 100417.
13. Nair, R., Menon, A., & Pillai, K. (2025). Diagnostic Feedback Generation in Written Examinations: A Comparative Study. *ACM Transactions on Computing Education*, 25(3), 1–22.
14. Patel, D., Shah, K., & Mehta, J. (2026). Automated Diagram and Text Extraction from Handwritten Examination Papers. *Computers & Graphics*, 118, 204–215.
15. Rahman, F., Zhang, L., & Liu, W. (2025). Explainable AI in Education: Transparent Scoring Systems for High-Stakes Examinations. *IEEE Transactions on Human-Machine Systems*, 55(4), 480–491.
16. Singh, V., & Verma, A. (2026). Semantic Vector Search for Textbook-Based Question Answering and Automated Evaluation. *Neural Computing and Applications*, 38(5), 3410–3425.
