"""Direct Evaluation Router.

Provides standalone endpoints for evaluating handwritten answer sheets and typed text:
- POST /api/evaluation/evaluate: Multipart evaluation with OCR, RAG, and DeepSeek
- GET /api/evaluation/presets: Verified official test question presets
- POST /api/evaluation/override: Examiner manual score adjustments
"""

import os
import uuid
import tempfile
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel, Field
from loguru import logger

from app.core.config import settings
from app.services.ocr_service import get_ocr_service
from app.services.rag_service import RAGService
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/evaluation", tags=["direct_evaluation"])

# Lazy singletons for services
_rag_service: Optional[RAGService] = None
_eval_service: Optional[EvaluationService] = None


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


class DirectEvaluationResponse(BaseModel):
    """Complete evaluation report response payload."""
    evaluation_id: str
    score: float
    max_score: float
    percentage: float
    status: str
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
    provider: str
    model: str
    evaluated_at: str


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
    tags: List[str] = []


class ScoreOverrideRequest(BaseModel):
    """Request payload for manual examiner score adjustment."""
    evaluation_id: Optional[str] = None
    adjusted_score: float
    max_score: float
    examiner_notes: str


class ScoreOverrideResponse(BaseModel):
    """Response payload for manual examiner score adjustment."""
    evaluation_id: Optional[str] = None
    adjusted_score: float
    max_score: float
    percentage: float
    status: str
    examiner_notes: str
    updated_at: str


# ─────────────────────────────────────────────────────────────
# Official Test Presets
# ─────────────────────────────────────────────────────────────

