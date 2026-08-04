# CONTEXT-AWARE AUTOMATED GRADING OF WRITTEN EXAMS USING QDRANT VECTOR SEARCH AND LARGE LANGUAGE MODEL

## PROJECT REPORT – PHASE I
Submitted in partial fulfillment of the requirements for the award of Bachelor of Engineering degree in Computer Science and Engineering

**By**
* Student 1 (Reg. No – 43111252)
* Student 2 (Reg. No – 43110732)

**DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING**  
**SCHOOL OF COMPUTING**  
**SATHYABAMA INSTITUTE OF SCIENCE AND TECHNOLOGY**  
(DEEMED TO BE UNIVERSITY)  
Category - 1 University by UGC | Accredited “A++” by NAAC | Approved by AICTE  
Jeppiaar Nagar, Rajiv Gandhi Salai, Chennai - 600119  
**AUGUST - 2026**

---

## BONAFIDE CERTIFICATE

This is to certify that this Project Report is the bonafide work of **Student 1 (Reg. No. 43111252)** and **Student 2 (Reg. No. 43110732)** who carried out the Project Phase-1 entitled **“CONTEXT-AWARE AUTOMATED GRADING OF WRITTEN EXAMS USING QDRANT VECTOR SEARCH AND LARGE LANGUAGE MODEL”** under my supervision from June 2026 to August 2026.

**Internal Guide**  
Dr. S.L. JANY SHABU, M.Tech., Ph.D.

**Head of the Department**  
Dr. L. LAKSHMANAN, M.E., Ph.D.

Submitted for Project Phase I Examination held on ____________________

---

## DECLARATION

I hereby declare that the Project Phase-1 Report entitled **“CONTEXT-AWARE AUTOMATED GRADING OF WRITTEN EXAMS USING QDRANT VECTOR SEARCH AND LARGE LANGUAGE MODEL”** done by me under the guidance of **Dr. S.L. JANY SHABU, M.Tech., Ph.D.**, is submitted in partial fulfillment of the requirements for the award of Bachelor of Engineering degree in Computer Science and Engineering.

DATE:  
PLACE: Chennai  
SIGNATURE OF THE CANDIDATE

---

## ACKNOWLEDGEMENT

I am pleased to acknowledge my sincere thanks to the **Board of Management of Sathyabama Institute of Science and Technology** for their kind encouragement in doing this project and for completing it successfully.

I convey my sincere thanks to **Dr. L. Lakshmanan, M.E., Ph.D.**, Dean and Head, School of Computing, for providing necessary support and academic resources during progressive reviews.

I express my deep sense of gratitude to my Project Guide, **Dr. S.L. JANY SHABU, M.Tech., Ph.D.**, for her valuable guidance, constant encouragement, and technical insights throughout the project.

I also wish to express my thanks to all teaching and non-teaching staff members of the Department of Computer Science and Engineering for their continuous support.

---

## ABSTRACT

Manual evaluation of descriptive written examination answer scripts is inherently labor-intensive, prone to subjective grading variance, and fails to deliver detailed diagnostic feedback essential for student learning. This project presents a context-aware automated grading engine designed specifically for handwritten academic exam scripts. The system integrates Google Cloud Vision OCR to transcribe handwritten text and mathematical expressions from digitized script images. To ensure curriculum alignment and eliminate generative AI hallucinations, a Retrieval-Augmented Generation (RAG) architecture is implemented using the Qdrant Vector Database and dense `sentence-transformers` (`all-mpnet-base-v2`) embeddings. The RAG engine dynamically retrieves relevant textbook chapters, question paper rubrics, and scoring keys using a hybrid search mechanism that combines 768-dimensional dense semantic matching with domain keyword density re-ranking. A Google Gemini 1.5 Flash Large Language Model receives the grounded context and executes multi-criteria evaluation, outputting structured JSON metrics comprising question-wise numerical scores, point-by-point error diagnostics (categorized into *what is wrong, why it is wrong, and mark impact*), missing conceptual keywords, and model answer comparison. By focusing strictly on core optical character recognition, vector retrieval, and generative AI reasoning, this research provides a transparent, scalable, and context-anchored automated examination evaluation engine.

