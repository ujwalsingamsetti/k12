"""Structured Data Module for Institutional Capstone Report:
Context-Aware Automated Grading of Written Exams Using Qdrant Vector Search and Large Language Model.
"""

import os

# Metadata & Configuration
# Option 1: SINGAMSETTI UJWAL (42111241) & SOMISETTY CHAKRADHAR (42111259) [Default from Ai Cancer Prediction original report]
# Option 2: JASWANTH S (43111252) & UJWAL SINGAMSETTI (43110732) [From jaswanth_phase1.pdf & KG-RAG]
STUDENT_CONFIG = 1

if STUDENT_CONFIG == 1:
    STUDENT_1_NAME = "SINGAMSETTI UJWAL"
    STUDENT_1_REG = "42111241"
    STUDENT_2_NAME = "SOMISETTY CHAKRADHAR"
    STUDENT_2_REG = "42111259"
else:
    STUDENT_1_NAME = "JASWANTH S"
    STUDENT_1_REG = "43111252"
    STUDENT_2_NAME = "UJWAL SINGAMSETTI"
    STUDENT_2_REG = "43110732"

GUIDE_NAME = "Dr. S.L. JANY SHABU, M.Tech., Ph.D."
GUIDE_DESIGNATION = "Associate Professor"
HOD_NAME = "Dr. L. LAKSHMANAN, M.E., Ph.D."
HOD_DESIGNATION = "Dean and Head, School of Computing"
DEPARTMENT_NAME = "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING"
SCHOOL_NAME = "SCHOOL OF COMPUTING"
UNIVERSITY_NAME = "SATHYABAMA INSTITUTE OF SCIENCE AND TECHNOLOGY"
UNIVERSITY_SUB = "(DEEMED TO BE UNIVERSITY)"
UNIVERSITY_ACCREDITATION = "CATEGORY - 1 UNIVERSITY BY UGC\nAccredited \u201cA++\u201d by NAAC | Approved by AICTE"
LOCATION = "JEPPIAAR NAGAR, RAJIV GANDHI SALAI, CHENNAI - 600119"
MONTH_YEAR = "OCTOBER - 2026"
PROJECT_TITLE = "CONTEXT-AWARE AUTOMATED GRADING OF WRITTEN EXAMS USING QDRANT VECTOR SEARCH AND LARGE LANGUAGE MODEL"

CERT_TEXT = (
    f"This is to certify that this Project Report is the bonafide work of "
    f"<b>{STUDENT_1_NAME} (Reg. No. {STUDENT_1_REG})</b> and <b>{STUDENT_2_NAME} (Reg. No. {STUDENT_2_REG})</b> "
    f"who carried out the project entitled <b>\u201c{PROJECT_TITLE}\u201d</b> "
    f"under my supervision from June 2026 to October 2026 in partial fulfillment of the requirements "
    f"for the award of Bachelor of Engineering degree in Computer Science and Engineering."
)

DECL_TEXT = (
    f"We, <b>{STUDENT_1_NAME} (Reg. No. {STUDENT_1_REG})</b> and <b>{STUDENT_2_NAME} (Reg. No. {STUDENT_2_REG})</b>, "
    f"hereby declare that the Project Report entitled <b>\u201c{PROJECT_TITLE}\u201d</b> done by us "
    f"under the guidance of <b>{GUIDE_NAME}</b>, {GUIDE_DESIGNATION}, Department of Computer Science "
    f"and Engineering, is submitted in partial fulfillment of the requirements for the award of Bachelor of Engineering "
    f"degree in Computer Science and Engineering. We further declare that this report has not previously formed the basis "
    f"for the award of any degree, diploma, associateship, fellowship, or other similar title to any candidate in any university or institution."
)