OFFICIAL_PRESETS: List[PresetItem] = [
    PresetItem(
        id="cbse-10-science-redox",
        title="CBSE Class 10 Science: Redox Reactions",
        subject="science",
        academic_level="Class 10",
        max_score=2.0,
        question_text="A shiny brown coloured element 'X' on heating in air becomes black in colour. Name the element 'X' and the black coloured compound formed. Write the chemical equation for the reaction.",
        marking_scheme=(
            "1. Element 'X' is Copper (Cu) and black compound is Copper(II) oxide (CuO) [1 Mark].\n"
            "2. Balanced chemical equation: 2Cu + O2 -> 2CuO (with heat) [1 Mark]."
        ),
        sample_answer_text=(
            "Element 'X' is Copper (Cu). When copper is heated in the presence of oxygen/air, "
            "it oxidises to form black coloured Copper(II) oxide (CuO).\n"
            "Chemical Equation:\n2Cu(s) + O2(g) -> 2CuO(s) (Heat)"
        ),
        tags=["CBSE", "Class 10", "Chemistry", "Verified Test Asset"]
    ),
    PresetItem(
        id="cbse-10-maths-circles",
        title="CBSE Class 10 Maths: Tangents to a Circle",
        subject="mathematics",
        academic_level="Class 10",
        max_score=3.0,
        question_text="Prove that the lengths of tangents drawn from an external point to a circle are equal.",
        marking_scheme=(
            "1. Accurate diagram with circle center O, external point P, tangents PQ and PR [0.5 Mark].\n"
            "2. Statement of Given, To Prove, and Construction (join OP, OQ, OR) [0.5 Mark].\n"
            "3. Proof using RHS congruence in triangles OPQ and OPR: OQ=OR (radii), OP=OP (common), angle OQP=angle ORP=90° [1.5 Marks].\n"
            "4. Conclusion: PQ = PR by CPCT [0.5 Mark]."
        ),
        sample_answer_text=(
            "Given: A circle with centre O and point P lying outside the circle. PQ and PR are tangents.\n"
            "To Prove: PQ = PR.\n"
            "Construction: Join OP, OQ, and OR.\n"
            "Proof:\n"
            "In right triangle OQP and right triangle ORP:\n"
            "- OQ = OR (radii of same circle)\n"
            "- OP = OP (common hypotenuse)\n"
            "- angle OQP = angle ORP = 90° (radius is perpendicular to tangent at point of contact)\n"
            "Therefore, triangle OQP is congruent to triangle ORP (by RHS congruence criterion).\n"
            "Hence, PQ = PR (by CPCT). Hence Proved."
        ),
        tags=["CBSE", "Class 10", "Geometry", "Standard Proof"]
    ),
    PresetItem(
        id="cbse-12-physics-gauss",
        title="CBSE Class 12 Physics: Gauss's Law & Flux",
        subject="physics",
        academic_level="Class 12",
        max_score=5.0,
        question_text="State Gauss's law in electrostatics. Using Gauss's law, derive an expression for the electric field due to an infinitely long straight wire of uniform linear charge density lambda.",
        marking_scheme=(
            "1. Statement of Gauss's Law: Total electric flux through a closed surface is 1/epsilon_0 times total charge enclosed. Formula: integral E.dA = q_enclosed / epsilon_0 [1.5 Marks].\n"
            "2. Identification of cylindrical Gaussian surface of radius r and length L coaxial with wire [1 Mark].\n"
            "3. Calculation of flux through circular end caps (flux = 0 since E perpendicular to dA) [0.5 Mark].\n"
            "4. Calculation of flux through curved surface: E * 2*pi*r*L [1 Mark].\n"
            "5. Applying Gauss law: E * 2*pi*r*L = (lambda * L) / epsilon_0 => E = lambda / (2*pi*epsilon_0*r) [1 Mark]."
        ),
        sample_answer_text=(
            "Gauss's Law states that the total electric flux through any closed Gaussian surface in vacuum is equal to 1/epsilon_0 times the net electric charge enclosed inside the surface: phi = integral E.ds = q_encl / epsilon_0.\n"
            "Derivation for Infinitely Long Straight Wire:\n"
            "Consider a long wire with uniform linear charge density lambda.\n"
            "Choose a cylindrical Gaussian surface of radius r and length L concentric with the wire.\n"
            "- On the flat circular bases, electric field E is radial and surface vector ds is axial (angle = 90°), so flux = 0.\n"
            "- On the curved surface, E is perpendicular to the wire and parallel to normal ds (angle = 0°).\n"
            "Total flux = E * (Curved surface area) = E * 2*pi*r*L.\n"
            "Charge enclosed q = lambda * L.\n"
            "By Gauss's law: E * 2*pi*r*L = (lambda * L) / epsilon_0\n"
            "Therefore, E = lambda / (2 * pi * epsilon_0 * r)."
        ),
        tags=["CBSE", "Class 12", "Electrostatics", "Core Derivation"]
    ),
    PresetItem(
        id="cbse-12-cs-stack",
        title="CBSE Class 12 Computer Science: Stack ADT",
        subject="computer_science",
        academic_level="Class 12",
        max_score=3.0,
        question_text="Write functions in Python to implement Push(Book) and Pop() operations on a stack named BookStack, where each element is a list containing [BookNo, BookName]. Handle stack overflow and underflow conditions.",
        marking_scheme=(
            "1. Push definition accepting Book parameter and appending to stack [1 Mark].\n"
            "2. Pop definition with Underflow check (when stack is empty returning None or message) and list pop() [1.5 Marks].\n"
            "3. Correct variable naming and syntax [0.5 Mark]."
        ),
        sample_answer_text=(
            "BookStack = []\n\n"
            "def Push(Book):\n"
            "    # Push operation\n"
            "    BookStack.append(Book)\n"
            "    print(f'Pushed {Book} successfully.')\n\n"
            "def Pop():\n"
            "    # Pop operation with Underflow check\n"
            "    if len(BookStack) == 0:\n"
            "        print('Stack Underflow! Cannot pop from empty stack.')\n"
            "        return None\n"
            "    else:\n"
            "        removed = BookStack.pop()\n"
            "        return removed"
        ),
        tags=["CBSE", "Class 12", "Data Structures", "Python"]
    ),
    PresetItem(
        id="cbse-12-chem-coordination",
        title="CBSE Class 12 Chemistry: Coordination Compounds",
        subject="chemistry",
        academic_level="Class 12",
        max_score=4.0,
        question_text="State Werner's theory of coordination compounds. Mention the two types of valencies possessed by a central metal atom and distinguish between them with an example.",
        marking_scheme=(
            "1. Statement of Werner's Theory [1 Mark].\n"
            "2. Primary Valency: Ionisable, satisfied by negative ions, corresponds to oxidation state [1 Mark].\n"
            "3. Secondary Valency: Non-ionisable, satisfied by neutral or negative ligands, corresponds to coordination number and gives definite geometry [1 Mark].\n"
            "4. Suitable example (e.g., [Co(NH3)6]Cl3: primary valency 3, secondary valency 6) [1 Mark]."
        ),
        sample_answer_text=(
            "Werner's Theory Postulates:\n"
            "1. Central metal atoms in coordination compounds exhibit two types of linkages (valencies): Primary valency and Secondary valency.\n"
            "2. Primary Valency: It is ionisable, non-directional, and satisfied exclusively by negative ions. It corresponds to the oxidation state of the metal.\n"
            "3. Secondary Valency: It is non-ionisable, directional in space, and satisfied by negative ions or neutral molecules (ligands). It corresponds to the coordination number and determines spatial geometry.\n"
            "Example:\n"
            "In [Co(NH3)6]Cl3, cobalt has Primary Valency = +3 (satisfied by 3 chloride ions which precipitate with AgNO3) and Secondary Valency = 6 (satisfied by 6 NH3 molecules giving octahedral geometry)."
        ),
        tags=["CBSE", "Class 12", "Inorganic Chemistry", "Werner's Theory"]
    )
]


