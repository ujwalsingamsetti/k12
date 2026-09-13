import os
import re
import json
import logging
from typing import Dict, List
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EvaluationService:
    """Gemini-based answer evaluation service (FREE tier)"""
    
    def __init__(self):
        """Initialize the Gemini client using the new SDK"""
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in .env file. Get free key from https://aistudio.google.com/app/apikey")
        
        self.client = genai.Client(api_key=api_key)
        self.model_name = 'gemini-2.5-pro'
        logger.info(f"✅ Initialized GenAI client with {self.model_name}")
    
    def evaluate_answer(
        self,
        question: str,
        student_answer: str,
        textbook_context: str,
        subject: str,
        class_level: str = "12",
        max_score: int = 10,
        diagram_info: dict = None,
        marking_scheme: dict = None,
        rag_scores: List[float] = None,
        system_type: str = "general",
        academic_level: str = None
    ) -> Dict:
        """Evaluate student answer using Gemini API with universal support for any education system"""
        
        effective_level = academic_level or class_level
        logger.info(f"Evaluating {subject} Q (max: {max_score} marks, system: {system_type}, level: {effective_level})")
        
        try:
            prompt = self._create_prompt(
                question=question,
                student_answer=student_answer,
                textbook_context=textbook_context,
                subject=subject,
                max_score=max_score,
                class_level=class_level,
                marking_scheme=marking_scheme,
                system_type=system_type,
                academic_level=effective_level
            )
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            raw_response = response.text
            evaluation = self._parse_response(raw_response, max_score)
            
            # Calculate confidence
            confidence = self._calculate_confidence(
                evaluation, student_answer, rag_scores or [], marking_scheme
            )
            
            # Apply confidence-based leniency overrides
            original_score = float(evaluation.get("score", 0))
            if confidence > 0.65:
                evaluation["score"] = max_score
                logger.info(f"Confidence {confidence:.2f} > 0.65: Boosted score from {original_score} to {max_score}")
            elif confidence > 0.50:
                boosted_score = max(0, max_score - 1)
                evaluation["score"] = max(original_score, boosted_score)
                logger.info(f"Confidence {confidence:.2f} > 0.50: Boosted score from {original_score} to {evaluation['score']}")
            elif confidence > 0.30:
                boosted_score = max_score / 2.0
                evaluation["score"] = max(original_score, boosted_score)
                logger.info(f"Confidence {confidence:.2f} > 0.30: Boosted score from {original_score} to {evaluation['score']}")
            elif confidence > 0.20:
                boosted_score = max(0, (max_score / 2.0) - 1.0) # Gives less than half mark
                evaluation["score"] = max(original_score, boosted_score)
                logger.info(f"Confidence {confidence:.2f} > 0.20: Boosted score from {original_score} to {evaluation['score']}")
            
            evaluation["confidence"] = confidence
            evaluation["metadata"] = {
                "model": self.model_name,
                "provider": "google",
                "confidence": confidence,
                "system_type": system_type,
                "academic_level": effective_level
            }
            
            logger.info(f"✅ Score: {evaluation['score']}/{max_score}, Confidence: {confidence:.2f}")
            return evaluation
            
        except Exception as e:
            logger.error(f"❌ Gemini evaluation failed: {e}")
            return self._create_fallback_evaluation(max_score, str(e))
    
    def _create_prompt(self, question, student_answer, textbook_context, 
                      subject, max_score, class_level, marking_scheme,
                      system_type="general", academic_level=None):
        """Create evaluation prompt adaptable to any education system, university, or examination board"""
        
        correctness = round(max_score * 0.5, 1)
        completeness = round(max_score * 0.3, 1)
        understanding = round(max_score - correctness - completeness, 1)
        
        level_str = str(academic_level or class_level or "General")
        system_lower = str(system_type or "general").lower()
        system_display = str(system_type or "General Academic").strip().title()
        
        # Adaptive persona and grading philosophy
        if any(keyword in system_lower for keyword in ["university", "college", "higher_ed", "engineering", "undergraduate", "postgraduate"]):
            evaluator_role = f"an expert University Professor and Examiner in {subject} (Academic Level: {level_str})"
            grading_guidance = (
                "Evaluate the student's response with university-level academic rigor. "
                "Verify conceptual accuracy, technical precision, correct mathematical derivations/steps, "
                "and valid professional terminology. Award fair partial credit for correct working steps."
            )
        elif any(keyword in system_lower for keyword in ["competitive", "gate", "gre", "upsc", "certification", "professional"]):
            evaluator_role = f"a rigorous Senior Evaluator for competitive and professional examination standards in {subject}"
            grading_guidance = (
                "Evaluate with high precision. Check for analytical correctness, concise justifications, "
                "proper formulas, and absence of flawed assumptions."
            )
        elif any(keyword in system_lower for keyword in ["cbse", "icse", "state_board", "cambridge", "ib", "k12", "school"]):
            evaluator_role = f"an experienced and supportive {system_display} {subject} Teacher (Grade: {level_str})"
            grading_guidance = (
                "Evaluate supportively according to board curriculum standards. "
                "Reward conceptual understanding and correct key terms with generous step marks."
            )
        else:
            evaluator_role = f"an experienced and fair Academic Examiner in {subject} (Level: {level_str})"
            grading_guidance = (
                "Evaluate the student's answer fairly and constructively against the reference material and marking criteria. "
                "Reward valid points and provide clear, actionable feedback for any gaps."
            )

        marking_text = ""
        if marking_scheme:
            marking_text = "\n\nOFFICIAL MARKING SCHEME / RUBRIC:\n"
            for item in marking_scheme.get("breakdown", []):
                marking_text += f"- {item['point']} ({item['marks']} mark)\n"
            if "keywords" in marking_scheme:
                marking_text += f"\nRequired Technical Keywords: {', '.join(marking_scheme['keywords'])}\n"
        
        return f"""You are {evaluator_role}.
        
Evaluation Philosophy:
{grading_guidance}

QUESTION:
{question}
{marking_text}

CURRICULUM REFERENCE / REFERENCE MATERIAL:
{textbook_context}

STUDENT SUBMITTED ANSWER:
{student_answer}

Evaluate the student's response and return ONLY valid JSON matching this schema:

{{
  "score": <number between 0 and {max_score}>,
  "score_breakdown": {{
    "correctness": <0 to {correctness}>,
    "completeness": <0 to {completeness}>,
    "understanding": <0 to {understanding}>
  }},
  "correct_points": ["Specific points or steps the student solved or explained correctly"],
  "errors": [
    {{
      "what": "Concise statement of the error or misconception",
      "why": "Technical or conceptual explanation of why it is incorrect",
      "impact": "Mark reduction impact"
    }}
  ],
  "missing_concepts": ["Key concepts, formulas, or steps that should have been included"],
  "correct_answer_should_include": ["Core expectations for a full-mark model answer"],
  "improvement_guidance": [
    {{
      "suggestion": "Clear, actionable recommendation for improvement",
      "resource": "Specific topic, chapter, or reference area to revise",
      "practice": "Targeted problem type or exercise to practice"
    }}
  ],
  "overall_feedback": "Constructive, objective summary of performance."
}}

Return ONLY the JSON, no markdown code fence, no additional prose."""
    
    def _parse_response(self, text: str, max_score: int) -> Dict:
        """Parse Gemini response"""
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end > start:
                json_str = text[start:end]
                evaluation = json.loads(json_str)
                
                # Validate
                if 0 <= evaluation.get('score', -1) <= max_score:
                    return evaluation
            
            return self._create_fallback_evaluation(max_score, "Invalid JSON")
        except Exception as e:
            logger.error(f"Parse error: {e}")
            return self._create_fallback_evaluation(max_score, str(e))
    
    def _calculate_confidence(self, evaluation, student_answer, rag_scores, marking_scheme):
        """Calculate confidence score"""
        factors = []
        
        # RAG relevance (40%)
        if rag_scores:
            factors.append(sum(rag_scores) / len(rag_scores) * 0.4)
        else:
            factors.append(0.2)
        
        # Answer length (20%)
        expected_len = evaluation.get('max_score', 10) * 30
        actual_len = len(student_answer.strip())
        if actual_len > 0:
            factors.append(min(actual_len / expected_len, 1.0) * 0.2)
        
        # Keywords (20%)
        if marking_scheme and 'keywords' in marking_scheme:
            keywords = marking_scheme['keywords']
            answer_lower = student_answer.lower()
            found = sum(1 for kw in keywords if kw.lower() in answer_lower)
            factors.append((found / len(keywords)) * 0.2 if keywords else 0.1)
        else:
            factors.append(0.1)
        
        # Score consistency (20%)
        score = evaluation.get('score', 0)
        breakdown = evaluation.get('score_breakdown', {})
        if abs(score - sum(breakdown.values())) <= 1:
            factors.append(0.2)
        else:
            factors.append(0.1)
        
        return round(min(sum(factors), 1.0), 2)
    
    def _create_fallback_evaluation(self, max_score: int, error: str) -> Dict:
        """Fallback evaluation"""
        return {
            "score": max_score // 2,
            "score_breakdown": {
                "correctness": max_score // 4,
                "completeness": max_score // 6,
                "understanding": max_score // 4
            },
            "correct_points": ["Unable to analyze automatically"],
            "errors": [{"what": "Evaluation failed", "why": error, "impact": "Manual review needed"}],
            "missing_concepts": ["Manual review required"],
            "correct_answer_should_include": ["Review textbook"],
            "improvement_guidance": [{"suggestion": "Manual review", "resource": "Textbook", "practice": "Practice"}],
            "overall_feedback": "Manual teacher review recommended.",
            "confidence": 0.3,
            "metadata": {"error": True, "error_message": error}
        }
