import sys
sys.path.insert(0, '/Users/ujwalsingamsetti/project-k12/k12-answer-evaluator/backend')
from app.core.database import SessionLocal
from app.models.submission import AnswerSubmission
from app.models.user import User
from app.api.phase3 import _build_pdf

db = SessionLocal()
sub = db.query(AnswerSubmission).filter(AnswerSubmission.status == "evaluated").first()
if not sub:
    print("No evaluated submission found")
    sys.exit(0)

print(f"Testing PDF generation for submission {sub.id}")
try:
    pdf_bytes = _build_pdf(sub, db)
    with open("test_report.pdf", "wb") as f:
        f.write(pdf_bytes)
    print(f"Success! Generated PDF of size {len(pdf_bytes)} bytes")
except Exception as e:
    import traceback
    traceback.print_exc()
