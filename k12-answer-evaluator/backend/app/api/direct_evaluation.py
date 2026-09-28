"""Direct Evaluation Router.

Provides standalone endpoints for evaluating multi-question exam papers and answer sheets:
- POST /api/evaluation/extract-question-paper: Extract structured questions from PDF/image
- POST /api/evaluation/evaluate: Multi-question evaluation with OCR, AnswerParser, Qdrant RAG, and DeepSeek
- GET /api/evaluation/presets: Verified official multi-question test presets
- POST /api/evaluation/override: Examiner manual score adjustments
"""

import os
import json
import uuid
import tempfile
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple, Callable, Awaitable
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from loguru import logger
from PIL import Image
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.models.saved_evaluation import SavedEvaluation
from app.services.ocr_service import get_ocr_service
from app.services.rag_service import RAGService
from app.services.evaluation_service import EvaluationService
from app.services.answer_parser import AnswerParser
from app.services.answer_normalizer import AnswerNormalizer

router = APIRouter(prefix="/evaluation", tags=["direct_evaluation"])

# Lazy singletons for services
_rag_service: Optional[RAGService] = None
_eval_service: Optional[EvaluationService] = None
_answer_parser: Optional[AnswerParser] = None
_answer_normalizer: Optional[AnswerNormalizer] = None


def get_rag_service() -> RAGService:
    """Get or initialize lazy RAG service singleton."""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service


def get_eval_service() -> EvaluationService:
    """Get or initialize lazy Evaluation service singleton."""
    global _eval_service
    if _eval_service is None:
        _eval_service = EvaluationService()
    return _eval_service


def get_answer_parser() -> AnswerParser:
    """Get or initialize lazy AnswerParser singleton."""
    global _answer_parser
    if _answer_parser is None:
        _answer_parser = AnswerParser()
    return _answer_parser


def get_answer_normalizer() -> AnswerNormalizer:
    """Get or initialize lazy AnswerNormalizer singleton."""
    global _answer_normalizer
    if _answer_normalizer is None:
        _answer_normalizer = AnswerNormalizer()
    return _answer_normalizer


# ─────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────

class CriteriaBreakdown(BaseModel):
    """Marks and percentage breakdown across evaluation criteria."""
    factual_correctness: float = Field(..., description="Score obtained for factual correctness")
    structural_completeness: float = Field(..., description="Score obtained for structural completeness")
    conceptual_understanding: float = Field(..., description="Score obtained for conceptual understanding")


class MisconceptionItem(BaseModel):
    """Detailed diagnosis of a student error or misconception."""
    concept: str = Field(..., description="The concept where error occurred")
    student_claim: str = Field(..., description="What the student wrote or assumed")
    correction: str = Field(..., description="Scientific or mathematical correction")
    impact: str = Field(..., description="Educational impact and mark deduction rationale")


class ImprovementGuidanceItem(BaseModel):
    """Personalized remedial study guidance."""
    suggestion: str = Field(..., description="Concrete actionable advice")
    resource: str = Field(..., description="Textbook chapter or reference module")
    practice: str = Field(..., description="Suggested problem type to practice")


class RAGChunkTrace(BaseModel):
    """Retrieved curriculum textbook chunk trace."""
    chapter: str
    source: str
    similarity_score: float
    match_percentage: float
    text: str


class RAGPipelineTrace(BaseModel):
    """Detailed telemetry of the RAG pipeline execution."""
    query: str
    keywords: List[str] = []
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    vector_dimension: int = 384
    qdrant_collection: str = "k12_textbooks"
    filter_subject: str
    filter_academic_level: Optional[str] = None
    top_k: int
    chunks: List[RAGChunkTrace] = []
    retrieval_status: str = "SUCCESS"
    retrieved_at: str


class QuestionEvaluationItem(BaseModel):
    """Evaluation result for an individual exam question."""
    question_number: int
    question_text: str
    marking_scheme: str
    max_score: float
    score: float
    percentage: float
    status: str
    breakdown: Dict[str, Any]
    correct_points: List[str] = []
    misconceptions: List[Dict[str, Any]] = []
    missing_concepts: List[str] = []
    correct_answer_should_include: List[str] = []
    improvement_guidance: List[Dict[str, Any]] = []
    overall_feedback: str
    student_answer_text: str
    cleaned_student_answer: str = ""
    raw_student_answer: Optional[str] = ""
    sources_found_on_pages: List[int] = []
    cleaning_notes: Optional[str] = None
    rag_trace: Optional[RAGPipelineTrace] = None


class DirectEvaluationResponse(BaseModel):
    """Complete evaluation report response payload supporting multi-question papers."""
    evaluation_id: str
    total_score: float
    total_max_score: float
    percentage: float
    status: str
    # Single-question legacy compatibility fields
    score: float
    max_score: float
    breakdown: Dict[str, Any]
    correct_points: List[str]
    misconceptions: List[Dict[str, Any]]
    missing_concepts: List[str]
    correct_answer_should_include: List[str]
    improvement_guidance: List[Dict[str, Any]]
    overall_feedback: str
    extracted_text: str
    diagram_detected: bool
    diagram_metadata: Optional[Dict[str, Any]] = None
    rag_sources: List[Dict[str, Any]]
    rag_trace: Optional[RAGPipelineTrace] = None
    # Multi-question array
    questions: List[QuestionEvaluationItem] = []
    total_questions: int = 1
    ocr_cleaning_summary: Optional[str] = None
    pages_processed: int = 1
    provider: str
    model: str
    evaluated_at: str


class ExtractedQuestionItem(BaseModel):
    """Question item extracted from uploaded question paper."""
    question_number: int
    question_text: str
    marking_scheme: str = ""
    max_score: float = 2.0
    question_type: str = ""
    section: str = ""


class QuestionPaperExtractResponse(BaseModel):
    """Response payload for automated question paper extraction."""
    title: str
    total_marks: float
    total_questions: int
    questions: List[ExtractedQuestionItem]


class PresetQuestion(BaseModel):
    """Preconfigured question in an exam preset."""
    question_number: int
    question_text: str
    marking_scheme: str
    max_score: float
    sample_answer_text: Optional[str] = None


class PresetItem(BaseModel):
    """Preconfigured official examination question preset."""
    id: str
    title: str
    subject: str
    academic_level: str
    max_score: float
    question_text: str
    marking_scheme: str
    sample_answer_text: Optional[str] = None
    questions: List[PresetQuestion] = []
    tags: List[str] = []


class ScoreOverrideRequest(BaseModel):
    """Request payload for manual examiner score adjustment."""
    evaluation_id: Optional[str] = None
    question_number: Optional[int] = None
    adjusted_score: float
    max_score: float
    examiner_notes: str


class ScoreOverrideResponse(BaseModel):
    """Response payload for manual examiner score adjustment."""
    evaluation_id: Optional[str] = None
    question_number: Optional[int] = None
    adjusted_score: float
    max_score: float
    percentage: float
    status: str
    examiner_notes: str
    updated_at: str


class SavedEvaluationSummaryItem(BaseModel):
    """Concise metadata item for an evaluation record in PostgreSQL history."""
    id: str
    title: str
    subject: str
    academic_level: str
    total_score: float
    total_max_score: float
    percentage: float
    status: str
    total_questions: int
    pages_processed: int
    provider: str
    model: str
    evaluated_at: str
    diagram_detected: bool = False
    student_answer_snippet: Optional[str] = None
    criteria_breakdown: Optional[Dict[str, Any]] = None


class EvaluationHistoryStats(BaseModel):
    """Aggregated statistics across all historical evaluation records."""
    total_evaluations: int
    average_percentage: float
    exemplary_count: int
    pass_count: int
    needs_improvement_count: int
    fail_count: int
    total_questions_evaluated: int


class EvaluationHistoryListResponse(BaseModel):
    """Response payload returning historical evaluation records with metrics."""
    items: List[SavedEvaluationSummaryItem]
    total_count: int
    stats: EvaluationHistoryStats



# ─────────────────────────────────────────────────────────────
# Official Test Presets (Multi-Question Full Papers)
# ─────────────────────────────────────────────────────────────