ACK_PARAS = [
    f"We are pleased to acknowledge our sincere thanks to the Board of Management of <b>{UNIVERSITY_NAME}</b> for their kind encouragement in carrying out this project and for providing state-of-the-art computational infrastructure to complete this work successfully.",
    f"We convey our heartfelt thanks to <b>{HOD_NAME}</b>, {HOD_DESIGNATION}, for providing us with necessary laboratory resources, technical advice, and academic support throughout the progressive reviews.",
    f"We express our deepest sense of gratitude to our Project Guide <b>{GUIDE_NAME}</b>, {GUIDE_DESIGNATION}, Department of Computer Science and Engineering, for her invaluable guidance, rigorous technical critique, and constant encouragement throughout the formulation, architecture, and empirical validation of our context-aware automated grading engine.",
    "We also extend our sincere appreciation to all Teaching and Non-Teaching staff members of the Department of Computer Science and Engineering, as well as our parents and peers, whose continuous cooperation and moral support enabled the successful fruition of this engineering capstone project."
]

ABSTRACT_TEXT = (
    "Manual evaluation of descriptive written examination answer scripts in education is inherently "
    "labor-intensive, vulnerable to subjective grader variance, and structurally incapable of providing "
    "timely diagnostic feedback for student learning. While Large Language Models (LLMs) offer promising "
    "capabilities for automated scoring, standard generative models suffer from domain hallucinations, "
    "penalize valid answers that deviate lexically from training weights, and lack board-specific rubric awareness. "
    "To resolve these deficiencies, this project presents a context-aware automated grading engine engineered "
    "specifically for handwritten academic exam scripts. The system integrates Google Cloud Vision OCR to transcribe "
    "handwriting and mathematical formulas into geometrically clustered text blocks. To eliminate hallucinations "
    "and enforce curricular fidelity, a Retrieval-Augmented Generation (RAG) architecture is implemented using the "
    "Qdrant Vector Database coupled with dense sentence-transformers (all-mpnet-base-v2) 768-dimensional embeddings "
    "and hybrid keyword density re-ranking. A Google Gemini 1.5 Flash model evaluates answers under deterministic "
    "JSON schemas, delivering question-wise numerical scores, a three-part diagnostic error breakdown, and missing "
    "conceptual keywords, establishing a reliable, transparent, and scalable academic assessment platform."
)

KEYWORDS_TEXT = "Automated Exam Grading, Large Language Models (LLM), Retrieval-Augmented Generation (RAG), Qdrant Vector Database, Optical Character Recognition (OCR), Google Cloud Vision, Gemini 1.5 Flash, Hybrid Keyword Re-ranking, Formative Assessment."

ABBREVIATIONS = [
    ("AI", "Artificial Intelligence"),
    ("ANN", "Approximate Nearest Neighbor"),
    ("API", "Application Programming Interface"),
    ("BERT", "Bidirectional Encoder Representations from Transformers"),
    ("BLEU", "Bilingual Evaluation Understudy"),
    ("CBSE", "Central Board of Secondary Education"),
    ("CDN", "Content Delivery Network"),
    ("CNN", "Convolutional Neural Network"),
    ("CoT", "Chain-of-Thought (Reasoning Prompting Paradigm)"),
    ("CPU", "Central Processing Unit"),
    ("CSV", "Comma-Separated Values"),
    ("DB", "Database"),
    ("DDL", "Data Definition Language"),
    ("EDGAR", "Electronic Data Gathering, Analysis, and Retrieval"),
    ("GPU", "Graphics Processing Unit"),
    ("HNSW", "Hierarchical Navigable Small World (Vector Graph Index)"),
    ("HTTP", "Hypertext Transfer Protocol"),
    ("IEEE", "Institute of Electrical and Electronics Engineers"),
    ("IQR", "Interquartile Range"),
    ("JSON", "JavaScript Object Notation"),
    ("K12", "Kindergarten through 12th Grade Primary and Secondary Education"),
    ("LLM", "Large Language Model"),
    ("LRU", "Least Recently Used (Memory Cache Eviction Policy)"),
    ("ML", "Machine Learning"),
    ("NLP", "Natural Language Processing"),
    ("OCR", "Optical Character Recognition"),
    ("ORM", "Object-Relational Mapping"),
    ("PDF", "Portable Document Format"),
    ("QWEN", "Question-Wise Evaluation Network"),
    ("RAG", "Retrieval-Augmented Generation"),
    ("RAM", "Random Access Memory"),
    ("REST", "Representational State Transfer"),
    ("RLHF", "Reinforcement Learning from Human Feedback"),
    ("ROUGE", "Recall-Oriented Understudy for Gisting Evaluation"),
    ("RPS", "Requests Per Second"),
    ("UI", "User Interface")
]