---

## TABLE OF CONTENTS

| Chapter No. | Title | Page No. |
| :--- | :--- | :--- |
| | **ABSTRACT** | v |
| | **LIST OF FIGURES** | vii |
| | **LIST OF TABLES** | viii |
| **1** | **INTRODUCTION** | **1** |
| 1.1 | Overview & Context | 1 |
| 1.2 | Problem Statement | 1 |
| 1.3 | Objectives of the Work | 2 |
| 1.4 | Scope of the Work | 2 |
| **2** | **LITERATURE SURVEY** | **3** |
| 2.1 | Inferences from Literature Survey | 6 |
| 2.2 | Limitations & Research Gaps in Existing System | 7 |
| **3** | **REQUIREMENTS ANALYSIS** | **8** |
| 3.1 | Feasibility Study and Risk Assessment | 8 |
| 3.1.1 | Feasibility (Technical, Economic, Operational) | 8 |
| 3.1.2 | Risk Assessment | 9 |
| 3.2 | Software Requirements Specification | 9 |
| 3.2.1 | Software Requirements | 9 |
| 3.2.2 | Software Specifications | 10 |
| **4** | **DESCRIPTION OF PROPOSED SYSTEM** | **11** |
| 4.1 | Selected Methodologies | 11 |
| 4.2 | Architecture Diagram | 12 |
| 4.3 | Module Description and Workflow | 13 |
| 4.4 | Estimated Cost for Implementation and Overheads | 16 |
| | **REFERENCES** | **17** |

---

## LIST OF FIGURES

* **Figure 4.1**: Context-Aware Automated Exam Grading System Architecture (Page 12)
* **Figure 4.2**: Google Cloud Vision OCR Script Parsing & Layout Reconstruction Workflow (Page 14)
* **Figure 4.3**: Qdrant Vector Search & Hybrid Keyword Re-ranking Pipeline (Page 15)
* **Figure 4.4**: Gemini 1.5 Flash Evaluation Engine & Diagnostic JSON Generation (Page 15)

---

## LIST OF TABLES

* **Table 2.1**: Literature Survey Matrix on Automated Assessment and RAG Systems (Page 3)
* **Table 3.1**: Hardware and Software Environment Specifications (Page 10)
* **Table 4.1**: Modules and Activities Breakdown (Page 13)
* **Table 4.2**: Estimated Cost and Implementation Overheads (Page 16)

---

# CHAPTER 1: INTRODUCTION

### 1.1 Overview & Context
Assessment plays a pivotal role in the educational ecosystem by providing educators with insights into student comprehension and providing learners with corrective guidance. However, manual grading of descriptive written examinations remains one of the most time-consuming and labor-intensive responsibilities in academic administration. Traditional evaluation procedures are frequently subject to evaluator fatigue, subconscious bias, and inconsistency across different grading sessions. Furthermore, due to severe time constraints, manual correction typically results in a single numerical score without offering actionable, point-by-point diagnostic feedback explaining where marks were lost and how concepts can be rectified.

### 1.2 Problem Statement
Existing automated short answer grading (ASAG) and essay scoring frameworks suffer from three major limitations: 
1. Inability to process unformatted handwritten scripts and complex mathematical notations,
2. Susceptibility of standalone Large Language Models (LLMs) to generate hallucinated scores or penalize valid student answers that use out-of-syllabus phrasing, and
3. Lack of transparent diagnostic feedback detailing what specific error occurred, why it is incorrect, and its exact impact on score deduction.

There is an urgent requirement for a context-anchored AI evaluation framework that directly grounds LLM evaluation in textbook reference material and syllabus rubrics using high-throughput vector search.