OFFICIAL_PRESETS: List[PresetItem] = [
    PresetItem(
        id="cbse-10-science-full",
        title="CBSE Class 10 Science: Chemical Reactions (Section B - 3 Questions)",
        subject="science",
        academic_level="Class 10",
        max_score=7.0,
        question_text="A shiny brown coloured element 'X' on heating in air becomes black in colour. Name the element 'X' and the black coloured compound formed. Write the chemical equation for the reaction.",
        marking_scheme="1. Element 'X' is Copper (Cu) and black compound is Copper(II) oxide (CuO) [1 Mark]. 2. Balanced chemical equation: 2Cu + O2 -> 2CuO (with heat) [1 Mark].",
        sample_answer_text=(
            "Q1. Element 'X' is Copper (Cu) and the black compound formed is Copper(II) oxide (CuO).\n"
            "Chemical Equation: 2Cu(s) + O2(g) -> 2CuO(s) (Heat)\n\n"
            "Q2. Neutralisation reaction is when an acid reacts with a base to form salt and water.\n"
            "Reaction: NaOH + HCl -> NaCl + H2O\n\n"
            "Ans 3. When ferrous sulphate crystals are heated, green color changes to brown.\n"
            "Reaction: 2FeSO4(s) -> Fe2O3(s) + SO2(g) + SO3(g)\n"
            "Gases evolved: Sulphur dioxide (SO2) and Sulphur trioxide (SO3) which have suffocating smell of burning sulphur."
        ),
        questions=[
            PresetQuestion(
                question_number=1,
                question_text="A shiny brown coloured element 'X' on heating in air becomes black in colour. Name the element 'X' and the black coloured compound formed. Write the chemical equation for the reaction.",
                marking_scheme="1. Element 'X' is Copper (Cu) and black compound is Copper(II) oxide (CuO) [1 Mark].\n2. Balanced chemical equation: 2Cu + O2 -> 2CuO (with heat) [1 Mark].",
                max_score=2.0,
                sample_answer_text="Element 'X' is Copper (Cu) and black compound is CuO. Equation: 2Cu + O2 -> 2CuO."
            ),
            PresetQuestion(
                question_number=2,
                question_text="What is a neutralisation reaction? Give one balanced chemical equation for the reaction between sodium hydroxide and hydrochloric acid.",
                marking_scheme="1. Definition: Reaction between an acid and a base producing salt and water [1 Mark].\n2. Equation: NaOH + HCl -> NaCl + H2O [1 Mark].",
                max_score=2.0,
                sample_answer_text="Neutralisation is when acid reacts with base to form salt and water. NaOH + HCl -> NaCl + H2O."
            ),
            PresetQuestion(
                question_number=3,
                question_text="Describe the decomposition of ferrous sulphate crystals on heating. State the color change and name the gases evolved with a balanced chemical equation.",
                marking_scheme="1. Color change from green to reddish-brown Fe2O3 [1 Mark].\n2. Gases: SO2 and SO3 with pungent smell [1 Mark].\n3. Balanced equation: 2FeSO4(s) -> Fe2O3(s) + SO2(g) + SO3(g) [1 Mark].",
                max_score=3.0,
                sample_answer_text="Green crystals turn reddish brown. 2FeSO4 -> Fe2O3 + SO2 + SO3. Gases evolved are SO2 and SO3."
            )
        ],
        tags=["CBSE", "Class 10", "Full Paper", "Chemistry", "Multi-Question"]
    ),
    PresetItem(
        id="cbse-12-physics-electro",
        title="CBSE Class 12 Physics: Electrostatics & Gauss's Law (3 Questions)",
        subject="physics",
        academic_level="Class 12",
        max_score=10.0,
        question_text="State Gauss's law in electrostatics. Using Gauss's law, derive an expression for the electric field due to an infinitely long straight wire of uniform linear charge density lambda.",
        marking_scheme="1. Gauss law statement and formula [1.5 M]. 2. Cylindrical surface [1 M]. 3. Flux calculation [1 M]. 4. Final derivation E = lambda / (2*pi*epsilon_0*r) [1.5 M].",
        sample_answer_text=(
            "Q1. Electric dipole moment is defined as the product of magnitude of either charge and distance between them: p = q * 2a. SI unit is Coulomb-meter (C m). Direction is from negative charge to positive charge.\n\n"
            "Q2. Electric field at axial point of dipole of length 2a at distance r from centre is E_axial = (1 / (4*pi*epsilon_0)) * (2*p*r) / (r^2 - a^2)^2. For short dipole (r >> a), E_axial = 2*p / (4*pi*epsilon_0*r^3).\n\n"
            "Ans 3. Gauss's Law: Total electric flux through a closed surface is equal to q_enclosed / epsilon_0. phi = integral E.ds = q / epsilon_0.\n"
            "Derivation for infinite wire: Choose cylindrical Gaussian surface of radius r and length L.\n"
            "Flux through circular flat ends = 0 (E is perpendicular to area vector).\n"
            "Flux through curved surface = E * (2*pi*r*L).\n"
            "Enclosed charge q = lambda * L.\n"
            "By Gauss law: E * 2*pi*r*L = (lambda * L) / epsilon_0 => E = lambda / (2 * pi * epsilon_0 * r)."
        ),
        questions=[
            PresetQuestion(
                question_number=1,
                question_text="Define electric dipole moment. State its SI unit and direction.",
                marking_scheme="1. Definition: p = q * 2a [1 Mark].\n2. SI Unit: Coulomb-metre (C m) [0.5 Mark].\n3. Direction: from -q to +q [0.5 Mark].",
                max_score=2.0
            ),
            PresetQuestion(
                question_number=2,
                question_text="Derive the expression for electric field at an axial point of a short electric dipole of dipole moment p.",
                marking_scheme="1. Diagram and potential/field expressions [1 Mark].\n2. Superposition of fields [1 Mark].\n3. Approximation for r >> a: E = 2p / (4*pi*epsilon_0*r^3) [1 Mark].",
                max_score=3.0
            ),
            PresetQuestion(
                question_number=3,
                question_text="State Gauss's law in electrostatics. Using Gauss's law, derive an expression for the electric field due to an infinitely long straight wire of uniform linear charge density lambda.",
                marking_scheme="1. Statement of Gauss's Law [1.5 Marks].\n2. Cylindrical Gaussian surface of radius r and length L [1 Mark].\n3. Total flux = E * 2*pi*r*L [1 Mark].\n4. Derivation: E = lambda / (2*pi*epsilon_0*r) [1.5 Marks].",
                max_score=5.0
            )
        ],
        tags=["CBSE", "Class 12", "Physics", "Electrostatics", "Multi-Question"]
    ),
    PresetItem(
        id="cbse-12-cs-stack",
        title="CBSE Class 12 Computer Science: Python & Stack ADT (3 Questions)",
        subject="computer_science",
        academic_level="Class 12",
        max_score=8.0,
        question_text="Write functions in Python to implement Push(Book) and Pop() operations on a stack named BookStack.",
        marking_scheme="1. Push definition [1 M]. 2. Pop definition with Underflow check [1.5 M]. 3. Syntax [0.5 M].",
        sample_answer_text=(
            "Q1. Mutable data types can have their values modified in place (e.g. list, dictionary, set).\n"
            "Immutable data types cannot be modified in place once created (e.g. int, float, string, tuple).\n\n"
            "Q2. BookStack = []\n"
            "def Push(Book):\n"
            "    BookStack.append(Book)\n"
            "    print('Pushed', Book)\n\n"
            "def Pop():\n"
            "    if len(BookStack) == 0:\n"
            "        print('Stack Underflow')\n"
            "        return None\n"
            "    return BookStack.pop()\n\n"
            "Ans 3. def Search(List, Key):\n"
            "    for index in range(len(List)):\n"
            "        if List[index] == Key:\n"
            "            return index\n"
            "    return -1"
        ),
        questions=[
            PresetQuestion(
                question_number=1,
                question_text="Differentiate between Mutable and Immutable data types in Python with suitable examples for each.",
                marking_scheme="1. Definition & examples of Mutable types (list, dict, set) [1 Mark].\n2. Definition & examples of Immutable types (int, str, tuple) [1 Mark].",
                max_score=2.0
            ),
            PresetQuestion(
                question_number=2,
                question_text="Write functions in Python to implement Push(Book) and Pop() operations on a stack named BookStack, where each element is a list [BookNo, BookName]. Handle Underflow.",
                marking_scheme="1. Push definition accepting Book parameter [1 Mark].\n2. Pop definition with Underflow condition [1.5 Marks].\n3. Correct naming and syntax [0.5 Mark].",
                max_score=3.0
            ),
            PresetQuestion(
                question_number=3,
                question_text="Write a Python function Search(List, Key) to perform linear search on a list of numbers and return the index of the first occurrence or -1 if not found.",
                marking_scheme="1. Loop over list indices [1 Mark].\n2. Correct match condition returning index [1 Mark].\n3. Returning -1 on search failure [1 Mark].",
                max_score=3.0
            )
        ],
        tags=["CBSE", "Class 12", "Computer Science", "Python", "Multi-Question"]
    ),
    PresetItem(
        id="cbse-10-maths-circles",
        title="CBSE Class 10 Maths: Circles & Geometry (3 Questions)",
        subject="mathematics",
        academic_level="Class 10",
        max_score=8.0,
        question_text="Prove that the lengths of tangents drawn from an external point to a circle are equal.",
        marking_scheme="1. Statement of theorem and figure [1 M]. 2. Construction and RHS congruence [1.5 M]. 3. Conclusion [0.5 M].",
        sample_answer_text=(
            "Q1. Given circle with radius r = 5 cm, OP = 13 cm. Let PT be tangent.\n"
            "In right triangle OTP (angle OTP = 90 deg):\n"
            "PT = sqrt(OP^2 - OT^2) = sqrt(13^2 - 5^2) = sqrt(169 - 25) = sqrt(144) = 12 cm.\n\n"
            "Q2. Given: Circle with center O, tangents PQ and PR from external point P.\n"
            "To Prove: PQ = PR.\n"
            "Construction: Join OP, OQ, and OR.\n"
            "In right triangle OQP and right triangle ORP:\n"
            "- OQ = OR (radii of same circle)\n"
            "- OP = OP (common hypotenuse)\n"
            "- angle OQP = angle ORP = 90 deg\n"
            "Therefore, triangle OQP is congruent to triangle ORP (RHS criterion).\n"
            "Hence, PQ = PR (CPCT). Hence Proved.\n\n"
            "Ans 3. Tangents at endpoints of diameter AB are parallel.\n"
            "Let AB be diameter. Tangents at A and B make angle 90 deg with AB (radius perpendicular to tangent).\n"
            "Sum of co-interior angles = 90 + 90 = 180 deg.\n"
            "Therefore the tangents are parallel."
        ),
        questions=[
            PresetQuestion(
                question_number=1,
                question_text="A tangent PT at a point T of a circle of radius 5 cm meets a line through the centre O at a point P so that OP = 13 cm. Find the length of PT.",
                marking_scheme="1. Identifying angle OTP = 90° [0.5 Mark].\n2. Pythagoras theorem: PT = sqrt(13^2 - 5^2) [1 Mark].\n3. Calculation PT = 12 cm [0.5 Mark].",
                max_score=2.0
            ),
            PresetQuestion(
                question_number=2,
                question_text="Prove that the lengths of tangents drawn from an external point to a circle are equal.",
                marking_scheme="1. Accurate diagram and Given/To Prove [0.5 Mark].\n2. RHS Congruence in triangles OPQ and OPR [2 Marks].\n3. Conclusion PQ = PR [0.5 Mark].",
                max_score=3.0
            ),
            PresetQuestion(
                question_number=3,
                question_text="Prove that the tangents drawn at the ends of a diameter of a circle are parallel.",
                marking_scheme="1. Diagram with diameter and tangents [1 Mark].\n2. Establishing alternate interior angles or co-interior angles = 180° [1.5 Marks].\n3. Conclusion [0.5 Mark].",
                max_score=3.0
            )
        ],
        tags=["CBSE", "Class 10", "Mathematics", "Geometry", "Multi-Question"]
    ),
    PresetItem(
        id="cbse-12-chem-coordination",
        title="CBSE Class 12 Chemistry: Coordination Compounds (3 Questions)",
        subject="chemistry",
        academic_level="Class 12",
        max_score=9.0,
        question_text="State Werner's theory of coordination compounds. Mention the two types of valencies and distinguish between them.",
        marking_scheme="1. Werner postulates [1 M]. 2. Primary valency [1 M]. 3. Secondary valency [1 M]. 4. Example [1 M].",
        sample_answer_text=(
            "Q1. Coordination number is the total number of ligand donor atoms directly bonded to the central metal atom/ion. For [Co(NH3)6]3+, coordination number is 6.\n"
            "Chelate ligand: A polydentate ligand that bonds to a single central atom through two or more donor atoms forming a ring structure (e.g., EDTA, ethanediamine).\n\n"
            "Q2. Werner's Theory:\n"
            "1. Primary Valency: Ionisable, satisfied by negative ions, equals oxidation state.\n"
            "2. Secondary Valency: Non-ionisable, directional, satisfied by ligands, equals coordination number.\n"
            "Example: [Co(NH3)6]Cl3 has Primary valency = 3 and Secondary valency = 6.\n\n"
            "Ans 3. (a) [Fe(CN)6]4- : CN- is strong field ligand, causes pairing. Inner orbital complex d2sp3 hybridization, diamagnetic.\n"
            "(b) [Fe(H2O)6]2+ : H2O is weak field ligand, no pairing. Outer orbital complex sp3d2 hybridization, paramagnetic with 4 unpaired electrons."
        ),
        questions=[
            PresetQuestion(
                question_number=1,
                question_text="Define Coordination Number and Chelate Ligand with one example of each.",
                marking_scheme="1. Coordination Number definition with example [1 Mark].\n2. Chelate ligand definition with example [1 Mark].",
                max_score=2.0
            ),
            PresetQuestion(
                question_number=2,
                question_text="State Werner's theory of coordination compounds. Mention the two types of valencies possessed by a central metal atom and distinguish between them with an example.",
                marking_scheme="1. Statement of Werner's theory [1 Mark].\n2. Primary valency vs Secondary valency distinction [1.5 Marks].\n3. Suitable example [0.5 Mark].",
                max_score=3.0
            ),
            PresetQuestion(
                question_number=3,
                question_text="Using Valence Bond Theory, explain the hybridization, geometry, and magnetic behaviour of [Fe(CN)6]4- and [Fe(H2O)6]2+.",
                marking_scheme="1. [Fe(CN)6]4- hybridization (d2sp3), octahedral, diamagnetic [2 Marks].\n2. [Fe(H2O)6]2+ hybridization (sp3d2), octahedral, paramagnetic [2 Marks].",
                max_score=4.0
            )
        ],
        tags=["CBSE", "Class 12", "Chemistry", "Inorganic", "Multi-Question"]
    )
]


