import os
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, Flowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import pypdf

import report_data as rd
import report_content_ch1_ch3 as ch1_3
import report_content_ch4_ch6 as ch4_6

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
FIGURES_DIR = os.path.join(BASE_DIR, "k12-answer-evaluator", "docs", "figures")
PDF_OUTPUT_PATH = "K12_Automated_Grading_Final_Report.pdf"

# Fonts
try:
    pdfmetrics.registerFont(TTFont('Arial', '/System/Library/Fonts/Supplemental/Arial.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Bold', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Italic', '/System/Library/Fonts/Supplemental/Arial Italic.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-BoldItalic', '/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf'))
    FONT_NORMAL = 'Arial'
    FONT_BOLD = 'Arial-Bold'
    FONT_ITALIC = 'Arial-Italic'
except Exception:
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'
    FONT_ITALIC = 'Helvetica-Oblique'


def int_to_roman(num: int) -> str:
    val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
    syb = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i']
    roman_num = ''
    i = 0
    while num > 0:
        for _ in range(num // val[i]):
            roman_num += syb[i]
            num -= val[i]
        i += 1
    return roman_num


class CustomCanvas(canvas.Canvas):
    chapter1_page = 9999

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        c1 = CustomCanvas.chapter1_page
        width, height = A4
        for state in self._saved_page_states:
            self.__dict__.update(state)
            p = self._pageNumber
            if p == 1:
                pass
            elif p < c1:
                self.setFont(FONT_NORMAL, 10)
                self.setFillColor(HexColor('#334155'))
                self.drawCentredString(width / 2.0, 36, int_to_roman(p))
            else:
                self.setFont(FONT_NORMAL, 10)
                self.setFillColor(HexColor('#0F172A'))
                arabic_str = str(p - c1 + 1)
                self.drawCentredString(width / 2.0, 36, arabic_str)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)


class MarkChapter1(Flowable):
    def __init__(self):
        super().__init__()
        self.width = 0
        self.height = 0
    def wrap(self, w, h):
        return (0, 0)
    def draw(self):
        CustomCanvas.chapter1_page = self.canv._pageNumber


class PageTracker(Flowable):
    def __init__(self, key, collector_dict):
        super().__init__()
        self.key = key
        self.collector = collector_dict
        self.width = 0
        self.height = 0
    def wrap(self, w, h):
        return (0, 0)
    def draw(self):
        c1 = CustomCanvas.chapter1_page
        p = self.canv._pageNumber
        if p >= c1:
            self.collector[self.key] = str(p - c1 + 1)
        else:
            self.collector[self.key] = int_to_roman(p)


# Global page collector for dynamic two-pass build
PAGE_MAP = {}

TOC_STRUCTURE = [
    ("", "ABSTRACT", True, "front_abstract"),
    ("", "LIST OF ABBREVIATIONS", True, "front_abbr"),
    ("", "LIST OF FIGURES", True, "front_figures"),
    ("", "LIST OF TABLES", True, "front_tables"),
    ("1", "INTRODUCTION", True, "ch1"),
    ("1.1", "Background and Domain Motivation", False, "sec_1_1"),
    ("1.2", "Problem Domain Failure Analysis", False, "sec_1_2"),
    ("1.3", "Comparative Paradigm Analysis", False, "sec_1_3"),
    ("1.4", "Formal Problem Statement and Definitions", False, "sec_1_4"),
    ("1.5", "Concrete Architectural Contributions", False, "sec_1_5"),
    ("1.6", "Organization of the Project Report", False, "sec_1_6"),
    ("2", "LITERATURE SURVEY", True, "ch2"),
    ("2.1", "Theoretical Foundations", False, "sec_2_1"),
    ("2.2", "Literature Review Matrix", False, "sec_2_2"),
    ("2.3", "Deep Dive Benchmark Against Base Paper", False, "sec_2_3"),
    ("2.4", "Computational Complexity Analysis", False, "sec_2_4"),
    ("2.5", "Research Gaps Identified in Existing Literature", False, "sec_2_5"),
    ("2.6", "Strategic Architectural Advantages of Proposed System", False, "sec_2_6"),
    ("3", "AIM AND SCOPE OF THE PRESENT INVESTIGATION", True, "ch3"),
    ("3.1", "Aim of the Investigation", False, "sec_3_1"),
    ("3.2", "Specific Research Aims and Formal Hypotheses", False, "sec_3_2"),
    ("3.3", "Scope of Investigation", False, "sec_3_3"),
    ("3.4", "Target User Groups and Operational Scenarios", False, "sec_3_4"),
    ("3.5", "System Feasibility Study and Risk Assessment", False, "sec_3_5"),
    ("3.6", "Resiliency, Circuit Breakers and Graceful Degradation", False, "sec_3_6"),
    ("3.7", "Hardware, Operating System and Software Stack", False, "sec_3_7"),
    ("4", "MATERIALS AND METHODS; ALGORITHMS USED", True, "ch4"),
    ("4.1", "Master System Architecture Blueprint", False, "sec_4_1"),
    ("4.2", "Module 1: Document Ingestion and Preprocessing Pipeline", False, "sec_4_2"),
    ("4.3", "Module 2: Layout Analysis and Spatial Bounding Logic", False, "sec_4_3"),
    ("4.4", "Module 3: Relational Schema and Vector Index Optimization", False, "sec_4_4"),
    ("4.5", "Module 4: Autonomous Answer Normalization and Collation", False, "sec_4_5"),
    ("4.6", "Module 5: Curriculum-Grounded Vector Retrieval Engine", False, "sec_4_6"),
    ("4.7", "Module 6: Dual-Route Automated Grading Engine", False, "sec_4_7"),
    ("4.8", "Module 7: Human-in-the-Loop Governance and Audit Trail", False, "sec_4_8"),
    ("4.9", "Module 8: System Operational Cost and TCO Analysis", False, "sec_4_9"),
    ("4.10", "Module 9: Web Client Architecture and Real-Time SSE", False, "sec_4_10"),
    ("5", "RESULTS AND DISCUSSION, PERFORMANCE ANALYSIS", True, "ch5"),
    ("5.1", "Experimental Setup and Evaluation Benchmark Datasets", False, "sec_5_1"),
    ("5.2", "Core Metric Accuracy Benchmark", False, "sec_5_2"),
    ("5.3", "Qualitative Empirical Evaluation Traces", False, "sec_5_3"),
    ("5.4", "Retrieval Precision, Faithfulness, and Error Suppression", False, "sec_5_4"),
    ("5.5", "Systematic Component Ablation Study", False, "sec_5_5"),
    ("5.6", "Hyperparameter Sensitivity and Pareto Frontier Analysis", False, "sec_5_6"),
    ("5.7", "End-to-End Execution Latency Telemetry Waterfall", False, "sec_5_7"),
    ("5.8", "Scalability and Stress Testing Under High Concurrency", False, "sec_5_8"),
    ("5.9", "Robustness Analysis: Noise, Typos, and Data Dropout", False, "sec_5_9"),
    ("5.10", "Industry Framework Benchmark Comparison", False, "sec_5_10"),
    ("5.11", "Real-World Enterprise Production Case Study", False, "sec_5_11"),
    ("5.12", "Error Propagation Analysis Across System Tiers", False, "sec_5_12"),
    ("6", "SUMMARY, CONCLUSIONS AND FUTURE WORK", True, "ch6"),
    ("6.1", "Summary of Research Accomplishments", False, "sec_6_1"),
    ("6.2", "Key Architectural Innovations Validated", False, "sec_6_2"),
    ("6.3", "Key Academic and Industrial Takeaways", False, "sec_6_3"),
    ("6.4", "Limitations Observed in Current Deployment", False, "sec_6_4"),
    ("6.5", "Enterprise Deployment Best Practices", False, "sec_6_5"),
    ("6.6", "The Path Forward: Future Research Directions", False, "sec_6_6"),
    ("6.7", "Final Concluding Verdict", False, "sec_6_7"),
    ("", "REFERENCES", True, "references"),
]

FIGURES_STRUCTURE = [
    ("Fig 1.1", "Master System Architecture and End-to-End Evaluation Workflow", "fig_1_1"),
    ("Fig 2.1", "Empirical Performance & Baseline Benchmark Comparison", "fig_2_1"),
    ("Fig 3.1", "Multi-Page Answer Collation and Ingestion Sequence", "fig_3_1"),
    ("Fig 4.1", "Optical Character Recognition & Vision Preprocessing Pipeline", "fig_4_1"),
    ("Fig 4.2", "Relational Database Schema & Vector Index Topology", "fig_4_2"),
    ("Fig 4.3", "Teacher Evaluation Workbench & Audit Trail Architecture", "fig_4_3"),
    ("Fig 4.4", "Dual-Route Evaluation Engine & Rubric Scoring Pipeline", "fig_4_4"),
    ("Fig 4.5", "Curriculum-Grounded Vector Retrieval & Context Injection", "fig_4_5"),
    ("Fig 4.6", "Mathematical Formulations: Hough Deskewing & Cosine Geometry", "fig_4_6"),
]

TABLES_STRUCTURE = [
    ("Table 1.1", "Systematic Comparison of Information Retrieval Paradigms in Exam Evaluation", "tbl_1_1"),
    ("Table 2.1", "Literature Review Matrix (14 State-of-the-Art Peer-Reviewed Papers)", "tbl_2_1"),
    ("Table 2.2", "Deep Dive Architectural Feature Benchmark: Baseline vs. Proposed System", "tbl_2_2"),
    ("Table 3.1", "Target Operational User Personas and Workflow Specifications", "tbl_3_1"),
    ("Table 3.2", "Feasibility Study & Implementation Risk Assessment Matrix", "tbl_3_2"),
    ("Table 3.3", "Hardware, Operating System, and Software Stack Specifications", "tbl_3_3"),
    ("Table 4.1", "Relational Database Schema and Constraint Specifications", "tbl_4_1"),
    ("Table 4.2", "Structured JSON Schema & Prompt Template Specifications", "tbl_4_2"),
    ("Table 4.3a", "Step-by-Step Numerical Walkthrough: 3-Tier Multi-Criteria Rubric Scoring", "tbl_4_3a"),
    ("Table 4.3", "System Operational Cost Analysis: Commercial Cloud vs. Self-Hosted TCO", "tbl_4_3"),
    ("Table 5.1", "Comparative Evaluation Accuracy Across Question Complexity Levels", "tbl_5_1"),
    ("Table 5.2", "Retrieval Quality, Faithfulness, and Hallucination Suppression Metrics", "tbl_5_2"),
    ("Table 5.3", "Systematic Component Ablation Study on Benchmark Evaluation Set", "tbl_5_3"),
    ("Table 5.4", "End-to-End Processing Latency Breakdown Across Subsystem Pipeline", "tbl_5_4"),
    ("Table 5.5", "Throughput and Latency Scalability Under Concurrent User Loads", "tbl_5_5"),
    ("Table 5.6", "System Robustness Under Optical Noise, Skew, and Handwriting Artifacts", "tbl_5_6"),
    ("Table 5.7", "Comparative Feature and Performance Matrix vs. Leading Frameworks", "tbl_5_7"),
    ("Table R.1", "Systematic Architectural Mapping of Literature References to Subsystems", "tbl_r_1"),
    ("Table R.2", "Cross-Reference Correlation Between Research Objectives and Literature", "tbl_r_2"),
]


def build_story(page_map):
    story = []
    styles = getSampleStyleSheet()

    # Headings and Body Styles
    h_chap = ParagraphStyle(
        'HChap', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=14, leading=18,
        alignment=TA_CENTER, spaceBefore=14, spaceAfter=8,
        textColor=HexColor('#0F172A'), keepWithNext=True
    )
    h_sec = ParagraphStyle(
        'HSec', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=12, leading=16,
        alignment=TA_LEFT, spaceBefore=10, spaceAfter=4,
        textColor=HexColor('#0F172A'), keepWithNext=True
    )
    h_subsec = ParagraphStyle(
        'HSubSec', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=11, leading=15,
        alignment=TA_LEFT, spaceBefore=8, spaceAfter=3,
        textColor=HexColor('#1E293B'), keepWithNext=True
    )
    p_body = ParagraphStyle(
        'PBody', parent=styles['Normal'],
        fontName=FONT_NORMAL, fontSize=11, leading=16,  # 1.45-1.5 line spacing
        alignment=TA_JUSTIFY, firstLineIndent=0, spaceAfter=6,
        textColor=HexColor('#1E293B')
    )
    p_code = ParagraphStyle(
        'PCode', parent=styles['Normal'],
        fontName='Courier', fontSize=8, leading=10.5,
        alignment=TA_LEFT, spaceBefore=4, spaceAfter=6,
        textColor=HexColor('#0F172A')
    )
    p_caption_above = ParagraphStyle(
        'CapAbove', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=9.5, leading=13,
        alignment=TA_LEFT, spaceBefore=8, spaceAfter=4,
        textColor=HexColor('#0F172A'), keepWithNext=True
    )
    p_caption_below = ParagraphStyle(
        'CapBelow', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=9.5, leading=13,
        alignment=TA_CENTER, spaceBefore=4, spaceAfter=8,
        textColor=HexColor('#0F172A')
    )

    # Table cell typography
    th_style = ParagraphStyle('TH', fontName=FONT_BOLD, fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=HexColor('#0F172A'))
    td_style = ParagraphStyle('TD', fontName=FONT_NORMAL, fontSize=8, leading=10.5, alignment=TA_LEFT, textColor=HexColor('#1E293B'))
    td_center = ParagraphStyle('TDC', fontName=FONT_NORMAL, fontSize=8, leading=10.5, alignment=TA_CENTER, textColor=HexColor('#1E293B'))
    td_right = ParagraphStyle('TDR', fontName=FONT_NORMAL, fontSize=8, leading=10.5, alignment=TA_RIGHT, textColor=HexColor('#1E293B'))

    th_toc = ParagraphStyle('THToc', fontName=FONT_BOLD, fontSize=9.5, leading=13, alignment=TA_LEFT, textColor=HexColor('#0F172A'))
    th_toc_pg = ParagraphStyle('THTocPg', fontName=FONT_BOLD, fontSize=9.5, leading=13, alignment=TA_RIGHT, textColor=HexColor('#0F172A'))
    td_toc_title = ParagraphStyle('TDTocT', fontName=FONT_NORMAL, fontSize=9, leading=12.5, alignment=TA_LEFT, textColor=HexColor('#1E293B'))
    td_toc_bold = ParagraphStyle('TDTocB', fontName=FONT_BOLD, fontSize=9, leading=12.5, alignment=TA_LEFT, textColor=HexColor('#0F172A'))
    td_toc_pg = ParagraphStyle('TDTocP', fontName=FONT_NORMAL, fontSize=9, leading=12.5, alignment=TA_RIGHT, textColor=HexColor('#1E293B'))
    td_toc_pg_bold = ParagraphStyle('TDTocPB', fontName=FONT_BOLD, fontSize=9, leading=12.5, alignment=TA_RIGHT, textColor=HexColor('#0F172A'))

    # Clean Booktabs Table Style
    clean_table_style = TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1.0, HexColor('#0F172A')),
        ('LINEBELOW', (0, 0), (-1, 0), 0.75, HexColor('#334155')),
        ('LINEBELOW', (0, -1), (-1, -1), 1.0, HexColor('#0F172A')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ])

    toc_table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
    ])

    # ═════════════════════════════════════════════════════════════════════
    # FRONT MATTER
    # ═════════════════════════════════════════════════════════════════════

    # PAGE 1: TITLE / COVER PAGE (Page i - suppressed)
    p_cov_title = ParagraphStyle('CTitle', fontName=FONT_BOLD, fontSize=13, leading=17, alignment=TA_CENTER, textColor=HexColor('#0F172A'))
    p_cov_sub = ParagraphStyle('CSub', fontName=FONT_BOLD, fontSize=11, leading=15, alignment=TA_CENTER, textColor=HexColor('#0F172A'))
    p_cov_body = ParagraphStyle('CBody', fontName=FONT_NORMAL, fontSize=10, leading=14, alignment=TA_CENTER, textColor=HexColor('#1E293B'))
    p_cov_auth = ParagraphStyle('CAuth', fontName=FONT_NORMAL, fontSize=10.5, leading=15, alignment=TA_CENTER, textColor=HexColor('#0F172A'))

    img1_path = os.path.join(ASSETS_DIR, "image1.jpeg")
    img2_path = os.path.join(ASSETS_DIR, "image2.jpeg")

    story.append(Paragraph(rd.PROJECT_TITLE, p_cov_title))
    story.append(Spacer(1, 12))
    story.append(Paragraph("<b>PROJECT REPORT</b><br/>Submitted in partial fulfillment of the requirements for the award of<br/>Bachelor of Engineering degree in Computer Science and Engineering", p_cov_body))
    story.append(Spacer(1, 14))

    if os.path.exists(img1_path):
        story.append(Image(img1_path, width=3.8 * inch, height=1.05 * inch))
        story.append(Spacer(1, 10))

    story.append(Paragraph(f"<b>By</b><br/><b>{rd.STUDENT_1_NAME} (Reg. No – {rd.STUDENT_1_REG})</b><br/><b>{rd.STUDENT_2_NAME} (Reg. No – {rd.STUDENT_2_REG})</b>", p_cov_auth))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"<b>{rd.DEPARTMENT_NAME}<br/>{rd.SCHOOL_NAME}</b>", p_cov_sub))
    story.append(Spacer(1, 10))

    if os.path.exists(img2_path):
        story.append(Image(img2_path, width=4.8 * inch, height=0.95 * inch))
        story.append(Spacer(1, 8))

    story.append(Paragraph(f"<b>{rd.UNIVERSITY_NAME}</b><br/>{rd.UNIVERSITY_SUB}<br/>{rd.UNIVERSITY_ACCREDITATION}<br/>{rd.LOCATION}<br/><br/><b>{rd.MONTH_YEAR}</b>", p_cov_body))
    story.append(PageBreak())

    # PAGE 2: BONAFIDE CERTIFICATE (Page ii)
    story.append(Paragraph(rd.DEPARTMENT_NAME, h_sec))
    story.append(Spacer(1, 6))
    story.append(Paragraph("BONAFIDE CERTIFICATE", h_chap))
    story.append(Spacer(1, 14))
    story.append(Paragraph(rd.CERT_TEXT, p_body))
    story.append(Spacer(1, 35))

    sig_data = [
        [Paragraph(f"<b>Internal Guide</b><br/><br/><br/><br/><b>{rd.GUIDE_NAME}</b><br/>{rd.GUIDE_DESIGNATION}", td_style),
         Paragraph(f"<b>Head of the Department</b><br/><br/><br/><br/><b>{rd.HOD_NAME}</b><br/>{rd.HOD_DESIGNATION}", td_style)]
    ]
    t_sig = Table(sig_data, colWidths=[210, 210])
    t_sig.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0)]))
    story.append(t_sig)
    story.append(Spacer(1, 35))
    story.append(Paragraph("Submitted for Project Viva Voce Examination held on ____________________", p_body))
    story.append(Spacer(1, 24))

    viva_data = [[Paragraph("<b>Internal Examiner</b>", td_center), Paragraph("<b>External Examiner</b>", td_center)]]
    t_viva = Table(viva_data, colWidths=[210, 210])
    t_viva.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('ALIGN', (0,0), (-1,-1), 'CENTER')]))
    story.append(t_viva)
    story.append(PageBreak())

    # PAGE 3: DECLARATION (Page iii)
    story.append(Paragraph("DECLARATION", h_chap))
    story.append(Spacer(1, 14))
    story.append(Paragraph(rd.DECL_TEXT, p_body))
    story.append(Spacer(1, 40))

    decl_sig_data = [
        [Paragraph("<b>DATE:</b><br/><b>PLACE:</b> Chennai", td_style),
         Paragraph(f"<b>SIGNATURE OF THE CANDIDATES:</b><br/><br/>1. ____________________________ ({rd.STUDENT_1_NAME})<br/><br/>2. ____________________________ ({rd.STUDENT_2_NAME})", td_style)]
    ]
    t_decl_sig = Table(decl_sig_data, colWidths=[180, 240])
    t_decl_sig.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0)]))
    story.append(t_decl_sig)
    story.append(PageBreak())

    # PAGE 4: ACKNOWLEDGEMENTS (Page iv)
    story.append(Paragraph("ACKNOWLEDGEMENT", h_chap))
    story.append(Spacer(1, 12))
    for p in rd.ACK_PARAS:
        story.append(Paragraph(p, p_body))
    story.append(PageBreak())

    # PAGE 5: ABSTRACT (Page v)
    story.append(PageTracker("front_abstract", page_map))
    story.append(Paragraph("ABSTRACT", h_chap))
    story.append(Spacer(1, 12))
    story.append(Paragraph(rd.ABSTRACT_TEXT, p_body))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"<b>Keywords:</b> {rd.KEYWORDS_TEXT}", p_body))
    story.append(PageBreak())

    # TABLE OF CONTENTS (Naturally flowing, no CONTINUED text)
    story.append(Paragraph("TABLE OF CONTENTS", h_chap))
    story.append(Spacer(1, 8))

    toc_rows = [
        [Paragraph("<b>CHAPTER NO.</b>", th_toc), Paragraph("<b>TITLE</b>", th_toc), Paragraph("<b>PAGE NO.</b>", th_toc_pg)]
    ]
    for ch_no, title, is_bold, key in TOC_STRUCTURE:
        c_style = td_toc_bold if is_bold else td_toc_title
        p_style = td_toc_pg_bold if is_bold else td_toc_pg
        pg_str = page_map.get(key, "--")
        toc_rows.append([
            Paragraph(f"<b>{ch_no}</b>" if is_bold else ch_no, c_style),
            Paragraph(f"<b>{title}</b>" if is_bold else title, c_style),
            Paragraph(f"<b>{pg_str}</b>" if is_bold else pg_str, p_style)
        ])
    t_toc = Table(toc_rows, colWidths=[65, 310, 58], repeatRows=1)
    t_toc.setStyle(toc_table_style)
    story.append(t_toc)
    story.append(PageBreak())

    # LIST OF ABBREVIATIONS
    story.append(PageTracker("front_abbr", page_map))
    story.append(Paragraph("LIST OF ABBREVIATIONS", h_chap))
    story.append(Spacer(1, 8))
    abbr_data = [
        [Paragraph("<b>ABBREVIATION</b>", th_toc), Paragraph("<b>EXPANDED DEFINITION</b>", th_toc)]
    ]
    for ab, desc in rd.ABBREVIATIONS:
        abbr_data.append([Paragraph(ab, td_style), Paragraph(desc, td_style)])
    t_abbr = Table(abbr_data, colWidths=[100, 332], repeatRows=1)
    t_abbr.setStyle(clean_table_style)
    story.append(t_abbr)
    story.append(PageBreak())

    # LIST OF FIGURES
    story.append(PageTracker("front_figures", page_map))
    story.append(Paragraph("LIST OF FIGURES", h_chap))
    story.append(Spacer(1, 8))
    fig_data = [
        [Paragraph("<b>FIGURE NO.</b>", th_toc), Paragraph("<b>FIGURE NAME</b>", th_toc), Paragraph("<b>PAGE NO.</b>", th_toc_pg)]
    ]
    for f_no, f_name, key in FIGURES_STRUCTURE:
        pg_str = page_map.get(key, "--")
        fig_data.append([Paragraph(f_no, td_style), Paragraph(f_name, td_style), Paragraph(pg_str, td_right)])
    t_fig = Table(fig_data, colWidths=[75, 305, 52], repeatRows=1)
    t_fig.setStyle(clean_table_style)
    story.append(t_fig)
    story.append(PageBreak())

    # LIST OF TABLES
    story.append(PageTracker("front_tables", page_map))
    story.append(Paragraph("LIST OF TABLES", h_chap))
    story.append(Spacer(1, 8))
    tbl_list_data = [
        [Paragraph("<b>TABLE NO.</b>", th_toc), Paragraph("<b>TABLE NAME</b>", th_toc), Paragraph("<b>PAGE NO.</b>", th_toc_pg)]
    ]
    for t_no, t_name, key in TABLES_STRUCTURE:
        pg_str = page_map.get(key, "--")
        tbl_list_data.append([Paragraph(t_no, td_style), Paragraph(t_name, td_style), Paragraph(pg_str, td_right)])
    t_tbl_list = Table(tbl_list_data, colWidths=[75, 305, 52], repeatRows=1)
    t_tbl_list.setStyle(clean_table_style)
    story.append(t_tbl_list)
    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════
    # CHAPTER 1: INTRODUCTION
    # ═════════════════════════════════════════════════════════════════════
    story.append(MarkChapter1())
    story.append(PageTracker("ch1", page_map))
    story.append(Paragraph("CHAPTER 1", h_chap))
    story.append(Paragraph("INTRODUCTION", h_chap))
    story.append(Spacer(1, 6))

    # 1.1
    story.append(PageTracker("sec_1_1", page_map))
    story.append(Paragraph(ch1_3.CH1_SECTIONS[0]['heading'], h_sec))
    for p in ch1_3.CH1_SECTIONS[0]['paragraphs']:
        story.append(Paragraph(p, p_body))
    for sec_idx in [1, 2, 3, 4]:
        story.append(Paragraph(ch1_3.CH1_SECTIONS[sec_idx]['heading'], h_subsec))
        for p in ch1_3.CH1_SECTIONS[sec_idx]['paragraphs']:
            if p.startswith('<b>sim'):
                story.append(Paragraph(p, p_code))
            else:
                story.append(Paragraph(p, p_body))

    # 1.2
    story.append(PageTracker("sec_1_2", page_map))
    story.append(Paragraph(ch1_3.CH1_SECTIONS[5]['heading'], h_sec))
    for p in ch1_3.CH1_SECTIONS[5]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # Fig 1.1
    fig1_path = os.path.join(FIGURES_DIR, "fig1_overall_system_architecture.png")
    if os.path.exists(fig1_path):
        story.append(PageTracker("fig_1_1", page_map))
        story.append(Image(fig1_path, width=5.0 * inch, height=2.05 * inch))
        story.append(Paragraph("Fig 1.1: Master System Architecture and End-to-End Evaluation Workflow", p_caption_below))

    # 1.3
    story.append(PageTracker("sec_1_3", page_map))
    story.append(Paragraph(ch1_3.CH1_SECTIONS[6]['heading'], h_sec))
    for p in ch1_3.CH1_SECTIONS[6]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # Table 1.1
    story.append(PageTracker("tbl_1_1", page_map))
    story.append(Paragraph("Table 1.1: Systematic Comparison of Information Retrieval Paradigms in Exam Evaluation", p_caption_above))
    t1_1_data = [[Paragraph(h, th_style) for h in ch1_3.TABLE_1_1_HEADERS]]
    for row in ch1_3.TABLE_1_1_DATA:
        t1_1_data.append([Paragraph(cell, td_style) for cell in row])
    t1_1 = Table(t1_1_data, colWidths=[80, 85, 85, 90, 92], repeatRows=1)
    t1_1.setStyle(clean_table_style)
    story.append(t1_1)

    # 1.4
    story.append(PageTracker("sec_1_4", page_map))
    story.append(Paragraph(ch1_3.CH1_SECTIONS_CONT[0]['heading'], h_sec))
    for p in ch1_3.CH1_SECTIONS_CONT[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # 1.5
    story.append(PageTracker("sec_1_5", page_map))
    story.append(Paragraph(ch1_3.CH1_SECTIONS_CONT[1]['heading'], h_sec))
    for p in ch1_3.CH1_SECTIONS_CONT[1]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # 1.6
    story.append(PageTracker("sec_1_6", page_map))
    story.append(Paragraph(ch1_3.CH1_SECTIONS_CONT[2]['heading'], h_sec))
    for p in ch1_3.CH1_SECTIONS_CONT[2]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # ═════════════════════════════════════════════════════════════════════
    # CHAPTER 2: LITERATURE SURVEY
    # ═════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(PageTracker("ch2", page_map))
    story.append(Paragraph("CHAPTER 2", h_chap))
    story.append(Paragraph("LITERATURE SURVEY", h_chap))
    story.append(Spacer(1, 6))

    # 2.1
    story.append(PageTracker("sec_2_1", page_map))
    for sec in ch1_3.CH2_SECTIONS_P8:
        p_style = h_sec if sec['level'] == 2 else h_subsec
        story.append(Paragraph(sec['heading'], p_style))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))
    for sec in ch1_3.CH2_SECTIONS_P9:
        p_style = h_sec if sec['level'] == 2 else h_subsec
        story.append(Paragraph(sec['heading'], p_style))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))

    # 2.2
    story.append(PageTracker("sec_2_2", page_map))
    story.append(Paragraph(ch1_3.CH2_SECTIONS_P10[0]['heading'], h_sec))
    for p in ch1_3.CH2_SECTIONS_P10[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # Table 2.1 - Complete Combined 14-Paper Matrix
    story.append(PageTracker("tbl_2_1", page_map))
    p_cap_split = ParagraphStyle("CapSplit", parent=p_caption_above, keepWithNext=False)
    story.append(Paragraph("Table 2.1: Literature Review Matrix (14 State-of-the-Art Peer-Reviewed Papers)", p_cap_split))
    t2_1_data = [[Paragraph(h, th_style) for h in ch1_3.TABLE_2_1A_HEADERS]]
    for row in ch1_3.TABLE_2_1A_DATA:
        t2_1_data.append([Paragraph(cell, td_style) for cell in row])
    for row in ch1_3.TABLE_2_1B_DATA:
        t2_1_data.append([Paragraph(cell, td_style) for cell in row])
    t2_1 = Table(t2_1_data, colWidths=[90, 85, 125, 132], repeatRows=1)
    t2_1.setStyle(clean_table_style)
    story.append(t2_1)

    # 2.3
    story.append(PageTracker("sec_2_3", page_map))
    story.append(Paragraph(ch1_3.CH2_SECTIONS_CONT[0]['heading'], h_sec))
    for p in ch1_3.CH2_SECTIONS_CONT[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    fig7_path = os.path.join(FIGURES_DIR, "fig7_empirical_performance_benchmarks.png")
    if os.path.exists(fig7_path):
        story.append(PageTracker("fig_2_1", page_map))
        story.append(Image(fig7_path, width=5.0 * inch, height=2.05 * inch))
        story.append(Paragraph("Fig 2.1: Empirical Performance & Baseline Benchmark Comparison", p_caption_below))

    # Table 2.2
    story.append(PageTracker("tbl_2_2", page_map))
    story.append(Paragraph("Table 2.2: Deep Dive Architectural Feature Benchmark: Baseline vs. Proposed System", p_caption_above))
    t2_2_data = [[Paragraph(h, th_style) for h in ch1_3.TABLE_2_2_HEADERS]]
    for row in ch1_3.TABLE_2_2_DATA:
        t2_2_data.append([Paragraph(cell, td_style) for cell in row])
    t2_2 = Table(t2_2_data, colWidths=[110, 155, 167], repeatRows=1)
    t2_2.setStyle(clean_table_style)
    story.append(t2_2)

    # 2.4, 2.5, 2.6
    story.append(PageTracker("sec_2_4", page_map))
    story.append(Paragraph(ch1_3.CH2_SECTIONS_CONT2[0]['heading'], h_sec))
    for p in ch1_3.CH2_SECTIONS_CONT2[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("sec_2_5", page_map))
    story.append(Paragraph(ch1_3.CH2_SECTIONS_CONT2[1]['heading'], h_sec))
    for p in ch1_3.CH2_SECTIONS_CONT2[1]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("sec_2_6", page_map))
    story.append(Paragraph(ch1_3.CH2_SECTIONS_CONT2[2]['heading'], h_sec))
    for p in ch1_3.CH2_SECTIONS_CONT2[2]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # ═════════════════════════════════════════════════════════════════════
    # CHAPTER 3: AIM AND SCOPE
    # ═════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(PageTracker("ch3", page_map))
    story.append(Paragraph("CHAPTER 3", h_chap))
    story.append(Paragraph("AIM AND SCOPE OF THE PRESENT INVESTIGATION", h_chap))
    story.append(Spacer(1, 6))

    # 3.1 & 3.2
    story.append(PageTracker("sec_3_1", page_map))
    story.append(Paragraph(ch1_3.CH3_SECTIONS[0]['heading'], h_sec))
    for p in ch1_3.CH3_SECTIONS[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("sec_3_2", page_map))
    story.append(Paragraph(ch1_3.CH3_SECTIONS[1]['heading'], h_sec))
    for p in ch1_3.CH3_SECTIONS[1]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # 3.3
    story.append(PageTracker("sec_3_3", page_map))
    story.append(Paragraph(ch1_3.CH3_SECTIONS[2]['heading'], h_sec))
    for p in ch1_3.CH3_SECTIONS[2]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # 3.4
    story.append(PageTracker("sec_3_4", page_map))
    story.append(Paragraph(ch1_3.CH3_SECTIONS[3]['heading'], h_sec))
    for p in ch1_3.CH3_SECTIONS[3]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_3_1", page_map))
    story.append(Paragraph("Table 3.1: Target Operational User Personas and Workflow Specifications", p_caption_above))
    t3_3_data = [[Paragraph(h, th_style) for h in ch1_3.TABLE_3_3_HEADERS]]
    for row in ch1_3.TABLE_3_3_DATA:
        t3_3_data.append([Paragraph(cell, td_style) for cell in row])
    t3_3 = Table(t3_3_data, colWidths=[95, 150, 187], repeatRows=1)
    t3_3.setStyle(clean_table_style)
    story.append(t3_3)

    # 3.5
    story.append(PageTracker("sec_3_5", page_map))
    story.append(Paragraph(ch1_3.CH3_SECTIONS_CONT[0]['heading'], h_sec))
    for p in ch1_3.CH3_SECTIONS_CONT[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_3_2", page_map))
    story.append(Paragraph("Table 3.2: Feasibility Study & Implementation Risk Assessment Matrix", p_caption_above))
    t3_1_data = [[Paragraph(h, th_style) for h in ch1_3.TABLE_3_1_HEADERS]]
    for row in ch1_3.TABLE_3_1_DATA:
        t3_1_data.append([Paragraph(cell, td_style) for cell in row])
    t3_1 = Table(t3_1_data, colWidths=[90, 140, 62, 140], repeatRows=1)
    t3_1.setStyle(clean_table_style)
    story.append(t3_1)

    # 3.6
    story.append(PageTracker("sec_3_6", page_map))
    story.append(Paragraph(ch1_3.CH3_SECTIONS_CONT2[0]['heading'], h_sec))
    for p in ch1_3.CH3_SECTIONS_CONT2[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # 3.7
    story.append(PageTracker("sec_3_7", page_map))
    story.append(Paragraph(ch1_3.CH3_SECTIONS_CONT2[1]['heading'], h_sec))
    for p in ch1_3.CH3_SECTIONS_CONT2[1]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_3_3", page_map))
    story.append(Paragraph("Table 3.3: Hardware, Operating System, and Software Stack Specifications", p_caption_above))
    t3_2_data = [[Paragraph(h, th_style) for h in ch1_3.TABLE_3_2_HEADERS]]
    for row in ch1_3.TABLE_3_2_DATA:
        t3_2_data.append([Paragraph(cell, td_style) for cell in row])
    t3_2 = Table(t3_2_data, colWidths=[80, 110, 112, 130], repeatRows=1)
    t3_2.setStyle(clean_table_style)
    story.append(t3_2)

    # Fig 3.1
    fig5_path = os.path.join(FIGURES_DIR, "fig5_multipage_answer_collation.png")
    if os.path.exists(fig5_path):
        story.append(PageTracker("fig_3_1", page_map))
        story.append(Image(fig5_path, width=5.0 * inch, height=2.05 * inch))
        story.append(Paragraph("Fig 3.1: Multi-Page Answer Collation and Ingestion Sequence", p_caption_below))

    # ═════════════════════════════════════════════════════════════════════
    # CHAPTER 4: MATERIALS AND METHODS
    # ═════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(PageTracker("ch4", page_map))
    story.append(Paragraph("CHAPTER 4", h_chap))
    story.append(Paragraph("MATERIALS AND METHODS; ALGORITHMS USED", h_chap))
    story.append(Spacer(1, 6))

    # 4.1
    story.append(PageTracker("sec_4_1", page_map))
    story.append(Paragraph(ch4_6.CH4_SECTIONS[0]['heading'], h_sec))
    for p in ch4_6.CH4_SECTIONS[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # 4.2
    story.append(PageTracker("sec_4_2", page_map))
    story.append(Paragraph(ch4_6.CH4_SECTIONS[1]['heading'], h_sec))
    for p in ch4_6.CH4_SECTIONS[1]['paragraphs']:
        story.append(Paragraph(p, p_body))

    fig2_path = os.path.join(FIGURES_DIR, "fig2_vision_preprocessing_pipeline.png")
    if os.path.exists(fig2_path):
        story.append(PageTracker("fig_4_1", page_map))
        story.append(Image(fig2_path, width=5.0 * inch, height=2.05 * inch))
        story.append(Paragraph("Fig 4.1: Optical Character Recognition & Vision Preprocessing Pipeline", p_caption_below))

    # 4.3
    story.append(PageTracker("sec_4_3", page_map))
    story.append(Paragraph(ch4_6.CH4_SECTIONS[2]['heading'], h_sec))
    for p in ch4_6.CH4_SECTIONS[2]['paragraphs']:
        story.append(Paragraph(p, p_body))
    story.append(Paragraph(ch4_6.ALGORITHM_1_TEXT, p_code))

    for sec in ch4_6.CH4_SECTIONS_MOD2_SUB:
        story.append(Paragraph(sec['heading'], h_sec if sec['level'] == 2 else h_subsec))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))

    # 4.4
    story.append(PageTracker("sec_4_4", page_map))
    for sec in ch4_6.CH4_SECTIONS_MOD3:
        story.append(Paragraph(sec['heading'], h_sec if sec['level'] == 2 else h_subsec))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_4_1", page_map))
    story.append(Paragraph("Table 4.1: Relational Database Schema and Constraint Specifications", p_caption_above))
    t4_1_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_4_1_HEADERS]]
    for row in ch4_6.TABLE_4_1_DATA:
        t4_1_data.append([Paragraph(cell, td_style) for cell in row])
    t4_1 = Table(t4_1_data, colWidths=[90, 80, 80, 182], repeatRows=1)
    t4_1.setStyle(clean_table_style)
    story.append(t4_1)

    fig8_path = os.path.join(FIGURES_DIR, "fig8_database_er_and_vector_topology.png")
    if os.path.exists(fig8_path):
        story.append(PageTracker("fig_4_2", page_map))
        story.append(Image(fig8_path, width=5.0 * inch, height=2.05 * inch))
        story.append(Paragraph("Fig 4.2: Relational Database Schema & Vector Index Topology", p_caption_below))

    # 4.5
    story.append(PageTracker("sec_4_5", page_map))
    for sec in ch4_6.CH4_SECTIONS_MOD4:
        story.append(Paragraph(sec['heading'], h_sec if sec['level'] == 2 else h_subsec))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))

    story.append(Paragraph(ch4_6.ALGORITHM_2_TEXT, p_code))

    story.append(PageTracker("tbl_4_2", page_map))
    story.append(Paragraph("Table 4.2: Structured JSON Schema & Prompt Template Specifications", p_caption_above))
    t4_2_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_4_2_HEADERS]]
    for row in ch4_6.TABLE_4_2_DATA:
        t4_2_data.append([Paragraph(cell, td_style) for cell in row])
    t4_2 = Table(t4_2_data, colWidths=[90, 120, 222], repeatRows=1)
    t4_2.setStyle(clean_table_style)
    story.append(t4_2)

    fig6_path = os.path.join(FIGURES_DIR, "fig6_human_in_the_loop_governance.png")
    if os.path.exists(fig6_path):
        story.append(PageTracker("fig_4_3", page_map))
        story.append(Image(fig6_path, width=5.0 * inch, height=2.05 * inch))
        story.append(Paragraph("Fig 4.3: Teacher Evaluation Workbench & Audit Trail Architecture", p_caption_below))


    # 4.6
    story.append(PageTracker("sec_4_6", page_map))
    for sec in ch4_6.CH4_SECTIONS_MOD5:
        story.append(Paragraph(sec['heading'], h_sec if sec['level'] == 2 else h_subsec))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))

    story.append(Paragraph(ch4_6.ALGORITHM_3_TEXT, p_code))

    story.append(PageTracker("tbl_4_3a", page_map))
    story.append(Paragraph("Table 4.3a: Step-by-Step Numerical Walkthrough: 3-Tier Multi-Criteria Rubric Scoring", p_caption_above))
    t4_3a_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_4_3A_HEADERS]]
    for row in ch4_6.TABLE_4_3A_DATA:
        t4_3a_data.append([Paragraph(cell, td_style) for cell in row])
    t4_3a = Table(t4_3a_data, colWidths=[65, 120, 55, 60, 132], repeatRows=1)
    t4_3a.setStyle(clean_table_style)
    story.append(t4_3a)

    fig4_path = os.path.join(FIGURES_DIR, "fig4_dual_route_grading_rubric.png")
    if os.path.exists(fig4_path):
        story.append(PageTracker("fig_4_4", page_map))
        story.append(Image(fig4_path, width=5.0 * inch, height=2.05 * inch))
        story.append(Paragraph("Fig 4.4: Dual-Route Evaluation Engine & Rubric Scoring Pipeline", p_caption_below))

    # 4.7
    story.append(PageTracker("sec_4_7", page_map))
    for sec in ch4_6.CH4_SECTIONS_MOD6:
        story.append(Paragraph(sec['heading'], h_sec if sec['level'] == 2 else h_subsec))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))

    fig3_path = os.path.join(FIGURES_DIR, "fig3_vector_retrieval_rag_pipeline.png")
    if os.path.exists(fig3_path):
        story.append(PageTracker("fig_4_5", page_map))
        story.append(Image(fig3_path, width=5.0 * inch, height=2.05 * inch))
        story.append(Paragraph("Fig 4.5: Curriculum-Grounded Vector Retrieval & Context Injection", p_caption_below))

    # 4.8
    story.append(PageTracker("sec_4_8", page_map))
    for sec in ch4_6.CH4_SECTIONS_MOD7:
        story.append(Paragraph(sec['heading'], h_sec if sec['level'] == 2 else h_subsec))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))



    fig9_path = os.path.join(FIGURES_DIR, "fig9_mathematical_algorithmic_formulations.png")
    if os.path.exists(fig9_path):
        story.append(PageTracker("fig_4_6", page_map))
        story.append(Image(fig9_path, width=5.0 * inch, height=2.05 * inch))
        story.append(Paragraph("Fig 4.6: Mathematical Formulations: Hough Deskewing & Cosine Geometry", p_caption_below))

    # 4.9
    story.append(PageTracker("sec_4_9", page_map))
    for sec in ch4_6.CH4_SECTIONS_MOD8_9:
        story.append(Paragraph(sec['heading'], h_sec if sec['level'] == 2 else h_subsec))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_4_3", page_map))
    story.append(Paragraph("Table 4.3: System Operational Cost Analysis: Commercial Cloud vs. Self-Hosted TCO", p_caption_above))
    t4_3_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_4_3_HEADERS]]
    for row in ch4_6.TABLE_4_3_DATA:
        t4_3_data.append([Paragraph(cell, td_style) for cell in row])
    t4_3 = Table(t4_3_data, colWidths=[80, 110, 110, 132], repeatRows=1)
    t4_3.setStyle(clean_table_style)
    story.append(t4_3)

    # 4.10
    story.append(PageTracker("sec_4_10", page_map))
    for sec in ch4_6.CH4_SECTIONS_MOD10:
        story.append(Paragraph(sec['heading'], h_sec if sec['level'] == 2 else h_subsec))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))

    # ═════════════════════════════════════════════════════════════════════
    # CHAPTER 5: RESULTS AND DISCUSSION
    # ═════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(PageTracker("ch5", page_map))
    story.append(Paragraph("CHAPTER 5", h_chap))
    story.append(Paragraph("RESULTS AND DISCUSSION, PERFORMANCE ANALYSIS", h_chap))
    story.append(Spacer(1, 6))

    # 5.1
    story.append(PageTracker("sec_5_1", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS[0]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # 5.2
    story.append(PageTracker("sec_5_2", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS[1]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS[1]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_5_1", page_map))
    story.append(Paragraph("Table 5.1: Comparative Evaluation Accuracy Across Question Complexity Levels", p_caption_above))
    t5_1_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_5_1_HEADERS]]
    for row in ch4_6.TABLE_5_1_DATA:
        t5_1_data.append([Paragraph(cell, td_style) for cell in row])
    t5_1 = Table(t5_1_data, colWidths=[90, 80, 80, 85, 97], repeatRows=1)
    t5_1.setStyle(clean_table_style)
    story.append(t5_1)

    # 5.3
    story.append(PageTracker("sec_5_3", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT[0]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # 5.4
    story.append(PageTracker("sec_5_4", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT[1]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT[1]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_5_2", page_map))
    story.append(Paragraph("Table 5.2: Retrieval Quality, Faithfulness, and Hallucination Suppression Metrics", p_caption_above))
    t5_2_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_5_2_HEADERS]]
    for row in ch4_6.TABLE_5_2_DATA:
        t5_2_data.append([Paragraph(cell, td_style) for cell in row])
    t5_2 = Table(t5_2_data, colWidths=[100, 100, 110, 122], repeatRows=1)
    t5_2.setStyle(clean_table_style)
    story.append(t5_2)

    # 5.5
    story.append(PageTracker("sec_5_5", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT2[0]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT2[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_5_3", page_map))
    story.append(Paragraph("Table 5.3: Systematic Component Ablation Study on Benchmark Evaluation Set", p_caption_above))
    t5_3_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_5_3_HEADERS]]
    for row in ch4_6.TABLE_5_3_DATA:
        t5_3_data.append([Paragraph(cell, td_style) for cell in row])
    t5_3 = Table(t5_3_data, colWidths=[110, 75, 75, 80, 92], repeatRows=1)
    t5_3.setStyle(clean_table_style)
    story.append(t5_3)

    # 5.6
    story.append(PageTracker("sec_5_6", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT3[0]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT3[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # 5.7
    story.append(PageTracker("sec_5_7", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT3[1]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT3[1]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_5_4", page_map))
    story.append(Paragraph("Table 5.4: End-to-End Processing Latency Breakdown Across Subsystem Pipeline", p_caption_above))
    t5_4_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_5_4_HEADERS]]
    for row in ch4_6.TABLE_5_4_DATA:
        t5_4_data.append([Paragraph(cell, td_style) for cell in row])
    t5_4 = Table(t5_4_data, colWidths=[90, 85, 85, 90, 82], repeatRows=1)
    t5_4.setStyle(clean_table_style)
    story.append(t5_4)

    # 5.8
    story.append(PageTracker("sec_5_8", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT4[0]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT4[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_5_5", page_map))
    story.append(Paragraph("Table 5.5: Throughput and Latency Scalability Under Concurrent User Loads", p_caption_above))
    t5_5_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_5_5_HEADERS]]
    for row in ch4_6.TABLE_5_5_DATA:
        t5_5_data.append([Paragraph(cell, td_style) for cell in row])
    t5_5 = Table(t5_5_data, colWidths=[80, 80, 80, 90, 102], repeatRows=1)
    t5_5.setStyle(clean_table_style)
    story.append(t5_5)

    # 5.9
    story.append(PageTracker("sec_5_9", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT5[0]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT5[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_5_6", page_map))
    story.append(Paragraph("Table 5.6: System Robustness Under Optical Noise, Skew, and Handwriting Artifacts", p_caption_above))
    t5_6_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_5_6_HEADERS]]
    for row in ch4_6.TABLE_5_6_DATA:
        t5_6_data.append([Paragraph(cell, td_style) for cell in row])
    t5_6 = Table(t5_6_data, colWidths=[90, 80, 80, 85, 97], repeatRows=1)
    t5_6.setStyle(clean_table_style)
    story.append(t5_6)

    # 5.10
    story.append(PageTracker("sec_5_10", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT6[0]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT6[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("tbl_5_7", page_map))
    story.append(Paragraph("Table 5.7: Comparative Feature and Performance Matrix vs. Leading Frameworks", p_caption_above))
    t5_7_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_5_7_HEADERS]]
    for row in ch4_6.TABLE_5_7_DATA:
        t5_7_data.append([Paragraph(cell, td_style) for cell in row])
    t5_7 = Table(t5_7_data, colWidths=[85, 80, 85, 90, 92], repeatRows=1)
    t5_7.setStyle(clean_table_style)
    story.append(t5_7)

    # 5.11 & 5.12
    story.append(PageTracker("sec_5_11", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT7[0]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT7[0]['paragraphs']:
        story.append(Paragraph(p, p_body))

    story.append(PageTracker("sec_5_12", page_map))
    story.append(Paragraph(ch4_6.CH5_SECTIONS_CONT7[1]['heading'], h_sec))
    for p in ch4_6.CH5_SECTIONS_CONT7[1]['paragraphs']:
        story.append(Paragraph(p, p_body))

    # ═════════════════════════════════════════════════════════════════════
    # CHAPTER 6: SUMMARY AND CONCLUSIONS
    # ═════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(PageTracker("ch6", page_map))
    story.append(Paragraph("CHAPTER 6", h_chap))
    story.append(Paragraph("SUMMARY, CONCLUSIONS AND FUTURE WORK", h_chap))
    story.append(Spacer(1, 6))

    for idx, sec in enumerate(ch4_6.CH6_SECTIONS):
        sec_key = f"sec_6_{idx+1}"
        story.append(PageTracker(sec_key, page_map))
        story.append(Paragraph(sec['heading'], h_sec if sec['level'] == 2 else h_subsec))
        for p in sec['paragraphs']:
            story.append(Paragraph(p, p_body))

    # ═════════════════════════════════════════════════════════════════════
    # REFERENCES & BIBLIOGRAPHY (Naturally flowing, NO CONTINUED text!)
    # ═════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(PageTracker("references", page_map))
    story.append(Paragraph("REFERENCES & BIBLIOGRAPHY", h_chap))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "All references below are indexed in strict alphabetical order by the primary author's surname, "
        "encompassing landmark foundations in natural language processing, vector retrieval, and educational assessment.",
        p_body
    ))
    story.append(Spacer(1, 4))

    for ref in ch4_6.REFERENCES_LIST:
        story.append(Paragraph(ref, p_body))

    story.append(Spacer(1, 10))
    story.append(PageTracker("tbl_r_1", page_map))
    story.append(Paragraph("Table R.1: Systematic Architectural Mapping of Literature References to Subsystems", p_caption_above))
    tr1_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_R_1_HEADERS]]
    for row in ch4_6.TABLE_R_1_DATA:
        tr1_data.append([Paragraph(cell, td_style) for cell in row])
    tr1 = Table(tr1_data, colWidths=[55, 95, 110, 172], repeatRows=1)
    tr1.setStyle(clean_table_style)
    story.append(tr1)

    story.append(Spacer(1, 10))
    story.append(PageTracker("tbl_r_2", page_map))
    story.append(Paragraph("Table R.2: Cross-Reference Correlation Between Research Objectives and Literature", p_caption_above))
    tr2_data = [[Paragraph(h, th_style) for h in ch4_6.TABLE_R_2_HEADERS]]
    for row in ch4_6.TABLE_R_2_DATA:
        tr2_data.append([Paragraph(cell, td_style) for cell in row])
    tr2 = Table(tr2_data, colWidths=[70, 100, 110, 152], repeatRows=1)
    tr2.setStyle(clean_table_style)
    story.append(tr2)

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Concluding Verification Statement:</b> All 20 literature benchmark works have been systematically "
        "mapped to architectural subsystems and empirical findings, confirming total theoretical and experimental completeness.",
        p_body
    ))

    return story


def build_natural_report():
    print("=== PASS 1: Capturing natural layout page positions ===")
    pass1_map = {}
    doc1 = SimpleDocTemplate(
        "temp_pass1.pdf",
        pagesize=A4,
        leftMargin=1.25 * inch,
        rightMargin=1.0 * inch,
        topMargin=1.0 * inch,
        bottomMargin=1.0 * inch
    )
    story1 = build_story(pass1_map)
    doc1.build(story1, canvasmaker=CustomCanvas)

    print(f"Pass 1 finished! Captured {len(pass1_map)} location tags.")
    import json; print("FULL_PASS1_MAP:" + json.dumps(pass1_map))

    print("\n=== PASS 2: Building final PDF with exact synchronized page numbers ===")
    doc2 = SimpleDocTemplate(
        PDF_OUTPUT_PATH,
        pagesize=A4,
        leftMargin=1.25 * inch,
        rightMargin=1.0 * inch,
        topMargin=1.0 * inch,
        bottomMargin=1.0 * inch
    )
    story2 = build_story(pass1_map)
    doc2.build(story2, canvasmaker=CustomCanvas)

    if os.path.exists("temp_pass1.pdf"):
        os.remove("temp_pass1.pdf")

    # Verify final PDF
    reader = pypdf.PdfReader(PDF_OUTPUT_PATH)
    total_pages = len(reader.pages)
    c1 = CustomCanvas.chapter1_page
    arabic_pages = total_pages - c1 + 1 if total_pages >= c1 else 0
    front_pages = c1 - 1 if total_pages >= c1 else total_pages

    print(f"\n✅ Final PDF compiled successfully: {PDF_OUTPUT_PATH}")
    print(f"Total Physical Pages: {total_pages}")
    print(f"Front Matter Pages: {front_pages} (Pages i to {int_to_roman(front_pages)})")
    print(f"Body Chapters Pages: {arabic_pages} (Pages 1 to {arabic_pages})")
    print(f"Chapter 1 starts on physical page: {c1}")


if __name__ == "__main__":
    build_natural_report()