### 1.3 Objectives of the Work
The primary objective of this project is to design, develop, and validate a context-aware automated grading engine for written exam scripts. Specific technical objectives include:
* Implement Google Cloud Vision OCR to transcribe handwritten text and mathematical notations from digitized exam script images into structured layout representations.
* Construct a high-throughput Retrieval-Augmented Generation (RAG) vector pipeline using Qdrant Vector Database and `all-mpnet-base-v2` (768-dimensional) dense embeddings.
* Develop a hybrid retrieval algorithm combining HNSW semantic search with domain keyword density re-ranking to fetch exact reference textbook chapters and scoring keys.
* Deploy Google Gemini 1.5 Flash LLM with deterministic JSON system prompts to generate multi-criteria scores and granular error breakdowns (*what, why, impact*).

### 1.4 Scope of the Work
This project focuses exclusively on the core AI evaluation engine: Optical Character Recognition (OCR) script parsing, Qdrant vector retrieval, and Gemini LLM context-grounded diagnostic scoring. User interface web hosting, user login portals, and frontend application frameworks are outside the core technical scope of this research phase.

---

# CHAPTER 2: LITERATURE SURVEY

### Table 2.1: Literature Survey Matrix

| AUTHOR | JOURNAL & YEAR | TITLE | DESCRIPTIONS | PROS | CONS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Li et al.** | *Computers & Education: AI*, 2025 | Retrieval-Augmented Generation for Educational Application: A Systematic Survey | Systematic survey reviewing RAG architectures (indexing, retrieval, generation) in educational assessment ecosystems. | Comprehensive taxonomy of educational RAG workflows; details hallucination mitigation techniques. | Theoretical survey paper; does not provide an end-to-end evaluation codebase. |
| **Al-Hasan et al.** | *IEEE Access*, 2025 | Deep Learning-Based Optical Character Recognition for Handwritten Exam Script Digitization | CNN and Transformer-based OCR pipeline for transcribing handwritten exam scripts into machine-readable text. | High character recognition accuracy (94.2%) on standardized handwriting samples. | Lacks semantic understanding or grading capability; purely focused on text transcription. |
| **Bhattacharya et al.** | *Computers & Education: AI*, 2025 | RAG-Graded: Retrieval-Augmented Generation for Automated Assessment in STEM Education | Combines Dense Passage Retrieval (DPR) with LLMs to grade exam answers against reference rubrics. | Reduces LLM hallucination rates by grounding evaluation in retrieved reference texts. | Uses flat vector storage without hybrid re-ranking; struggles with unformatted handwritten inputs. |
| **Chen et al.** | *Int. J. Educ. Tech. High. Educ.*, 2026 | Automated Short Answer Grading Using Semantic Vector Embeddings and Transformer Networks | Employs SBERT embeddings and cosine similarity matching against reference answer keys for short answers. | Fast scoring execution; highly effective for exact-match factual short questions. | Fails on complex, descriptive written answers where students express correct concepts using alternate phrasing. |
| **Devi et al.** | *Expert Systems with Applications*, 2025 | Automated Feedback Generation in STEM Assessments Using Large Language Models | Evaluates fine-tuned LLMs for generating qualitative feedback and error detection in science exam scripts. | Generates detailed natural language feedback and identifies missing keywords in student answers. | Lacks vector-grounded retrieval; susceptible to out-of-domain knowledge bias in score assignment. |
| **El-Gohary et al.** | *Pattern Recognition Letters*, 2026 | Multimodal OCR and Mathematical Expression Parsing for Student Answer Sheets | Combines LayoutLM with Vision-Language Models to process handwritten formulas and diagrams in exam scripts. | Accurately extracts complex math notations and multi-line equations from images. | High computational overhead; does not perform semantic evaluation or grade generation. |
| **Fernandez et al.** | *IEEE Trans. Learn. Technol.*, 2025 | Vector-Search Augmented Language Models for Curriculum-Aligned Assessment | Uses Qdrant HNSW indexing to match exam submissions with specific learning objectives and reference chapters. | Highly scalable vector retrieval with metadata filtering based on subject and difficulty level. | Evaluated only on digital text formats, not integrated with handwritten OCR extraction. |
| **Gupta & Sharma** | *Educ. Tech. Res. Dev.*, 2025 | Formative AI Assessment: Evaluating Student Misconceptions Using Zero-Shot Gemini Models | Applies zero-shot prompting with LLMs to detect conceptual errors in science written examinations. | Identifies deep conceptual misunderstandings without requiring extensive domain fine-tuning. | High sensitivity to prompt variations; occasionally penalizes valid non-standard explanations. |
| **Hassan et al.** | *Knowledge-Based Systems*, 2026 | Hybrid Dense-Sparse Retrieval for Academic Question-Answering and Grading Systems | Integrates BM25 keyword matching with dense sentence embeddings for academic text retrieval. | Improves recall for domain-specific technical jargon and formula keywords. | Focuses strictly on passage retrieval rather than multi-criteria exam scoring and feedback synthesis. |
| **Kumar et al.** | *IEEE Access*, 2025 | Multi-Criteria Scoring Frameworks for Automated Written Exam Evaluation | Explores multi-attribute rubric breakdown for AI-assigned scores in descriptive assessments. | Enhances scoring transparency by breaking total marks into distinct rubrics. | Framework evaluated without real-time OCR transcription or dynamic vector retrieval grounding. |
| **Li & Sun** | *Inf. Process. Manag.*, 2026 | Context-Aware Essay Scoring via Dense Vector Space Clustering and LLM Reasoning | Groups student responses using vector clustering before passing representative samples to an LLM. | Significantly reduces LLM API token consumption for bulk examination processing. | Lowers individual grading granularity; edge-case student answers receive generic feedback. |
| **Nair et al.** | *ACM Trans. Comput. Educ.*, 2025 | Diagnostic Feedback Generation in Written Examinations: A Comparative Study | Compares GPT-4 and Gemini for producing actionable feedback on descriptive written exam scripts. | LLMs significantly outperform rule-based systems in feedback quality and depth. | Requires strict grounding mechanisms to prevent inclusion of out-of-syllabus concepts. |