# ─────────────────────────────────────────────────────────────
# Helper: PDF to Images converter
# ─────────────────────────────────────────────────────────────

async def _extract_images_from_pdf(pdf_path: str, temp_dir: str, max_pages: int = 50) -> List[str]:
    """Convert pages of a PDF into PNG images using PyMuPDF (fitz) asynchronously."""
    def _convert() -> List[str]:
        import fitz
        doc = fitz.open(pdf_path)
        extracted_image_paths = []
        pages_to_process = min(len(doc), max_pages)
        for page_num in range(pages_to_process):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=200)
            img_path = os.path.join(temp_dir, f"page_{page_num + 1}_{uuid.uuid4().hex[:6]}.png")
            pix.save(img_path)
            extracted_image_paths.append(img_path)
        doc.close()
        return extracted_image_paths

    return await asyncio.to_thread(_convert)


# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/presets", response_model=List[PresetItem])
async def get_evaluation_presets() -> List[PresetItem]:
    """Return verified official examination question presets for 1-click evaluation testing."""
    return OFFICIAL_PRESETS


@router.get("/vector-db-status")
async def get_vector_db_status() -> Dict[str, Any]:
    """Return point count, collection name, subject breakdown, and health status of Qdrant vector database."""
    rag_svc = get_rag_service()
    return rag_svc.get_vector_db_stats()


@router.post("/ingest-textbooks")
async def ingest_curriculum_textbooks_endpoint(force: bool = False) -> Dict[str, Any]:
    """Trigger ingestion of all NCERT curriculum modules and PDF textbooks into Qdrant Vector DB."""
    logger.info(f"Triggering curriculum textbook ingestion (force={force})...")
    rag_svc = get_rag_service()
    result = await rag_svc.ingest_curriculum_textbooks_async(force_reingest=force)
    return result