TOC_PAGE_1 = [
    ("", "ABSTRACT", "v", True),
    ("", "LIST OF ABBREVIATIONS", "viii", True),
    ("", "LIST OF FIGURES", "ix", True),
    ("", "LIST OF TABLES", "x", True),
    ("1", "INTRODUCTION", "1", True),
    ("1.1", "Background & Motivation", "1", False),
    ("1.2", "Problem Domain Failure Analysis of Naive LLM Grading", "3", False),
    ("1.3", "Paradigm Comparison: Existing vs. Proposed System", "4", False),
    ("1.4", "Formal Problem Statement & Mathematical Definitions", "4", False),
    ("1.5", "Concrete Technical Contributions of the Investigation", "5", False),
    ("1.6", "Organization of the Report", "5", False),
    ("2", "LITERATURE SURVEY", "6", True),
    ("2.1", "Theoretical Foundations of Automated Assessment & Retrieval", "6", False),
    ("2.2", "Literature Review Matrix (14 Landmark Papers)", "7", False),
    ("2.3", "Deep Dive Benchmark Against Base Paper (EduEval Baseline)", "8", False),
    ("2.4", "Computational Complexity Analysis", "8", False),
    ("2.5", "Research Gaps Identified in Existing Literature", "9", False),
    ("2.6", "Strategic Architectural Advantages of Proposed System", "9", False),
    ("3", "AIM AND SCOPE OF THE PRESENT INVESTIGATION", "10", True),
    ("3.1", "Aim of the Investigation", "10", False),
    ("3.2", "Specific Research Aims & Technical Hypotheses", "10", False),
    ("3.3", "Scope of Investigation (Inclusions, Exclusions, Assumptions)", "10", False),
    ("3.4", "Target User Groups & Industrial Operational Scenarios", "11", False),
    ("3.5", "System Feasibility Study & Risk Assessment", "11", False),
    ("3.6", "Resiliency, Circuit Breakers & Graceful Degradation", "11", False),
    ("3.7", "Hardware, Operating System, and Software Stack Specifications", "12", False)
]

TOC_PAGE_2 = [
    ("4", "MATERIALS AND METHODS; ALGORITHMS USED", "13", True),
    ("4.1", "Master System Architecture Blueprint", "13", False),
    ("4.2", "Module 1: Ingestion & OCR Preprocessing Pipeline", "13", False),
    ("4.3", "Module 2: Data Hygiene & Spatial Bounding-Box Layout Reconstruction", "14", False),
    ("4.4", "Module 3: Relational Schema & Qdrant HNSW Vector Optimization", "14", False),
    ("4.5", "Module 4: Autonomous Core Evaluation Agent & Prompt State Machine", "16", False),
    ("4.6", "Module 5: Concurrent Processing & Keyword Density Re-ranking", "17", False),
    ("4.7", "Module 6: Output Synthesis & Diagnostic Error Parsing", "18", False),
    ("4.8", "Module 7: Global Multi-Page Answer Collation & Mathematical Formulations", "19", False),
    ("4.9", "System Operational Cost Analysis & Infrastructure Profiling", "19", False),
    ("4.10", "Client Web Architecture & Real-Time Telemetry Flow", "20", False),
    ("5", "RESULTS AND DISCUSSION, PERFORMANCE ANALYSIS", "21", True),
    ("5.1", "Experimental Setup & Evaluation Benchmark Datasets", "21", False),
    ("5.2", "Core Metric Accuracy Benchmark across Question Complexities", "21", False),
    ("5.3", "In-Depth Step-by-Step Empirical Query Traces (3 Qualitative Traces)", "21", False),
    ("5.4", "Retrieval Precision, Faithfulness & Hallucination Suppression", "22", False),
    ("5.5", "Systematic Component Ablation Study", "22", False),
    ("5.6", "Hyperparameter Sensitivity Tuning & Pareto Frontier Analysis", "23", False),
    ("5.7", "End-to-End Execution Latency Telemetry Waterfall Breakdown", "23", False),
    ("5.8", "Scalability & Stress Testing Under High Concurrency", "23", False),
    ("5.9", "Robustness Analysis: Noise, Typos, and Data Dropout", "24", False),
    ("5.10", "Industry Framework Benchmark Comparison", "24", False),
    ("5.11", "Real-World Enterprise Production Case Study", "25", False),
    ("5.12", "Error Propagation Analysis Across Retrieval & Grading Tiers", "25", False),
    ("6", "SUMMARY, CONCLUSIONS AND FUTURE WORK", "26", True),
    ("6.1", "Summary of Research Accomplishments (Validation of Hypotheses)", "26", False),
    ("6.2", "Key Architectural Innovations Validated", "26", False),
    ("6.3", "Key Academic & Industrial Takeaways", "26", False),
    ("6.4", "Limitations Observed in Current Deployment", "26", False),
    ("6.5", "Enterprise Deployment Best Practices & Production Guidelines", "26", False),
    ("6.6", "The Path Forward: Strategic Future Research Directions", "27", False),
    ("6.7", "Final Concluding Verdict", "27", False),
    ("", "REFERENCES", "28", True)
]

