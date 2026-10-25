#!/usr/bin/env python3
"""Comprehensive Verification Script for IEEE Research Paper.
Verifies page count, typography, forbidden terms, image embeddings, tables, and algorithms
in IEEE_K12_Automated_Grading_Research_Paper.pdf and .docx.
"""

import os
import sys
import re

# Ensure execution in .venv if dependencies are missing from system python
try:
    import fitz
    import docx
except ImportError:
    venv_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".venv", "bin", "python")
    if os.path.exists(venv_py) and sys.executable != os.path.abspath(venv_py):
        os.execv(venv_py, [venv_py] + sys.argv)
    else:
        raise

def verify_pdf(pdf_path="IEEE_K12_Automated_Grading_Research_Paper.pdf"):
    print(f"\n==========================================")
    print(f"VERIFYING PDF: {pdf_path}")
    print(f"==========================================")

    if not os.path.exists(pdf_path):
        print(f"[FAIL] PDF does not exist: {pdf_path}")
        return False

    doc = fitz.open(pdf_path)
    page_count = len(doc)
    print(f"1. Page Count: {page_count} pages")
    page_count_ok = False
    if page_count == 7:
        print("   [PASS] Exact 7-page count achieved (matching sample reference paper)!")
        page_count_ok = True
    elif 6 <= page_count <= 8:
        print(f"   [PASS] Page count ({page_count}) is within acceptable range (6-8 pages).")
        page_count_ok = True
    else:
        print(f"   [FAIL] Page count {page_count} is outside acceptable range (6-8 pages)!")

    # Check Dimensions
    p1 = doc[0]
    rect = p1.rect
    print(f"2. Page Dimensions: {rect.width} x {rect.height} pt (Letter size: 612 x 792 pt)")
    dims_ok = False
    if abs(rect.width - 612.0) < 1 and abs(rect.height - 792.0) < 1:
        print("   [PASS] Page dimensions match standard US Letter.")
        dims_ok = True
    else:
        print("   [WARN] Page dimensions differ from standard US Letter.")

    # Check Forbidden Terms across all text
    full_text = ""
    for p_num in range(page_count):
        full_text += doc[p_num].get_text('text') + "\n"

    forbidden_terms = [
        r'\bgemini\b', r'\bgpt-4\b', r'\bgpt4\b', r'\bgpt-3\b', r'\bchatgpt\b',
        r'\bclaude\b', r'\bllama\b', r'\breact\b', r'\bworkbench\b',
        r'\bfrontend\b', r'\bweb portal\b', r'\bdashboard\b'
    ]

    print("3. Forbidden Commercial LLM & Frontend Terms Audit:")
    terms_clean = True
    for term in forbidden_terms:
        matches = re.findall(term, full_text, re.IGNORECASE)
        if matches:
            print(f"   [FAIL] Found forbidden term '{term}': {len(matches)} occurrences")
            terms_clean = False
        else:
            print(f"   [PASS] Zero occurrences of '{term}'")

    # Check Required Structural Elements
    required_elements = [
        "I. INTRODUCTION",
        "II. RELATED WORK",
        "III. SYSTEM ARCHITECTURE AND PROBLEM FORMULATION",
        "IV. METHODOLOGY AND ALGORITHMIC FORMULATIONS",
        "V. EXPERIMENTAL SETUP AND EMPIRICAL EVALUATION",
        "VI. CONCLUSION AND FUTURE WORK",
        "REFERENCES",
        "TABLE I",
        "TABLE II",
        "TABLE III",
        "TABLE IV",
        "Algorithm 1",
        "Algorithm 2",
        "Fig. 1",
        "Fig. 2",
        "Fig. 3",
        "Fig. 4",
        "Fig. 5",
        "Fig. 6",
    ]

    print("4. Required Academic Sections, Tables, Figures, and Algorithms Audit:")
    elements_ok = True
    normalized_full_text = re.sub(r'\s+', ' ', full_text)
    for elem in required_elements:
        if elem in normalized_full_text:
            print(f"   [PASS] Found '{elem}'")
        else:
            print(f"   [FAIL] Missing '{elem}'")
            elements_ok = False

    # Check Embedded Images
    total_imgs = 0
    for p_idx, page in enumerate(doc):
        imgs = page.get_images()
        total_imgs += len(imgs)
        print(f"   Page {p_idx+1}: {len(imgs)} images embedded")
    print(f"   Total embedded figures across PDF: {total_imgs}")
    imgs_ok = (total_imgs >= 6)

    # Check Page 7 Natural Flow (Left column completes before flowing to right column)
    p7_blocks = doc[6].get_text('blocks')
    col1_p7 = [b for b in p7_blocks if b[0] < 200]
    col2_p7 = [b for b in p7_blocks if b[0] >= 200]
    c1_y_max = max([b[3] for b in col1_p7]) if col1_p7 else 0
    c2_y_min = min([b[1] for b in col2_p7]) if col2_p7 else 0
    print(f"5. Final Page Column Flow Audit:")
    print(f"   Left column bottom: {c1_y_max:.1f} pt (usable boundary: 738.0 pt)")
    print(f"   Right column top:    {c2_y_min:.1f} pt (usable boundary: 54.0 pt)")
    flow_ok = False
    if c1_y_max >= 700.0 and c2_y_min <= 100.0:
        print("   [PASS] Left column completes to bottom before content continues in right column.")
        flow_ok = True
    else:
        print("   [WARN] Unexpected column flow layout on Page 7.")

    return page_count_ok and dims_ok and terms_clean and elements_ok and imgs_ok and flow_ok

def verify_docx(docx_path="IEEE_K12_Automated_Grading_Research_Paper.docx"):
    print(f"\n==========================================")
    print(f"VERIFYING DOCX: {docx_path}")
    print(f"==========================================")

    if not os.path.exists(docx_path):
        print(f"[FAIL] DOCX does not exist: {docx_path}")
        return False

    doc = docx.Document(docx_path)
    p_count = len(doc.paragraphs)
    t_count = len(doc.tables)
    print(f"1. Paragraphs: {p_count}, Tables: {t_count}")

    full_text = "\n".join([p.text for p in doc.paragraphs])
    for t in doc.tables:
        for row in t.rows:
            full_text += " " + " ".join([c.text for c in row.cells])

    forbidden_terms = [
        r'\bgemini\b', r'\bgpt-4\b', r'\bgpt4\b', r'\bchatgpt\b',
        r'\bclaude\b', r'\bllama\b', r'\breact\b', r'\bworkbench\b',
        r'\bfrontend\b', r'\bweb portal\b', r'\bdashboard\b'
    ]

    all_clean = True
    print("2. Forbidden Terms Audit in DOCX:")
    for term in forbidden_terms:
        matches = re.findall(term, full_text, re.IGNORECASE)
        if matches:
            print(f"   [FAIL] Found forbidden term '{term}': {len(matches)} occurrences")
            all_clean = False
        else:
            print(f"   [PASS] Zero occurrences of '{term}'")

    print("3. DOCX Sections Count:", len(doc.sections))
    return all_clean

if __name__ == '__main__':
    pdf_ok = verify_pdf()
    docx_ok = verify_docx()
    print("\n==========================================")
    if pdf_ok and docx_ok:
        print("OVERALL VERIFICATION: SUCCESS (ALL CHECKS PASSED)")
        sys.exit(0)
    else:
        print("OVERALL VERIFICATION: COMPLETED WITH WARNINGS")
        sys.exit(1)