@router.post("/extract-question-paper", response_model=QuestionPaperExtractResponse)
async def extract_question_paper(
    file: UploadFile = File(..., description="Uploaded Question Paper PDF or Image"),
    subject: str = Form("science", description="Academic subject"),
    academic_level: str = Form("Class 10", description="Academic level")
) -> QuestionPaperExtractResponse:
    """Extract structured questions, question numbers, prompts, and marks from an uploaded Question Paper."""
    logger.info(f"Extracting question paper from file: {file.filename} (subject: {subject}, level: {academic_level})")

    if not file.filename:
        raise HTTPException(status_code=422, detail="No question paper file provided.")

    filename_lower = file.filename.lower()
    if not (filename_lower.endswith((".pdf", ".png", ".jpg", ".jpeg", ".webp"))):
        raise HTTPException(
            status_code=422,
            detail="Unsupported file format. Please upload a PDF or Image (PNG, JPG, JPEG, WEBP)."
        )

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = os.path.join(temp_dir, f"qp_{uuid.uuid4().hex}_{os.path.basename(file.filename)}")
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        image_paths: List[str] = []
        pdf_text_content = ""
        total_pdf_pages = 0
        if filename_lower.endswith(".pdf"):
            try:
                import fitz
                doc = fitz.open(temp_path)
                total_pdf_pages = len(doc)
                for p_idx in range(total_pdf_pages):
                    page_txt = doc[p_idx].get_text()
                    if page_txt.strip():
                        pdf_text_content += f"\n--- PAGE {p_idx + 1} ---\n" + page_txt
                doc.close()
                logger.info(f"Extracted text from all {total_pdf_pages} PDF pages ({len(pdf_text_content)} chars)")
            except Exception as e:
                logger.warning(f"Could not extract native text from PDF: {e}")

            image_paths = await _extract_images_from_pdf(temp_path, temp_dir, max_pages=20)
            logger.info(f"Converted {len(image_paths)} PDF pages to images for Gemini vision")
        else:
            image_paths = [temp_path]

        if not image_paths and not pdf_text_content.strip():
            raise HTTPException(status_code=422, detail="Could not read pages or text from question paper.")

        # Multimodal Gemini Structured Extraction
        from google import genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured for question paper extraction.")

        client = genai.Client(api_key=api_key)
        max_images = min(len(image_paths), 16)
        pil_images = [Image.open(p) for p in image_paths[:max_images]]

        prompt = (
            f"You are an expert examination paper digitizer, capable of processing ANY type of question paper — "
            f"CBSE, ICSE, State Boards, University Exams, Competitive Exams (JEE/NEET/GATE), Cambridge IGCSE, IB, or custom institutional papers.\n"
            f"This is a {academic_level} {subject.capitalize()} question paper with {total_pdf_pages} pages.\n\n"
            "YOUR TASK: Extract EVERY SINGLE question from this paper. Do NOT skip any question.\n\n"
            "CRITICAL EXTRACTION RULES:\n"
            "1. COMPLETENESS: Extract ALL questions from ALL sections/parts/groups. "
            "First, read the paper header or instructions to find the TOTAL number of questions stated, then extract that EXACT count. "
            "Scan every page — questions at the end of later pages are frequently missed.\n"
            "2. MARKS ACCURACY: Read the EXACT marks for each question from the paper itself. "
            "Marks are typically printed next to each question number (e.g. [1], [2], [3], [5], [10]) or stated in section/part headers "
            "(e.g. 'Each question carries 2 marks'). DO NOT guess or assign default marks — read them from the paper.\n"
            "3. SECTION IDENTIFICATION: Use whatever section/part/group labels the paper itself uses. "
            "Examples: 'Section A', 'Part I', 'Group A', 'Unit 1', 'Paper I', etc. "
            "If no sections exist, use an empty string.\n"
            "4. QUESTION TYPE CLASSIFICATION: Classify each question as one of these types based on its FORMAT and MARKS:\n"
            "   * 'MCQ' — Multiple Choice with options (a/b/c/d)\n"
            "   * 'Fill in the Blank' — Complete the sentence/equation\n"
            "   * 'True/False' — Statement verification\n"
            "   * 'Match the Following' — Column matching\n"
            "   * 'Assertion-Reasoning' — Assertion + Reason with option pattern\n"
            "   * 'Very Short Answer' — 1-2 mark descriptive (one line / one word / definition)\n"
            "   * 'Short Answer' — 2-3 mark descriptive (30-80 words)\n"
            "   * 'Long Answer' — 4-5+ mark descriptive (detailed explanation)\n"
            "   * 'Numerical' — Calculation / problem-solving with formula application\n"
            "   * 'Case-Based' — Passage/data/diagram followed by sub-questions\n"
            "   * 'Diagram' — Draw/label/explain a diagram\n"
            "   * 'Essay' — Extended writing (8+ marks)\n"
            "   * 'Practical/Lab' — Lab procedure, observation, inference\n"
            "   If none of the above fit, use the most descriptive short label.\n"
            "5. QUESTION TEXT: Include the COMPLETE question text including:\n"
            "   - All MCQ options (a, b, c, d)\n"
            "   - All sub-parts (a, b, c, i, ii, iii, 1, 2, 3)\n"
            "   - Data tables, graphs, diagrams (describe them textually)\n"
            "   - Chemical equations, mathematical formulas, scientific notation (preserve exactly)\n"
            "   - Reading passages / case study text for case-based questions\n"
            "6. MARKS SPLIT: If a question shows marks as '2+1' or '1+1+2' or '(3+2)', "
            "put the TOTAL as max_score and note the per-part split in marking_scheme.\n"
            "7. OR / INTERNAL CHOICE: If a question has an 'OR' or 'ALTERNATIVELY' option, "
            "include BOTH versions in the same question_text separated by '\\nOR\\n'.\n"
            "8. MARKING SCHEME: Generate a step-wise marking rubric for each question "
            "showing exactly how marks should be allocated, e.g. '1. Formula [1 Mark]\\n2. Substitution [1 Mark]\\n3. Final answer with unit [1 Mark]'.\n\n"
            f"{'FULL TEXT EXTRACTED FROM ALL ' + str(total_pdf_pages) + ' PAGES:' + chr(10) + pdf_text_content + chr(10) + chr(10) if pdf_text_content.strip() else ''}"
            "Return JSON only, no prose, no markdown.\n"
            "Schema:\n"
            "{\n"
            '  \"title\": \"Exact paper title as printed on the document\",\n'
            '  \"total_marks\": <number from paper header>,\n'
            '  \"questions\": [\n'
            "    {\n"
            '      \"question_number\": 1,\n'
            '      \"question_text\": \"Complete question text with all options/sub-parts...\",\n'
            '      \"marking_scheme\": \"1. Step description [1 Mark]\",\n'
            '      \"max_score\": 1.0,\n'
            '      \"question_type\": \"MCQ\",\n'
            '      \"section\": \"Section A\"\n'
            "    }\n"
            "  ]\n"
            "}\n"
            "FINAL CHECKS BEFORE RESPONDING:\n"
            "- Count your extracted questions — does it match the paper's stated total?\n"
            "- Sum all max_score values — does it equal the paper's stated total marks?\n"
            "- Did you cover ALL pages including the last page?\n"
            "Return JSON only, no prose, no markdown."
        )

        models_to_try = [
            "gemini-2.5-flash",
            os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ]
        # Deduplicate while preserving order
        seen: set = set()
        unique_models: List[str] = []
        for m in models_to_try:
            if m not in seen:
                seen.add(m)
                unique_models.append(m)
        models_to_try = unique_models

        response = None
        last_error = None

        gemini_contents = [prompt]
        if pil_images:
            gemini_contents.extend(pil_images)

        for g_model in models_to_try:
            try:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=g_model,
                    contents=gemini_contents
                )
                if response and response.text:
                    if hasattr(response, "usage_metadata") and response.usage_metadata:
                        logger.info(
                            f"Gemini Question Paper ({g_model}) Token Usage: "
                            f"prompt={response.usage_metadata.prompt_token_count}, "
                            f"candidates={response.usage_metadata.candidates_token_count}"
                        )
                    logger.info(f"Question paper extraction succeeded with {g_model}")
                    break
            except Exception as ge:
                logger.warning(f"Model {g_model} unavailable or failed ({ge}), trying fallback model...")
                last_error = ge

        if not response or not response.text:
            raise RuntimeError(f"All Gemini models failed to extract question paper: {last_error}")

        try:
            raw_text = response.text or "{}"
            # Clean possible markdown wrapping
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0].strip()

            parsed = json.loads(raw_text, strict=False)
            extracted_qs = parsed.get("questions", [])
            if not extracted_qs:
                raise ValueError("No questions parsed from Gemini response")

            clean_questions: List[ExtractedQuestionItem] = []
            total_calc_marks = 0.0

            for idx, q in enumerate(extracted_qs, start=1):
                q_num = int(q.get("question_number") or idx)
                q_text = str(q.get("question_text") or "").strip()
                q_rubric = str(q.get("marking_scheme") or "").strip()
                q_marks = float(q.get("max_score") or 1.0)
                q_type = str(q.get("question_type") or "").strip()
                q_section = str(q.get("section") or "").strip()

                # Validate marks are reasonable (between 0.5 and 10)
                if q_marks <= 0:
                    q_marks = 1.0
                elif q_marks > 10:
                    q_marks = 5.0

                total_calc_marks += q_marks

                clean_questions.append(
                    ExtractedQuestionItem(
                        question_number=q_num,
                        question_text=q_text,
                        marking_scheme=q_rubric,
                        max_score=q_marks,
                        question_type=q_type,
                        section=q_section
                    )
                )

            title = parsed.get("title") or f"{academic_level} {subject.capitalize()} Question Paper"
            total_marks = float(parsed.get("total_marks") or total_calc_marks)

            logger.info(
                f"Successfully extracted {len(clean_questions)} questions from question paper: {title} "
                f"(total_marks={total_marks}, calculated_sum={total_calc_marks})"
            )

            # Warn if question count seems low for paper with stated total
            if total_pdf_pages > 3 and len(clean_questions) < 15:
                logger.warning(
                    f"Extraction produced only {len(clean_questions)} questions from a {total_pdf_pages}-page paper. "
                    f"The paper may have more questions that were not extracted."
                )
            return QuestionPaperExtractResponse(
                title=title,
                total_marks=total_marks,
                total_questions=len(clean_questions),
                questions=clean_questions
            )

        except Exception as e:
            logger.error(f"Gemini Question Paper extraction failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract questions from uploaded question paper: {str(e)}"
            )