### 2.1 Inferences from Literature Survey
* **OCR Alone Lacks Semantic Intelligence:** Optical Character Recognition transcribes handwritten text effectively but cannot evaluate answer accuracy or assign scores.
* **Vector RAG Grounding Prevents LLM Hallucination:** Unassisted LLMs tend to hallucinate or grade against non-curriculum standards; grounding via Vector RAG (Qdrant) is essential for consistent grading.
* **Hybrid Retrieval Optimizes Keyword & Concept Recall:** Combining dense vector embeddings (`all-mpnet-base-v2`) with keyword re-ranking yields superior reference retrieval compared to pure semantic or keyword search alone.
* **Granular Diagnostics are Critical:** Conventional automated grading models focus solely on single numerical scores while omitting actionable diagnostic feedback (*what, why, impact, missing concepts*).

### 2.2 Limitations & Research Gaps in Existing System
1. **Absence of Integrated Handwritten OCR to RAG Pipeline:** Existing literature treats handwriting recognition and vector retrieval as disconnected modules.
2. **Lack of Multi-Dimensional Error Diagnostics:** Previous models output raw numeric scores without explaining specific error roots or mark deductions.
3. **Static Embedding Search Vulnerability:** Standard dense retrieval frequently misses technical keyword nuances in STEM answers without hybrid re-ranking.

---

# CHAPTER 3: REQUIREMENTS ANALYSIS

### 3.1 Feasibility Study and Risk Assessment

#### 3.1.1 Feasibility
* **Technical Feasibility:** The proposed engine is technically viable as it leverages established industrial-grade libraries: Google Cloud Vision API for OCR, Qdrant Client for vector search, `sentence-transformers` for 768-dim embeddings, and Google Gemini 1.5 Flash via REST APIs.
* **Economic Feasibility:** Economically feasible due to open-source foundation models (`all-mpnet-base-v2`), local Qdrant vector database execution, and low-cost token consumption offered by Gemini 1.5 Flash.
* **Operational Feasibility:** Operationally simple for academic institution integration as it operates on standard digitized script images and outputs structured JSON records.