LIST_OF_FIGURES = [
    ("Fig 1.1", "Master System Architecture and End-to-End Evaluation Workflow", "3"),
    ("Fig 2.1", "Empirical Performance & Baseline Benchmark Comparison", "8"),
    ("Fig 3.1", "Multi-Page Answer Collation and Ingestion Sequence", "12"),
    ("Fig 4.1", "Optical Character Recognition & Vision Preprocessing Pipeline", "13"),
    ("Fig 4.2", "Relational Database Schema & Vector Index Topology", "15"),
    ("Fig 4.3", "Teacher Evaluation Workbench & Audit Trail Architecture", "17"),
    ("Fig 4.4", "Dual-Route Automated Grading Rubric & Decision Flow", "18"),
    ("Fig 4.5", "Vector Retrieval & Curricular RAG Pipeline", "19"),
    ("Fig 4.6", "Mathematical Formulations & Multi-Criteria Scoring Formulations", "19")
]

LIST_OF_TABLES = [
    ("Table 1.1", "Systematic Comparison of Information Retrieval Paradigms in Exam Evaluation", "4"),
    ("Table 2.1", "Literature Review Matrix (14 State-of-the-Art Peer-Reviewed Papers)", "7"),
    ("Table 2.2", "Deep Dive Architectural Feature Benchmark: EduEval Baseline vs. Proposed System", "8"),
    ("Table 3.1", "Target Operational User Personas and Workflow Specifications", "11"),
    ("Table 3.2", "Feasibility Study & Implementation Risk Assessment Matrix", "11"),
    ("Table 3.3", "Hardware, Operating System, and Software Stack Specifications", "12"),
    ("Table 4.1", "PostgreSQL Relational Schema & Qdrant Payload Collections", "15"),
    ("Table 4.2", "Few-Shot Prompt Templates & Multi-Attribute Scoring Parameters", "16"),
    ("Table 4.3a", "Numerical Step-by-Step Walkthrough of Keyword Density Re-ranking", "17"),
    ("Table 4.3", "Enterprise Total Cost of Ownership (TCO) & Infrastructure Profiling", "20"),
    ("Table 5.1", "Multi-Criteria Question Grading Accuracy Benchmark Across Question Complexities", "21"),
    ("Table 5.2", "Retrieval Precision, Faithfulness, and Hallucination Suppression Metrics", "22"),
    ("Table 5.3", "Ablation Study Quantifying the Empirical Impact of Core Architectural Modules", "22"),
    ("Table 5.4", "End-to-End Latency Telemetry Waterfall Breakdown Across 100 Test Submissions", "23"),
    ("Table 5.5", "Concurrent Throughput and P95 Tail Latency Scaling Benchmark", "23"),
    ("Table 5.6", "Robustness Benchmark Under OCR Noise, Lexical Typos, and Diagram Dropout", "24"),
    ("Table 5.7", "Cross-Framework Comparative Benchmark Against Industry Systems", "24"),
    ("Table R.1", "Systematic Architectural Mapping of Literature References to System Subsystems", "29"),
    ("Table R.2", "Cross-Reference Correlation Between Research Objectives and Benchmark Citations", "29")
]