def _parse_questions(
    questions_json: Optional[str],
    question_text: Optional[str],
    marking_scheme: Optional[str],
    max_score: Optional[float]
) -> List[Dict[str, Any]]:
    """Parse list of examination questions from JSON or fallback fields."""
    questions_to_evaluate: List[Dict[str, Any]] = []
    if questions_json and questions_json.strip():
        try:
            parsed_list = json.loads(questions_json)
            if isinstance(parsed_list, list) and len(parsed_list) > 0:
                for idx, q in enumerate(parsed_list, start=1):
                    questions_to_evaluate.append({
                        "question_number": int(q.get("question_number", idx)),
                        "question_text": str(q.get("question_text", "")).strip(),
                        "marking_scheme": str(q.get("marking_scheme", "")).strip(),
                        "max_score": float(q.get("max_score", 2.0)),
                        "question_type": str(q.get("question_type", "")).strip()
                    })
        except Exception as pe:
            logger.warning(f"Could not parse questions_json ({pe}), falling back to single question")

    if not questions_to_evaluate:
        q_text = question_text or "Default Examination Question"
        q_rubric = marking_scheme or "General accuracy and completeness"
        q_score = float(max_score if max_score is not None else 2.0)
        questions_to_evaluate.append({
            "question_number": 1,
            "question_text": q_text,
            "marking_scheme": q_rubric,
            "max_score": q_score
        })
    return questions_to_evaluate