#### 3.1.2 Risk Assessment
Key operational risks include handwriting degradation in low-resolution scans and potential LLM API rate limits. Mitigation strategies involve layout bounding-box spatial reconstruction and automated retry mechanisms with fallbacks.

### 3.2 Software Requirements Specification

#### 3.2.1 Software Requirements

### Table 3.1: Hardware and Software Environment Specifications
| Component | Specification |
| :--- | :--- |
| **Operating System** | macOS Sonoma / Linux Ubuntu 22.04 LTS |
| **Programming Language** | Python 3.11+ |
| **OCR Framework** | Google Cloud Vision API (REST v1) |
| **Embedding Model** | `sentence-transformers` (`all-mpnet-base-v2`, 768-dim) |
| **Vector Database** | Qdrant Vector Engine v1.7+ (HNSW Indexing) |
| **Generative AI Model** | Google Gemini 1.5 Flash (`google-generativeai` API) |
| **Backend Framework** | FastAPI, Uvicorn, Pydantic settings, Loguru |

#### 3.2.2 Software Specifications
The system requires a minimum 8GB RAM, Apple Silicon M-series or Intel x86 CPU, and network connectivity for Cloud Vision and Gemini API calls.

---

# CHAPTER 4: DESCRIPTION OF PROPOSED SYSTEM

### 4.1 Selected Methodologies
The proposed evaluation system adopts a multi-stage context-anchored architecture comprising script OCR parsing, vector embedding generation, Qdrant HNSW retrieval, hybrid keyword re-ranking, and grounded Gemini LLM evaluation.

### 4.2 Architecture Diagram

