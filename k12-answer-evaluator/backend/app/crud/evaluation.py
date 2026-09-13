from sqlalchemy.orm import Session
from app.models.evaluation import Evaluation
from typing import List
from uuid import UUID

def create_evaluation(
    db: Session,
    submission_id: UUID,
    question_id: UUID,
    student_answer: str,
    marks_obtained: float,
    max_marks: int,
    feedback: str,
    rag_context: str = None
) -> Evaluation:
    db_eval = Evaluation(
        submission_id=submission_id,
        question_id=question_id,
        student_answer=student_answer,
        marks_obtained=marks_obtained,
        max_marks=max_marks,
        feedback=feedback,
        rag_context=rag_context
    )
    db.add(db_eval)
    db.commit()
    db.refresh(db_eval)
    return db_eval

def bulk_create_evaluations(db: Session, evaluations_data: List[dict]) -> List[Evaluation]:
    """Create and commit multiple evaluations in a single database transaction"""
    eval_objs = [
        Evaluation(
            submission_id=data["submission_id"],
            question_id=data["question_id"],
            student_answer=data["student_answer"],
            marks_obtained=data["marks_obtained"],
            max_marks=data["max_marks"],
            feedback=data["feedback"],
            rag_context=data.get("rag_context")
        )
        for data in evaluations_data
    ]
    db.add_all(eval_objs)
    db.commit()
    for obj in eval_objs:
        db.refresh(obj)
    return eval_objs

def get_submission_evaluations(db: Session, submission_id: UUID) -> List[Evaluation]:
    return db.query(Evaluation).filter(Evaluation.submission_id == submission_id).all()
