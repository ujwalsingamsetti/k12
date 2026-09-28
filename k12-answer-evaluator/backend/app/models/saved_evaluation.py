"""Saved Evaluation Model for Examination Records.

Stores complete multimodal and multi-question evaluation runs, scoring breakdowns,
pedagogical feedback, and full diagnostic telemetry in PostgreSQL.
"""
from datetime import datetime
import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, JSON
from app.core.database import Base


class SavedEvaluation(Base):
    """Database model for persisted student examination evaluations."""
    __tablename__ = "saved_evaluations"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False, default="Examination Paper Evaluation")
    subject = Column(String(64), nullable=False, default="science")
    academic_level = Column(String(64), nullable=False, default="Class 10")
    total_score = Column(Float, nullable=False, default=0.0)
    total_max_score = Column(Float, nullable=False, default=0.0)
    percentage = Column(Float, nullable=False, default=0.0)
    status = Column(String(32), nullable=False, default="NEEDS_IMPROVEMENT")
    total_questions = Column(Integer, nullable=False, default=1)
    pages_processed = Column(Integer, nullable=False, default=1)
    provider = Column(String(64), nullable=False, default="deepseek")
    model = Column(String(64), nullable=False, default="deepseek-chat")
    evaluated_at = Column(DateTime, default=datetime.utcnow)
    ocr_cleaning_summary = Column(Text, nullable=True)
    diagram_detected = Column(Boolean, default=False)
    student_answer_snippet = Column(Text, nullable=True)
    criteria_breakdown = Column(JSON, nullable=True)
    full_report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