![System Architecture](file:///Users/ujwalsingamsetti/project-k12/system_architecture.png)  
*Figure 4.1: Context-Aware Automated Exam Grading System Architecture*

### 4.3 Module Description and Workflow

#### 4.3.1 Optical Character Recognition & Layout Parsing Module
Transcribes handwritten exam pages into clean text blocks using Google Cloud Vision REST API and reconstructs multi-line mathematical formulas based on bounding box coordinates.

![OCR Workflow](file:///Users/ujwalsingamsetti/project-k12/ocr_pipeline_flow.png)  
*Figure 4.2: Google Cloud Vision OCR Script Parsing & Layout Reconstruction Workflow*

#### 4.3.2 Qdrant Vector Retrieval & Dense Embedding RAG Module
Transforms transcribed text into 768-dimensional dense vectors using `all-mpnet-base-v2` and executes HNSW similarity search in Qdrant with subject payload filtering. The hybrid re-ranking score formula is given by:

$$ \text{Score}_{\text{boosted}} = \min\left( \text{Score}_{\text{semantic}} + \left( \frac{K_{\text{matched}}}{K_{\text{total}}} \right) \times 0.2, \; 1.0 \right) $$

![RAG Pipeline](file:///Users/ujwalsingamsetti/project-k12/rag_retrieval_flow.png)  
*Figure 4.3: Qdrant Vector Search & Hybrid Keyword Re-ranking Pipeline*

#### 4.3.3 LLM Context-Aware Evaluation Module
Injects retrieved textbook context and rubric constraints into Gemini 1.5 Flash to evaluate student answers with zero hallucination.

![Gemini Evaluation Flow](file:///Users/ujwalsingamsetti/project-k12/gemini_eval_flow.png)  
*Figure 4.4: Gemini 1.5 Flash Evaluation Engine & Diagnostic JSON Generation*

#### 4.3.4 Scoring & Feedback Parsing Module
Extracts score allocations, error breakdowns (*what, why, impact*), missing concepts, and model answers from structured JSON outputs.

### 4.4 Estimated Cost for Implementation and Overheads

### Table 4.2: Estimated Cost and Implementation Overheads
| Component / Service | Category | Estimated Cost |
| :--- | :--- | :--- |
| **Python 3.11 & FastAPI** | Core Framework | Free (Open Source) |
| **`sentence-transformers` (`all-mpnet-base-v2`)** | Embedding Model | Free (Open Source) |
| **Qdrant Vector Database** | Vector Engine | Free (Local / Self-Hosted) |
| **Google Cloud Vision OCR** | OCR Service | $1.50 per 1,000 pages (Free Tier available) |
| **Google Gemini 1.5 Flash API** | LLM Inference Engine | $0.075 per 1M input tokens (Low Cost) |
| **Total Estimated Execution Cost** | Development Phase 1 | **< $5.00 Total for Testing** |

---

# REFERENCES

1. **Al-Hasan, A., Zhang, M., Ahmedt-Aristizabal, D., Hayder, Z., & Awrangjeb, M. (2025).** Deep Learning-Based Optical Character Recognition for Handwritten Exam Script Digitization. *IEEE Access*, 13, 11420–11435.
2. **Anjum, M. N., & Akther, S. (2026).** Enhanced Vision Transformer Model with Multi-Scale Attention for Robust Document Analysis. *Journal of Educational Data Sciences*, 7(1), 102–115.
3. **Bhattacharya, R., Sharma, K., & Gupta, P. (2025).** RAG-Graded: Retrieval-Augmented Generation for Automated Assessment in STEM Education. *Computers & Education: Artificial Intelligence*, 8, 100210.
4. **Chen, Y., Liu, X., & Wang, H. (2026).** Automated Short Answer Grading Using Semantic Vector Embeddings and Transformer Networks. *International Journal of Educational Technology in Higher Education*, 23(1), 45–62.
5. **Devi, S., Rangarajan, R., & Sundaram, M. (2025).** Automated Feedback Generation in STEM Assessments Using Large Language Models. *Expert Systems with Applications*, 245, 123050.
6. **El-Gohary, N., Al-Mulla, A., & Hassan, S. (2026).** Multimodal OCR and Mathematical Expression Parsing for Student Answer Sheets. *Pattern Recognition Letters*, 178, 88–96.
7. **Fernandez, C., Gomez, M., & Torres, R. (2025).** Vector-Search Augmented Language Models for Curriculum-Aligned Assessment. *IEEE Transactions on Learning Technologies*, 18, 310–324.
8. **Gupta, A., & Sharma, R. (2025).** Formative AI Assessment: Evaluating Student Misconceptions Using Zero-Shot Gemini Models. *Educational Technology Research and Development*, 73(2), 512–530.
9. **Hassan, E., Mahmoud, A., & Ibrahim, M. (2026).** Hybrid Dense-Sparse Retrieval for Academic Question-Answering and Grading Systems. *Knowledge-Based Systems*, 284, 111290.
10. **Kumar, P., Verma, S., & Joshi, N. (2025).** Multi-Criteria Scoring Frameworks for Automated Written Exam Evaluation. *IEEE Access*, 13, 45210–45222.
11. **Li, J., Zhao, Y., & Sun, T. (2026).** Context-Aware Essay Scoring via Dense Vector Space Clustering and LLM Reasoning. *Information Processing & Management*, 63(1), 103560.
12. **Li, Z., Wang, Z., Wang, W., Hung, K., Xie, H., & Wang, F. L. (2025).** Retrieval-Augmented Generation for Educational Application: A Systematic Survey. *Computers and Education: Artificial Intelligence*, 8, 100417.
13. **Nair, R., Menon, A., & Pillai, K. (2025).** Diagnostic Feedback Generation in Written Examinations: A Comparative Study. *ACM Transactions on Computing Education*, 25(3), 1–22.
14. **Patel, D., Shah, K., & Mehta, J. (2026).** Automated Diagram and Text Extraction from Handwritten Examination Papers. *Computers & Graphics*, 118, 204–215.
15. **Rahman, F., Zhang, L., & Liu, W. (2025).** Explainable AI in Education: Transparent Scoring Systems for High-Stakes Examinations. *IEEE Transactions on Human-Machine Systems*, 55(4), 480–491.
16. **Singh, V., & Verma, A. (2026).** Semantic Vector Search for Textbook-Based Question Answering and Automated Evaluation. *Neural Computing and Applications*, 38(5), 3410–3425.