# ─────────────────────────────────────────────────────────────
# Helper: PDF to Images converter
# ─────────────────────────────────────────────────────────────

async def _extract_images_from_pdf(pdf_path: str, temp_dir: str) -> List[str]:
    """Convert pages of a PDF into PNG images using PyMuPDF (fitz) asynchronously."""
    def _convert() -> List[str]:
        import fitz
        doc = fitz.open(pdf_path)
        extracted_image_paths = []
        for page_num in range(len(doc)):
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


@router.post("/evaluate", response_model=DirectEvaluationResponse)
async def evaluate_direct(
    question_text: str = Form(..., description="The examination question text"),
    marking_scheme: str = Form(..., description="The official marking rubric or criteria"),
    subject: str = Form("science", description="Academic subject"),
    academic_level: str = Form("Class 10", description="Academic class or grade level"),
    max_score: float = Form(10.0, description="Maximum allocatable marks"),
    student_answer_text: Optional[str] = Form(None, description="Optional directly typed student answer"),
    files: Optional[List[UploadFile]] = File(None, description="Optional scanned answer sheet images or PDF")
) -> DirectEvaluationResponse:
    """Execute direct multimodal evaluation on a student's answer sheet.

    Pipeline:
    1. Multimodal OCR via Google Cloud Vision API with Gemini Vision fallback.
    2. RAG curriculum context retrieval via SentenceTransformers and Qdrant.
    3. Multi-criteria reasoning evaluation via DeepSeek API (deepseek-chat).
    """
    logger.info(f"Received direct evaluation request: subject={subject}, level={academic_level}, max_score={max_score}")

    extracted_parts: List[str] = []
    diagram_metadata: Dict[str, Any] = {"has_diagrams": False, "shapes_detected": []}
    has_diagram = False

    ocr_svc = get_ocr_service()

    # Step 1: Process uploaded files if provided
    if files and len(files) > 0:
        with tempfile.TemporaryDirectory() as temp_dir:
            for upload_file in files:
                if not upload_file.filename:
                    continue
                filename_lower = upload_file.filename.lower()
                safe_name = f"{uuid.uuid4().hex}_{os.path.basename(upload_file.filename)}"
                temp_file_path = os.path.join(temp_dir, safe_name)

                content = await upload_file.read()
                if not content:
                    continue

                with open(temp_file_path, "wb") as f:
                    f.write(content)

                if filename_lower.endswith(".pdf"):
                    # Process PDF: convert pages to images
                    page_images = await _extract_images_from_pdf(temp_file_path, temp_dir)
                    for p_idx, p_img in enumerate(page_images):
                        txt, d_meta = await ocr_svc.extract_text_from_image_async(p_img)
                        if txt:
                            extracted_parts.append(f"[Page {p_idx+1} OCR]:\n{txt}")
                        if d_meta and d_meta.get("has_diagrams"):
                            has_diagram = True
                            diagram_metadata["has_diagrams"] = True
                            diagram_metadata["shapes_detected"].extend(d_meta.get("shapes_detected", []))
                else:
                    # Process Image directly
                    txt, d_meta = await ocr_svc.extract_text_from_image_async(temp_file_path)
                    if txt:
                        extracted_parts.append(txt)
                    if d_meta and d_meta.get("has_diagrams"):
                        has_diagram = True
                        diagram_metadata["has_diagrams"] = True
                        diagram_metadata["shapes_detected"].extend(d_meta.get("shapes_detected", []))

    # Combine OCR text and manual answer text
    combined_ocr_text = "\n\n".join(extracted_parts).strip()
    full_student_answer = combined_ocr_text

    if student_answer_text and student_answer_text.strip():
        if full_student_answer:
            full_student_answer = f"{full_student_answer}\n\n[Additional Typed Answer]:\n{student_answer_text.strip()}"
        else:
            full_student_answer = student_answer_text.strip()

    if not full_student_answer:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No student answer text could be extracted or was provided. Please upload a clear image/PDF or enter typed answer text."
        )

    # Step 2: RAG Context Retrieval
    rag_svc = get_rag_service()
    rag_query = f"{question_text} {marking_scheme}"
    rag_chunks = await rag_svc.retrieve_relevant_context_async(
        query=rag_query,
        subject=subject,
        class_level=academic_level,
        top_k=3
    )

    textbook_context = "\n\n".join([c.get("text", "") for c in rag_chunks]) if rag_chunks else ""
    rag_scores = [float(c.get("score", 0.0)) for c in rag_chunks] if rag_chunks else []

    # Step 3: LLM Evaluation (DeepSeek with Gemini fallback)
    eval_svc = get_eval_service()
    eval_result = await eval_svc.evaluate_answer_async(
        question=question_text,
        student_answer=full_student_answer,
        textbook_context=textbook_context,
        subject=subject,
        class_level=academic_level,
        max_score=int(round(max_score)),
        diagram_info=diagram_metadata if has_diagram else None,
        marking_scheme={"rubric": marking_scheme},
        rag_scores=rag_scores,
        system_type="general",
        academic_level=academic_level
    )

    eval_score = float(eval_result.get("score", 0.0))
    pct = round((eval_score / max_score) * 100.0, 1) if max_score > 0 else 0.0

    eval_status = "EXEMPLARY" if pct >= 85 else ("PASS" if pct >= 50 else ("NEEDS_IMPROVEMENT" if pct >= 30 else "FAIL"))

    evaluation_id = str(uuid.uuid4())

    meta = eval_result.get("metadata", {})
    provider_used = meta.get("provider", eval_svc.provider)
    model_used = meta.get("model", eval_svc.deepseek_model)

    response = DirectEvaluationResponse(
        evaluation_id=evaluation_id,
        score=eval_score,
        max_score=max_score,
        percentage=pct,
        status=eval_status,
        breakdown=eval_result.get("breakdown", {
            "factual_correctness": round(eval_score * 0.5, 1),
            "structural_completeness": round(eval_score * 0.3, 1),
            "conceptual_understanding": round(eval_score * 0.2, 1)
        }),
        correct_points=eval_result.get("correct_points", []),
        misconceptions=eval_result.get("misconceptions", []),
        missing_concepts=eval_result.get("missing_concepts", []),
        correct_answer_should_include=eval_result.get("correct_answer_should_include", []),
        improvement_guidance=eval_result.get("improvement_guidance", []),
        overall_feedback=eval_result.get("overall_feedback", "Evaluation completed successfully."),
        extracted_text=full_student_answer,
        diagram_detected=has_diagram,
        diagram_metadata=diagram_metadata if has_diagram else None,
        rag_sources=rag_chunks,
        provider=provider_used,
        model=model_used,
        evaluated_at=datetime.utcnow().isoformat()
    )

    logger.info(f"Evaluation complete: {evaluation_id} -> {eval_score}/{max_score} ({pct}%)")
    return response


@router.post("/override", response_model=ScoreOverrideResponse)
async def override_score(override: ScoreOverrideRequest) -> ScoreOverrideResponse:
    """Allow an examiner to manually adjust the awarded marks with pedagogical remarks."""
    if override.adjusted_score < 0 or override.adjusted_score > override.max_score:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Adjusted score must be between 0 and {override.max_score}."
        )

    pct = round((override.adjusted_score / override.max_score) * 100.0, 1) if override.max_score > 0 else 0.0
    status_label = "EXEMPLARY" if pct >= 85 else ("PASS" if pct >= 50 else ("NEEDS_IMPROVEMENT" if pct >= 30 else "FAIL"))

    logger.info(f"Examiner override applied: {override.evaluation_id} -> {override.adjusted_score}/{override.max_score}")

    return ScoreOverrideResponse(
        evaluation_id=override.evaluation_id,
        adjusted_score=override.adjusted_score,
        max_score=override.max_score,
        percentage=pct,
        status=status_label,
        examiner_notes=override.examiner_notes,
        updated_at=datetime.utcnow().isoformat()
    )
