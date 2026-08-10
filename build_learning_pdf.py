import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress headers/footers on title page
        
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#555555"))
        
        # Header text
        self.drawString(54, 11 * inch - 36, "K-12 Context-Aware Automated Grading System — Technical Learning Guide")
        self.setStrokeColor(colors.HexColor("#CCCCCC"))
        self.setLineWidth(0.5)
        self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)
        
        # Footer text
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 36, page_str)
        self.drawString(54, 36, "Author: Ujwal Singamsetti | Core AI & RAG Architecture")
        self.line(54, 48, 8.5 * inch - 54, 48)
        
        self.restoreState()

def create_learning_guide_pdf(pdf_output_path):
    doc = SimpleDocTemplate(
        pdf_output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY = colors.HexColor("#1A237E")   # Deep Navy
    SECONDARY = colors.HexColor("#0D47A1") # Ocean Blue
    ACCENT = colors.HexColor("#D81B60")    # Deep Pink / Accent
    DARK_TEXT = colors.HexColor("#212121") # Dark Neutral
    LIGHT_BG = colors.HexColor("#F5F7FA")  # Off White
    
    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=PRIMARY,
        alignment=1, # Center
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=SECONDARY,
        alignment=1,
        spaceAfter=25
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=22,
        textColor=PRIMARY,
        spaceBefore=18,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=17,
        textColor=SECONDARY,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=DARK_TEXT,
        spaceAfter=8,
        alignment=4 # Justified
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        spaceAfter=4,
        alignment=0 # Left
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#004D40"),
        spaceAfter=8
    )

    story = []

    # ==================== COVER / TITLE PAGE ====================
    story.append(Spacer(1, 40))
    story.append(Paragraph("CONTEXT-AWARE AUTOMATED EXAM GRADING SYSTEM", title_style))
    story.append(Paragraph("<b>Comprehensive Technical Architecture & Deep Learning Guide</b><br/>Optical Character Recognition (OCR) • Qdrant Vector Search RAG • Gemini 1.5 Flash LLM Evaluation", subtitle_style))
    
    story.append(HRFlowable(width="80%", thickness=2, color=ACCENT, spaceBefore=10, spaceAfter=20))
    
    # Metadata Block Table
    meta_data = [
        [Paragraph("<b>Author / Engineer:</b>", body_style), Paragraph("Ujwal Singamsetti", body_style)],
        [Paragraph("<b>Domain & Specialization:</b>", body_style), Paragraph("Generative AI, Retrieval-Augmented Generation (RAG), Natural Language Processing, Computer Vision", body_style)],
        [Paragraph("<b>Core Technologies:</b>", body_style), Paragraph("Python 3.11, FastAPI, Qdrant Vector DB, sentence-transformers, Google Cloud Vision OCR, Google Gemini 1.5 Flash, React 18, PostgreSQL", body_style)],
        [Paragraph("<b>Project Scope:</b>", body_style), Paragraph("End-to-End Handwritten Exam Script Digitization, Vector Curriculum Grounding, Multi-Criteria Scoring, Formative Diagnostics", body_style)],
        [Paragraph("<b>Document Version:</b>", body_style), Paragraph("1.0 (Comprehensive Technical Guide)", body_style)]
    ]
    t_meta = Table(meta_data, colWidths=[2.0*inch, 4.5*inch])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#E0E0E0")),
    ]))
    story.append(t_meta)
    
    story.append(Spacer(1, 30))
    
    # Overview Banner Image if present
    if os.path.exists('/Users/ujwalsingamsetti/project-k12/system_architecture.png'):
        story.append(Image('/Users/ujwalsingamsetti/project-k12/system_architecture.png', width=6.5*inch, height=3.8*inch))
        story.append(Paragraph("<font size=8.5 color='#555555'><i>Figure 1.1: System Architecture Diagram of the Context-Aware Automated Grading System</i></font>", ParagraphStyle('Cap', parent=subtitle_style, alignment=1, spaceBefore=4)))
    
    story.append(PageBreak())

    # ==================== CHAPTER 1: SYSTEM OVERVIEW & PROBLEM DOMAIN ====================
    story.append(Paragraph("1. System Overview & Problem Domain", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph("<b>1.1 Introduction</b>", h2_style))
    story.append(Paragraph(
        "Evaluation is an essential cornerstone of academic instruction. However, traditional manual assessment of handwritten descriptive "
        "examinations presents major operational hurdles: it is time-consuming, prone to evaluator fatigue, subject to subjective bias, and "
        "frequently produces only a single numerical score without offering qualitative diagnostic feedback explaining where marks were lost.",
        body_style
    ))

    story.append(Paragraph("<b>1.2 Problem Statement & AI Engineering Solutions</b>", h2_style))
    story.append(Paragraph(
        "Existing Automated Short Answer Grading (ASAG) models face three major technical breakdowns:", body_style
    ))
    story.append(Paragraph("1. <b>Handwriting & Math Notation Degradation:</b> Standard text models cannot parse physical handwritten scripts or multi-line mathematical formulas.", bullet_style))
    story.append(Paragraph("2. <b>LLM Hallucinations:</b> Standalone LLMs lack direct access to specific textbook curricula, leading to incorrect grading or penalizing non-standard yet correct student phrasing.", bullet_style))
    story.append(Paragraph("3. <b>Opaque Numerical Output:</b> Legacy grading tools fail to provide transparent feedback detailing <i>what</i> mistake occurred, <i>why</i> it is wrong, and its exact score <i>impact</i>.", bullet_style))

    story.append(Paragraph("<b>1.3 Key Architectural Advantages</b>", h2_style))
    story.append(Paragraph("• <b>Curriculum Grounding via Qdrant RAG:</b> Anchors LLM evaluation directly in retrieved textbook chapters, eliminating AI hallucinations.", bullet_style))
    story.append(Paragraph("• <b>Hybrid Vector & Keyword Re-ranking:</b> Combines 768-dimensional dense semantic search with domain keyword density matching.", bullet_style))
    story.append(Paragraph("• <b>Granular Diagnostic Breakdown:</b> Outputs detailed JSON containing scores, error categories (*what, why, impact*), missing concepts, and model answers.", bullet_style))

    story.append(Spacer(1, 15))

    # ==================== CHAPTER 2: DEEP DIVE INTO TECH STACK & PIPELINE ====================
    story.append(Paragraph("2. Deep Dive: Technology Stack & Pipeline", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=10))

    # Table of Technologies
    tech_table_data = [
        [Paragraph("<b>Layer / Component</b>", body_style), Paragraph("<b>Technology Selected</b>", body_style), Paragraph("<b>Technical Function</b>", body_style)],
        [Paragraph("<b>OCR Engine</b>", body_style), Paragraph("Google Cloud Vision REST API", body_style), Paragraph("Handwritten text transcription, spatial bounding-box layout parsing.", body_style)],
        [Paragraph("<b>Embedding Model</b>", body_style), Paragraph("<code>all-mpnet-base-v2</code>", body_style), Paragraph("Generates 768-dimensional dense semantic vectors.", body_style)],
        [Paragraph("<b>Vector Database</b>", body_style), Paragraph("Qdrant Vector Engine", body_style), Paragraph("HNSW vector search with <code>subject</code> and <code>class_level</code> payload filters.", body_style)],
        [Paragraph("<b>Generative LLM</b>", body_style), Paragraph("Google Gemini 1.5 Flash", body_style), Paragraph("Grounded prompt evaluation with deterministic JSON output constraints.", body_style)],
        [Paragraph("<b>Backend API</b>", body_style), Paragraph("Python 3.11, FastAPI, Uvicorn", body_style), Paragraph("Asynchronous REST service, background task processing, Pydantic validation.", body_style)],
        [Paragraph("<b>Relational DB</b>", body_style), Paragraph("PostgreSQL, SQLAlchemy, Alembic", body_style), Paragraph("Persistent storage for user accounts, paper rubrics, submissions, and evaluations.", body_style)],
        [Paragraph("<b>Frontend UI</b>", body_style), Paragraph("React 18 / Vite, Tailwind CSS", body_style), Paragraph("Teacher assignment portal, student dashboard, and PDF report card downloads.", body_style)]
    ]
    t_tech = Table(tech_table_data, colWidths=[1.5*inch, 2.2*inch, 2.8*inch])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCCCCC")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_tech)

    story.append(Spacer(1, 15))

    story.append(Paragraph("<b>2.1 The Hybrid Vector Re-ranking Algorithm</b>", h2_style))
    story.append(Paragraph(
        "To prevent dense vector search from missing domain-specific technical keywords in student answers, Ujwal engineered a hybrid re-ranking "
        "algorithm. Semantic similarity scores from Qdrant are boosted using the keyword match density ratio:",
        body_style
    ))
    
    # Formula Display Box
    formula_text = "<b>Score_boosted = min( Score_semantic + ( K_matched / K_total ) × 0.2,  1.0 )</b>"
    story.append(Paragraph(formula_text, ParagraphStyle('Form', parent=code_style, fontSize=11, alignment=1, spaceBefore=6, spaceAfter=10)))
    
    story.append(Paragraph("Where <code>Score_semantic</code> is Qdrant's HNSW vector score, <code>K_matched</code> is the count of matched rubric keywords, and <code>K_total</code> is the total target technical keywords.", body_style))

    story.append(PageBreak())

    # ==================== CHAPTER 3: MODULE WORKFLOW DIAGRAMS ====================
    story.append(Paragraph("3. Module Workflows & Visual Diagrams", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=10))

    if os.path.exists('/Users/ujwalsingamsetti/project-k12/ocr_pipeline_flow.png'):
        story.append(Paragraph("<b>3.1 Optical Character Recognition & Spatial Layout Parsing</b>", h2_style))
        story.append(Image('/Users/ujwalsingamsetti/project-k12/ocr_pipeline_flow.png', width=6.5*inch, height=3.0*inch))
        story.append(Paragraph("<font size=8.5 color='#555555'><i>Figure 3.1: Google Cloud Vision OCR Script Parsing & Layout Reconstruction Workflow</i></font>", ParagraphStyle('Cap2', parent=subtitle_style, alignment=1, spaceBefore=4, spaceAfter=15)))

    if os.path.exists('/Users/ujwalsingamsetti/project-k12/rag_retrieval_flow.png'):
        story.append(Paragraph("<b>3.2 Qdrant Vector Search & Hybrid Re-ranking Pipeline</b>", h2_style))
        story.append(Image('/Users/ujwalsingamsetti/project-k12/rag_retrieval_flow.png', width=6.5*inch, height=3.0*inch))
        story.append(Paragraph("<font size=8.5 color='#555555'><i>Figure 3.2: Qdrant Vector Retrieval and Keyword Hybrid Re-ranking Workflow</i></font>", ParagraphStyle('Cap3', parent=subtitle_style, alignment=1, spaceBefore=4, spaceAfter=15)))

    if os.path.exists('/Users/ujwalsingamsetti/project-k12/gemini_eval_flow.png'):
        story.append(PageBreak())
        story.append(Paragraph("<b>3.3 Gemini 1.5 Flash LLM Evaluation & Diagnostic Parser</b>", h2_style))
        story.append(Image('/Users/ujwalsingamsetti/project-k12/gemini_eval_flow.png', width=6.5*inch, height=3.0*inch))
        story.append(Paragraph("<font size=8.5 color='#555555'><i>Figure 3.3: Gemini 1.5 Flash Evaluation Engine & Diagnostic JSON Generation Workflow</i></font>", ParagraphStyle('Cap4', parent=subtitle_style, alignment=1, spaceBefore=4, spaceAfter=15)))

    # ==================== CHAPTER 4: KEY INTERVIEW & PORTFOLIO LEARNING QUESTIONS ====================
    story.append(Paragraph("4. Portfolio Learning Q&A & Interview Readiness", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=10))

    q_a_data = [
        ("Q1: How does this project prevent LLM hallucinations during grading?",
         "The system enforces Retrieval-Augmented Generation (RAG). Before sending the student's answer to Gemini 1.5 Flash, Qdrant Vector DB retrieves exact reference passages from indexed textbooks based on subject metadata. The LLM receives strict instructions to grade ONLY against the retrieved reference material."),
        
        ("Q2: Why was Qdrant chosen as the vector database?",
         "Qdrant provides high-throughput HNSW vector indexing, fast sub-15ms similarity search, native support for 768-dimensional embeddings (all-mpnet-base-v2), and payload metadata filtering by subject and class level to isolate search space before retrieval."),
        
        ("Q3: How does the OCR pipeline handle handwritten math formulas?",
         "Google Cloud Vision API REST v1 returns bounding-box spatial coordinates for text blocks. The layout parser reconstructs multi-line text and mathematical expressions by ordering blocks geographically (top-to-bottom, left-to-right)."),
        
        ("Q4: What is the diagnostic feedback structure generated by the AI?",
         "Instead of a raw score, every mistake is parsed into 3 dimensions: (1) What error occurred, (2) Why it is scientifically/conceptually incorrect, and (3) Impact on score deduction."),
        
        ("Q5: What are the cost and efficiency metrics of the system?",
         "By combining local Qdrant vector retrieval with Gemini 1.5 Flash token optimization, evaluation cost is under $0.001 per script page, with sub-second retrieval times.")
    ]

    for q, a in q_a_data:
        story.append(Paragraph(f"<b>{q}</b>", h2_style))
        story.append(Paragraph(a, body_style))
        story.append(Spacer(1, 4))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully created at {pdf_output_path}")

if __name__ == '__main__':
    create_learning_guide_pdf('/Users/ujwalsingamsetti/project-k12/K12_SYSTEM_LEARNING_GUIDE.pdf')
