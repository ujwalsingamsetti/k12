#!/usr/bin/env python3
"""Master Build Script for IEEE Research Paper.
Compiles both the PDF (via ReportLab) and DOCX (via python-docx) versions of the
research paper and executes the full automated verification suite.
"""

import sys
import os

# Auto-execute inside .venv if dependencies are missing from current python
try:
    import fitz
    import docx
    import reportlab
except ImportError:
    venv_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".venv", "bin", "python")
    if os.path.exists(venv_py) and sys.executable != os.path.abspath(venv_py):
        os.execv(venv_py, [venv_py] + sys.argv)
    else:
        raise

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import compile_ieee_paper
import compile_ieee_docx
import verify_research_paper

def main():
    print("======================================================================")
    print("BUILDING IEEE K-12 AUTOMATED GRADING RESEARCH PAPER")
    print("======================================================================")

    # 1. Compile PDF
    print("\n>>> STEP 1: Compiling PDF...")
    pdf_pages = compile_ieee_paper.build_pdf("IEEE_K12_Automated_Grading_Research_Paper.pdf")

    # 2. Compile DOCX
    print("\n>>> STEP 2: Compiling DOCX...")
    compile_ieee_docx.build_docx("IEEE_K12_Automated_Grading_Research_Paper.docx")

    # 3. Verify
    print("\n>>> STEP 3: Executing Automated Verification Suite...")
    pdf_ok = verify_research_paper.verify_pdf("IEEE_K12_Automated_Grading_Research_Paper.pdf")
    docx_ok = verify_research_paper.verify_docx("IEEE_K12_Automated_Grading_Research_Paper.docx")

    print("\n======================================================================")
    if pdf_ok and docx_ok:
        print("[SUCCESS] All artifacts generated and verified successfully!")
        print(f"  - PDF:  IEEE_K12_Automated_Grading_Research_Paper.pdf ({pdf_pages} pages)")
        print("  - DOCX: IEEE_K12_Automated_Grading_Research_Paper.docx (editable)")
        print("======================================================================")
        return 0
    else:
        print("[WARNING] Build completed with verification warnings. Review logs above.")
        print("======================================================================")
        return 1

if __name__ == '__main__':
    sys.exit(main())