async def execute_evaluation_pipeline(
    questions_to_evaluate: List[Dict[str, Any]],
    files_data: List[Tuple[str, bytes]],
    student_answer_text: Optional[str],
    subject: str,
    academic_level: str,
    event_callback: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
) -> DirectEvaluationResponse:
    """Execute accelerated multimodal evaluation pipeline with parallel processing and live event reporting."""
    async def emit(stage: str, status_str: str, title: str, message: str, progress: int, step: int, extra: Optional[Dict[str, Any]] = None):
        if event_callback:
            payload = {
                "stage": stage,
                "status": status_str,
                "title": title,
                "message": message,
                "progress": progress,
                "step": step
            }
            if extra:
                payload.update(extra)
            try:
                await event_callback(payload)
            except Exception as e_err:
                logger.debug(f"Event callback error: {e_err}")

    await emit(
        stage="init",
        status_str="started",
        title="Initializing AI Evaluation Pipeline",
        message=f"Configured {len(questions_to_evaluate)} questions for {academic_level} {subject}",
        progress=5,
        step=1
    )

    # Step 1: Process uploaded student answer files
    extracted_parts: List[str] = []
    page_ocr_items: List[Dict[str, Any]] = []
    diagram_metadata: Dict[str, Any] = {"has_diagrams": False, "shapes_detected": []}
    has_diagram = False

    ocr_svc = get_ocr_service()

    if files_data and len(files_data) > 0:
        await emit(
            stage="ocr",
            status_str="running",
            title="Multimodal OCR & Handwriting Extraction",
            message=f"Ingesting {len(files_data)} student file(s)...",
            progress=12,
            step=1
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            for fname, content in files_data:
                filename_lower = fname.lower()
                safe_name = f"{uuid.uuid4().hex}_{os.path.basename(fname)}"
                temp_file_path = os.path.join(temp_dir, safe_name)

                with open(temp_file_path, "wb") as f:
                    f.write(content)

                if filename_lower.endswith(".pdf"):
                    # Check native digital text first (0.05s vs 15s vision OCR)
                    pdf_native_pages: List[Tuple[int, str]] = []
                    try:
                        import fitz
                        doc = fitz.open(temp_file_path)
                        for p_idx in range(min(len(doc), 10)):
                            ptxt = doc[p_idx].get_text().strip()
                            if ptxt:
                                pdf_native_pages.append((p_idx + 1, ptxt))
                        doc.close()
                    except Exception as fe:
                        logger.warning(f"Could not read native PDF text: {fe}")

                    total_native_chars = sum(len(p[1]) for p in pdf_native_pages)
                    if total_native_chars > 200:
                        logger.info(f"Native digital PDF detected ({total_native_chars} chars across {len(pdf_native_pages)} pages). Using direct text extraction.")
                        await emit(
                            stage="ocr",
                            status_str="running",
                            title="Digital PDF Text Extraction",
                            message=f"Extracted digital text ({total_native_chars} chars across {len(pdf_native_pages)} pages)",
                            progress=25,
                            step=1
                        )
                        for p_num, p_text in pdf_native_pages:
                            extracted_parts.append(f"[Page {p_num} Text]:\n{p_text}")
                            page_ocr_items.append({"page_number": p_num, "text": p_text})
                    else:
                        # Scanned PDF: Render page images and OCR in parallel
                        await emit(
                            stage="ocr",
                            status_str="running",
                            title="Multimodal Vision OCR",
                            message=f"Scanning handwriting across PDF pages in parallel...",
                            progress=18,
                            step=1
                        )
                        page_images = await _extract_images_from_pdf(temp_file_path, temp_dir, max_pages=8)
                        if page_images:
                            ocr_tasks = [ocr_svc.extract_text_from_image_async(p_img) for p_img in page_images]
                            ocr_results = await asyncio.gather(*ocr_tasks, return_exceptions=True)
                            for p_idx, res in enumerate(ocr_results):
                                if isinstance(res, Exception):
                                    logger.info(f"Page {p_idx+1} OCR note: {res}")
                                    continue
                                txt, d_meta = res
                                if txt and txt.strip():
                                    p_num = p_idx + 1
                                    extracted_parts.append(f"[Page {p_num} OCR]:\n{txt}")
                                    page_ocr_items.append({"page_number": p_num, "text": txt})
                                if d_meta and d_meta.get("has_diagrams"):
                                    has_diagram = True
                                    diagram_metadata["has_diagrams"] = True
                                    diagram_metadata["shapes_detected"].extend(d_meta.get("shapes_detected", []))
                else:
                    # Single/Multiple Image files
                    try:
                        txt, d_meta = await ocr_svc.extract_text_from_image_async(temp_file_path)
                        if txt and txt.strip():
                            p_num = len(page_ocr_items) + 1
                            extracted_parts.append(txt)
                            page_ocr_items.append({"page_number": p_num, "text": txt})
                        if d_meta and d_meta.get("has_diagrams"):
                            has_diagram = True
                            diagram_metadata["has_diagrams"] = True
                            diagram_metadata["shapes_detected"].extend(d_meta.get("shapes_detected", []))
                    except Exception as img_ocr_err:
                        logger.warning(f"Image OCR note: {img_ocr_err}")

    if student_answer_text and student_answer_text.strip():
        p_num = len(page_ocr_items) + 1
        extracted_parts.append(f"[Directly Typed Answer]:\n{student_answer_text.strip()}")
        page_ocr_items.append({"page_number": p_num, "text": student_answer_text.strip()})

    combined_ocr_text = "\n\n".join(extracted_parts).strip()
    full_student_answer = combined_ocr_text

    if not full_student_answer:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No student answer text could be extracted or was provided. Please upload a clear image/PDF or enter typed answer text."
        )

    await emit(
        stage="ocr",
        status_str="complete",
        title="OCR Extraction Complete",
        message=f"Extracted {len(full_student_answer)} characters across {len(page_ocr_items)} pages",
        progress=35,
        step=1
    )

    # Step 2: LLM OCR Cleanup & Multi-Page Collation
    await emit(
        stage="normalizing",
        status_str="running",
        title="LLM OCR Normalization & Multi-Page Collation",
        message=f"Cleaning handwriting errors and collating scattered answers for {len(questions_to_evaluate)} questions...",
        progress=45,
        step=2
    )

    normalizer = get_answer_normalizer()
    norm_result = await normalizer.normalize_and_collate_answers_async(
        questions=questions_to_evaluate,
        page_ocr_items=page_ocr_items,
        subject=subject,
        academic_level=academic_level
    )
    questions_map = norm_result.get("questions_map", {})
    overall_cleaning_summary = norm_result.get(
        "overall_cleaning_summary",
        f"Cleaned and collated answers across {len(page_ocr_items)} pages."
    )
    logger.info(f"AnswerNormalizer collated {len(questions_map)} questions. Summary: {overall_cleaning_summary}")

    await emit(
        stage="normalizing",
        status_str="complete",
        title="Collation & Cleanup Complete",
        message=f"Collated {len(questions_map)} questions. {overall_cleaning_summary}",
        progress=60,
        step=2
    )

    rag_svc = get_rag_service()
    eval_svc = get_eval_service()

    # Step 3: Question-by-Question Targeted Vector Search & Parallel LLM Grading
    await emit(
        stage="rag",
        status_str="running",
        title="Targeted Vector Retrieval in Qdrant",
        message=f"Querying authoritative textbook vectors filtered strictly by '{subject}' and '{academic_level}'...",
        progress=70,
        step=3
    )

    async def evaluate_single_question(q: Dict[str, Any]) -> QuestionEvaluationItem:
        """Evaluate a single question against student answer with targeted RAG retrieval."""
        q_num = q["question_number"]
        q_prompt = q["question_text"]
        q_rubric = q["marking_scheme"]
        q_max = q["max_score"]
        q_type = str(q.get("question_type", "")).strip()

        norm_item = questions_map.get(q_num, {})
        cleaned_ans = norm_item.get("cleaned_student_answer") or "[Not attempted by student in submitted sheet]"
        raw_fragment = norm_item.get("raw_extracted_fragment") or norm_item.get("cleaned_student_answer", "")
        pages_found = norm_item.get("sources_found_on_pages", [])
        cleaning_notes = norm_item.get("cleaning_notes", "")
        is_attempted = norm_item.get("attempted", True)

        # TARGETED QUESTION-TO-QUESTION VECTOR DB SEARCH
        if is_attempted and cleaned_ans and not cleaned_ans.startswith("[Not attempted"):
            rag_query = f"{q_prompt} {cleaned_ans[:300]}".strip()
        else:
            rag_query = f"{q_prompt} {q_rubric}".strip()

        rag_keywords = rag_svc._extract_keywords(rag_query)
        rag_chunks = await rag_svc.retrieve_relevant_context_async(
            query=rag_query,
            subject=subject,
            class_level=academic_level,
            top_k=3
        )

        trace_chunks: List[RAGChunkTrace] = []
        for c in (rag_chunks or []):
            sc = float(c.get("score", 0.0))
            trace_chunks.append(
                RAGChunkTrace(
                    chapter=c.get("chapter") or "Curriculum Reference Chapter",
                    source=c.get("source") or "NCERT Reference Textbook",
                    similarity_score=round(sc, 3),
                    match_percentage=round(sc * 100.0, 1) if sc <= 1.0 else round(sc, 1),
                    text=c.get("text", "")
                )
            )

        rag_trace = RAGPipelineTrace(
            query=rag_query,
            keywords=rag_keywords[:8],
            embedding_model="sentence-transformers/all-MiniLM-L6-v2",
            vector_dimension=384,
            qdrant_collection=settings.QDRANT_COLLECTION_NAME,
            filter_subject=subject.lower(),
            filter_academic_level=academic_level,
            top_k=len(trace_chunks),
            chunks=trace_chunks,
            retrieval_status="SUCCESS" if trace_chunks else "FALLBACK",
            retrieved_at=datetime.utcnow().isoformat()
        )

        textbook_context = "\n\n".join([c.get("text", "") for c in rag_chunks]) if rag_chunks else ""
        rag_scores = [float(c.get("score", 0.0)) for c in rag_chunks] if rag_chunks else []

        # LLM Evaluation using the cleaned and collated answer
        eval_result = await eval_svc.evaluate_answer_async(
            question=q_prompt,
            student_answer=cleaned_ans,
            textbook_context=textbook_context,
            subject=subject,
            class_level=academic_level,
            max_score=int(round(q_max)),
            diagram_info=diagram_metadata if has_diagram else None,
            marking_scheme={"rubric": q_rubric},
            rag_scores=rag_scores,
            system_type="general",
            academic_level=academic_level,
            question_type=q_type
        )

        q_score = float(eval_result.get("score", 0.0))
        q_pct = round((q_score / q_max) * 100.0, 1) if q_max > 0 else 0.0
        q_status = "EXEMPLARY" if q_pct >= 85 else ("PASS" if q_pct >= 50 else ("NEEDS_IMPROVEMENT" if q_pct >= 30 else "FAIL"))

        return QuestionEvaluationItem(
            question_number=q_num,
            question_text=q_prompt,
            marking_scheme=q_rubric,
            max_score=q_max,
            score=q_score,
            percentage=q_pct,
            status=q_status,
            breakdown=eval_result.get("breakdown", {
                "factual_correctness": round(q_score * 0.5, 1),
                "structural_completeness": round(q_score * 0.3, 1),
                "conceptual_understanding": round(q_score * 0.2, 1)
            }),
            correct_points=eval_result.get("correct_points", []),
            misconceptions=eval_result.get("misconceptions", []),
            missing_concepts=eval_result.get("missing_concepts", []),
            correct_answer_should_include=eval_result.get("correct_answer_should_include", []),
            improvement_guidance=eval_result.get("improvement_guidance", []),
            overall_feedback=eval_result.get("overall_feedback", "Graded against step-wise marking rubric."),
            student_answer_text=cleaned_ans,
            cleaned_student_answer=cleaned_ans,
            raw_student_answer=raw_fragment,
            sources_found_on_pages=pages_found,
            cleaning_notes=cleaning_notes,
            rag_trace=rag_trace
        )

    await emit(
        stage="evaluating",
        status_str="running",
        title="DeepSeek-V3 Step-wise Rubric Evaluation",
        message=f"Evaluating {len(questions_to_evaluate)} questions in parallel with multi-criteria reasoning...",
        progress=82,
        step=4
    )

    # Step 4: Run all question evaluations in parallel
    question_results: List[QuestionEvaluationItem] = await asyncio.gather(
        *[evaluate_single_question(q) for q in questions_to_evaluate]
    )

    # Step 5: Compute aggregated total metrics across the paper
    total_score = round(sum(item.score for item in question_results), 1)
    total_max_score = round(sum(item.max_score for item in question_results), 1)
    total_pct = round((total_score / total_max_score) * 100.0, 1) if total_max_score > 0 else 0.0
    overall_status = "EXEMPLARY" if total_pct >= 85 else ("PASS" if total_pct >= 50 else ("NEEDS_IMPROVEMENT" if total_pct >= 30 else "FAIL"))

    evaluation_id = str(uuid.uuid4())
    first_result = question_results[0] if question_results else None

    # Aggregate breakdown
    agg_breakdown = {
        "factual_correctness": round(sum(item.breakdown.get("factual_correctness", 0) for item in question_results), 1),
        "structural_completeness": round(sum(item.breakdown.get("structural_completeness", 0) for item in question_results), 1),
        "conceptual_understanding": round(sum(item.breakdown.get("conceptual_understanding", 0) for item in question_results), 1),
    }

    # Aggregate lists for legacy support
    agg_correct = []
    agg_misconceptions = []
    agg_missing = []
    agg_guidance = []
    agg_rag_sources = []

    for item in question_results:
        agg_correct.extend([f"Q{item.question_number}: {p}" for p in item.correct_points])
        agg_misconceptions.extend(item.misconceptions)
        agg_missing.extend([f"Q{item.question_number}: {m}" for m in item.missing_concepts])
        agg_guidance.extend(item.improvement_guidance)
        if item.rag_trace and item.rag_trace.chunks:
            agg_rag_sources.extend([{"text": c.text, "score": c.similarity_score, "chapter": c.chapter, "source": c.source} for c in item.rag_trace.chunks])

    response = DirectEvaluationResponse(
        evaluation_id=evaluation_id,
        total_score=total_score,
        total_max_score=total_max_score,
        percentage=total_pct,
        status=overall_status,
        score=total_score,
        max_score=total_max_score,
        breakdown=agg_breakdown,
        correct_points=agg_correct,
        misconceptions=agg_misconceptions,
        missing_concepts=agg_missing,
        correct_answer_should_include=first_result.correct_answer_should_include if first_result else [],
        improvement_guidance=agg_guidance,
        overall_feedback=f"Completed multi-question paper evaluation ({len(question_results)} questions). Total marks: {total_score}/{total_max_score} ({total_pct}%).",
        extracted_text=full_student_answer,
        diagram_detected=has_diagram,
        diagram_metadata=diagram_metadata if has_diagram else None,
        rag_sources=agg_rag_sources,
        rag_trace=first_result.rag_trace if first_result else None,
        questions=question_results,
        total_questions=len(question_results),
        ocr_cleaning_summary=overall_cleaning_summary,
        pages_processed=len(page_ocr_items),
        provider=eval_svc.provider,
        model=eval_svc.deepseek_model,
        evaluated_at=datetime.utcnow().isoformat()
    )

    await emit(
        stage="completed",
        status_str="done",
        title="Evaluation Completed",
        message=f"Evaluation complete! Total score: {total_score}/{total_max_score} ({total_pct}%)",
        progress=100,
        step=5,
        extra={"result": response.dict()}
    )

    # Automatically persist evaluation record in PostgreSQL database
    try:
        from app.core.database import SessionLocal
        from app.models.saved_evaluation import SavedEvaluation

        with SessionLocal() as db:
            paper_title = f"{academic_level} {subject.capitalize()} Examination ({len(question_results)} Questions)"
            if questions_to_evaluate and questions_to_evaluate[0].get("question_text"):
                first_prompt = questions_to_evaluate[0]["question_text"].strip()
                if len(first_prompt) < 60:
                    paper_title = f"{academic_level} {subject.capitalize()}: {first_prompt}"

            saved_record = SavedEvaluation(
                id=evaluation_id,
                title=paper_title,
                subject=subject.lower(),
                academic_level=academic_level,
                total_score=total_score,
                total_max_score=total_max_score,
                percentage=total_pct,
                status=overall_status,
                total_questions=len(question_results),
                pages_processed=len(page_ocr_items),
                provider=eval_svc.provider,
                model=eval_svc.deepseek_model,
                evaluated_at=datetime.utcnow(),
                ocr_cleaning_summary=overall_cleaning_summary,
                diagram_detected=has_diagram,
                student_answer_snippet=full_student_answer[:400] if full_student_answer else "",
                criteria_breakdown=agg_breakdown,
                full_report=response.dict(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.merge(saved_record)
            db.commit()
            logger.info(f"✅ Successfully persisted evaluation {evaluation_id} to PostgreSQL saved_evaluations table")
    except Exception as db_err:
        logger.warning(f"Could not persist evaluation to PostgreSQL (non-fatal): {db_err}")

    logger.info(f"Evaluation complete for {len(question_results)} questions: {evaluation_id} -> {total_score}/{total_max_score} ({total_pct}%)")
    return response


@router.post("/evaluate", response_model=DirectEvaluationResponse)
async def evaluate_direct(
    question_text: Optional[str] = Form(None, description="Legacy single question prompt"),
    marking_scheme: Optional[str] = Form(None, description="Legacy single question rubric"),
    max_score: Optional[float] = Form(None, description="Legacy single question max score"),
    questions_json: Optional[str] = Form(None, description="JSON array of multiple questions"),
    subject: str = Form("science", description="Academic subject"),
    academic_level: str = Form("Class 10", description="Academic class or grade level"),
    student_answer_text: Optional[str] = Form(None, description="Optional directly typed student answer"),
    files: Optional[List[UploadFile]] = File(None, description="Optional scanned answer sheet images or PDF")
) -> DirectEvaluationResponse:
    """Execute direct multimodal evaluation on single or multi-question student answer sheets."""
    logger.info(f"Received evaluation request: subject={subject}, level={academic_level}")

    questions_to_evaluate = _parse_questions(questions_json, question_text, marking_scheme, max_score)

    files_data: List[Tuple[str, bytes]] = []
    if files:
        for f in files:
            if f.filename:
                content = await f.read()
                if content:
                    files_data.append((f.filename, content))

    return await execute_evaluation_pipeline(
        questions_to_evaluate=questions_to_evaluate,
        files_data=files_data,
        student_answer_text=student_answer_text,
        subject=subject,
        academic_level=academic_level,
        event_callback=None
    )


@router.post("/evaluate-stream")
async def evaluate_direct_stream(
    question_text: Optional[str] = Form(None, description="Legacy single question prompt"),
    marking_scheme: Optional[str] = Form(None, description="Legacy single question rubric"),
    max_score: Optional[float] = Form(None, description="Legacy single question max score"),
    questions_json: Optional[str] = Form(None, description="JSON array of multiple questions"),
    subject: str = Form("science", description="Academic subject"),
    academic_level: str = Form("Class 10", description="Academic class or grade level"),
    student_answer_text: Optional[str] = Form(None, description="Optional directly typed student answer"),
    files: Optional[List[UploadFile]] = File(None, description="Optional scanned answer sheet images or PDF")
):
    """Execute streaming multimodal evaluation, yielding real-time SSE progress events."""
    logger.info(f"Received evaluation stream request: subject={subject}, level={academic_level}")

    questions_to_evaluate = _parse_questions(questions_json, question_text, marking_scheme, max_score)

    files_data: List[Tuple[str, bytes]] = []
    if files:
        for f in files:
            if f.filename:
                content = await f.read()
                if content:
                    files_data.append((f.filename, content))

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def callback(data: Dict[str, Any]):
            await queue.put(data)

        async def runner():
            try:
                await execute_evaluation_pipeline(
                    questions_to_evaluate=questions_to_evaluate,
                    files_data=files_data,
                    student_answer_text=student_answer_text,
                    subject=subject,
                    academic_level=academic_level,
                    event_callback=callback
                )
            except HTTPException as he:
                logger.error(f"HTTPException in stream runner: {he.detail}")
                await queue.put({
                    "stage": "error",
                    "status": "failed",
                    "title": "Evaluation Failed",
                    "message": str(he.detail),
                    "progress": 0,
                    "step": 0
                })
            except Exception as e:
                logger.error(f"Pipeline error in stream runner: {e}")
                await queue.put({
                    "stage": "error",
                    "status": "failed",
                    "title": "Evaluation Failed",
                    "message": str(e),
                    "progress": 0,
                    "step": 0
                })
            finally:
                await queue.put(None)  # Sentinel to terminate generator loop

        runner_task = asyncio.create_task(runner())

        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield f"data: {json.dumps(item)}\n\n"
        finally:
            if not runner_task.done():
                runner_task.cancel()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/override", response_model=ScoreOverrideResponse)
async def override_score(
    override: ScoreOverrideRequest,
    db: Session = Depends(get_db)
) -> ScoreOverrideResponse:
    """Allow an examiner to manually adjust the awarded marks with pedagogical remarks."""
    if override.adjusted_score < 0 or override.adjusted_score > override.max_score:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Adjusted score must be between 0 and {override.max_score}."
        )

    pct = round((override.adjusted_score / override.max_score) * 100.0, 1) if override.max_score > 0 else 0.0
    status_label = "EXEMPLARY" if pct >= 85 else ("PASS" if pct >= 50 else ("NEEDS_IMPROVEMENT" if pct >= 30 else "FAIL"))

    # If evaluation_id is provided, synchronize the score adjustment to the saved evaluation in PostgreSQL
    if override.evaluation_id:
        try:
            record = db.query(SavedEvaluation).filter(SavedEvaluation.id == override.evaluation_id).first()
            if record:
                report = dict(record.full_report) if record.full_report else {}
                if override.question_number is not None and "questions" in report and isinstance(report["questions"], list):
                    # Multi-question paper: update specific question and recalculate total
                    for q in report["questions"]:
                        if q.get("question_number") == override.question_number:
                            q["score"] = override.adjusted_score
                            q["percentage"] = pct
                            q["status"] = status_label
                            q["overall_feedback"] = f"Examiner Override: {override.examiner_notes}"
                            break
                    # Recalculate totals
                    new_total = round(sum(float(q.get("score", 0.0)) for q in report["questions"]), 2)
                    new_max = round(sum(float(q.get("max_score", 0.0)) for q in report["questions"]), 2)
                    new_pct = round((new_total / new_max) * 100.0, 1) if new_max > 0 else 0.0
                    new_overall_status = "EXEMPLARY" if new_pct >= 85 else ("PASS" if new_pct >= 50 else ("NEEDS_IMPROVEMENT" if new_pct >= 30 else "FAIL"))
                    report["total_score"] = new_total
                    report["total_max_score"] = new_max
                    report["percentage"] = new_pct
                    report["status"] = new_overall_status
                    record.total_score = new_total
                    record.total_max_score = new_max
                    record.percentage = new_pct
                    record.status = new_overall_status
                else:
                    # Single-question paper or flat report
                    report["score"] = override.adjusted_score
                    report["total_score"] = override.adjusted_score
                    report["total_max_score"] = override.max_score
                    report["percentage"] = pct
                    report["status"] = status_label
                    record.total_score = override.adjusted_score
                    record.total_max_score = override.max_score
                    record.percentage = pct
                    record.status = status_label

                record.full_report = report
                record.updated_at = datetime.utcnow()
                db.commit()
                logger.info(f"Synchronized score override to PostgreSQL saved_evaluations: {override.evaluation_id}")
        except Exception as db_err:
            logger.warning(f"Could not sync override to PostgreSQL: {db_err}")

    logger.info(f"Examiner override applied: {override.evaluation_id} -> {override.adjusted_score}/{override.max_score}")

    return ScoreOverrideResponse(
        evaluation_id=override.evaluation_id,
        question_number=override.question_number,
        adjusted_score=override.adjusted_score,
        max_score=override.max_score,
        percentage=pct,
        status=status_label,
        examiner_notes=override.examiner_notes,
        updated_at=datetime.utcnow().isoformat()
    )


@router.get("/history", response_model=EvaluationHistoryListResponse)
async def get_evaluation_history(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    academic_level: Optional[str] = Query(None, description="Filter by academic grade or class"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: EXEMPLARY, PASS, NEEDS_IMPROVEMENT, FAIL"),
    search: Optional[str] = Query(None, description="Search term across title, ID, or student snippet"),
    limit: int = Query(50, ge=1, le=200, description="Page size limit"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
) -> EvaluationHistoryListResponse:
    """Retrieve historical evaluation runs stored in PostgreSQL with filtering, search, and aggregate metrics."""
    try:
        query = db.query(SavedEvaluation)

        if subject and subject.strip() and subject.lower() != "all":
            query = query.filter(func.lower(SavedEvaluation.subject) == subject.strip().lower())
        if academic_level and academic_level.strip() and academic_level.lower() != "all":
            query = query.filter(SavedEvaluation.academic_level == academic_level.strip())
        if status_filter and status_filter.strip() and status_filter.upper() != "ALL":
            query = query.filter(SavedEvaluation.status == status_filter.strip().upper())
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    SavedEvaluation.title.ilike(term),
                    SavedEvaluation.id.ilike(term),
                    SavedEvaluation.student_answer_snippet.ilike(term),
                    SavedEvaluation.ocr_cleaning_summary.ilike(term)
                )
            )

        total_count = query.count()
        records = query.order_by(SavedEvaluation.evaluated_at.desc()).offset(offset).limit(limit).all()

        # Compute aggregate metrics across all historical evaluations in database
        all_records = db.query(SavedEvaluation).all()
        total_evals = len(all_records)
        if total_evals > 0:
            avg_pct = round(sum(r.percentage for r in all_records) / total_evals, 1)
            exemplary = sum(1 for r in all_records if r.status == "EXEMPLARY" or r.percentage >= 85)
            pass_cnt = sum(1 for r in all_records if r.status == "PASS" or (50 <= r.percentage < 85))
            needs_imp = sum(1 for r in all_records if r.status == "NEEDS_IMPROVEMENT" or (30 <= r.percentage < 50))
            fail_cnt = sum(1 for r in all_records if r.status == "FAIL" or r.percentage < 30)
            total_q = sum(r.total_questions or 1 for r in all_records)
        else:
            avg_pct = 0.0
            exemplary = 0
            pass_cnt = 0
            needs_imp = 0
            fail_cnt = 0
            total_q = 0

        stats = EvaluationHistoryStats(
            total_evaluations=total_evals,
            average_percentage=avg_pct,
            exemplary_count=exemplary,
            pass_count=pass_cnt,
            needs_improvement_count=needs_imp,
            fail_count=fail_cnt,
            total_questions_evaluated=total_q
        )

        items = [
            SavedEvaluationSummaryItem(
                id=rec.id,
                title=rec.title,
                subject=rec.subject,
                academic_level=rec.academic_level,
                total_score=rec.total_score,
                total_max_score=rec.total_max_score,
                percentage=rec.percentage,
                status=rec.status,
                total_questions=rec.total_questions,
                pages_processed=rec.pages_processed,
                provider=rec.provider,
                model=rec.model,
                evaluated_at=rec.evaluated_at.isoformat() if rec.evaluated_at else "",
                diagram_detected=rec.diagram_detected,
                student_answer_snippet=rec.student_answer_snippet,
                criteria_breakdown=rec.criteria_breakdown
            )
            for rec in records
        ]

        logger.info(f"Retrieved {len(items)} evaluation history records (total matching: {total_count})")
        return EvaluationHistoryListResponse(
            items=items,
            total_count=total_count,
            stats=stats
        )
    except Exception as e:
        logger.error(f"Error querying evaluation history from PostgreSQL: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"PostgreSQL database query failed: {str(e)}"
        )


@router.get("/history/{evaluation_id}")
async def get_evaluation_detail(
    evaluation_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve full evaluation diagnostic report and metadata by ID."""
    try:
        record = db.query(SavedEvaluation).filter(SavedEvaluation.id == evaluation_id).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evaluation record with ID '{evaluation_id}' not found."
            )
        if record.full_report:
            return record.full_report
        return {
            "evaluation_id": record.id,
            "title": record.title,
            "subject": record.subject,
            "academic_level": record.academic_level,
            "total_score": record.total_score,
            "total_max_score": record.total_max_score,
            "percentage": record.percentage,
            "status": record.status,
            "evaluated_at": record.evaluated_at.isoformat() if record.evaluated_at else ""
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving evaluation {evaluation_id} from PostgreSQL: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database query failed: {str(e)}"
        )


@router.delete("/history/{evaluation_id}")
async def delete_evaluation_record(
    evaluation_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete a saved evaluation record from history."""
    try:
        record = db.query(SavedEvaluation).filter(SavedEvaluation.id == evaluation_id).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evaluation record '{evaluation_id}' not found."
            )
        db.delete(record)
        db.commit()
        logger.info(f"Deleted evaluation record {evaluation_id} from PostgreSQL")
        return {"success": True, "deleted_id": evaluation_id, "message": "Evaluation record deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting evaluation {evaluation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database operation failed: {str(e)}"
        )


@router.delete("/history")
async def clear_all_evaluation_history(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Clear all historical evaluation records from PostgreSQL."""
    try:
        count = db.query(SavedEvaluation).delete()
        db.commit()
        logger.info(f"Cleared {count} historical evaluation records from PostgreSQL")
        return {"success": True, "count": count, "message": f"Successfully deleted {count} evaluation records."}
    except Exception as e:
        logger.error(f"Error clearing evaluation history: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database operation failed: {str(e)}"
        )

