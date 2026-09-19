import os
import re
import json
from typing import Dict, List, Any
from dotenv import load_dotenv
from google import genai
from google.genai import types
from loguru import logger

load_dotenv()


class EvaluationService:
    """Multi-provider LLM answer evaluation service supporting DeepSeek and Google Gemini"""
    
    def __init__(self):
        """Initialize DeepSeek and Gemini clients based on environment configuration"""
        self.provider = os.environ.get("LLM_PROVIDER", "deepseek").lower()
        
        # 1. Initialize DeepSeek Client (OpenAI-compatible)
        self.deepseek_api_key = os.environ.get("DEEPSEEK_API_KEY")
        self.deepseek_base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        self.deepseek_model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
        self.deepseek_client = None
        self.deepseek_async_client = None
        if self.deepseek_api_key:
            try:
                from openai import OpenAI, AsyncOpenAI
                self.deepseek_client = OpenAI(api_key=self.deepseek_api_key, base_url=self.deepseek_base_url)
                self.deepseek_async_client = AsyncOpenAI(api_key=self.deepseek_api_key, base_url=self.deepseek_base_url)
                logger.info(f"✅ Initialized DeepSeek client with {self.deepseek_model}")
            except Exception as e:
                logger.warning(f"Failed to initialize DeepSeek client: {e}")

        # 2. Initialize Google Gemini Client
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY")
        self.gemini_model = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
        self.gemini_client = None
        if self.gemini_api_key:
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
                logger.info(f"✅ Initialized GenAI client with {self.gemini_model}")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini client: {e}")
        
        if not self.deepseek_client and not self.gemini_client:
            raise ValueError("Neither DEEPSEEK_API_KEY nor GEMINI_API_KEY found in .env file.")
        
        logger.info(f"🚀 Active Primary LLM Provider: {self.provider.upper()}")

    def _call_deepseek_sync(self, sys_instruction: str, user_prompt: str) -> str:
        """Call DeepSeek API synchronously with structured JSON format"""
        response = self.deepseek_client.chat.completions.create(
            model=self.deepseek_model,
            messages=[
                {"role": "system", "content": sys_instruction},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        return response.choices[0].message.content

    async def _call_deepseek_async(self, sys_instruction: str, user_prompt: str) -> str:
        """Call DeepSeek API asynchronously with structured JSON format"""
        response = await self.deepseek_async_client.chat.completions.create(
            model=self.deepseek_model,
            messages=[
                {"role": "system", "content": sys_instruction},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        return response.choices[0].message.content

    def _call_gemini_sync(self, sys_instruction: str, user_prompt: str) -> str:
        """Call Gemini API synchronously with structured JSON format"""
        response = self.gemini_client.models.generate_content(
            model=self.gemini_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=sys_instruction,
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=1024,
            ),
        )
        return response.text

    async def _call_gemini_async(self, sys_instruction: str, user_prompt: str) -> str:
        """Call Gemini API asynchronously with structured JSON format"""
        response = await self.gemini_client.aio.models.generate_content(
            model=self.gemini_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=sys_instruction,
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=1024,
            ),
        )
        return response.text
    
    async def evaluate_answer_async(
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
        """Asynchronously evaluate student answer with primary provider and fallback"""
        effective_level = academic_level or class_level
        logger.info(f"[Async] Evaluating {subject} Q (max: {max_score} marks, provider: {self.provider}, level: {effective_level})")
        
        try:
            sys_instruction = self._create_system_instruction(
                subject=subject,
                max_score=max_score,
                system_type=system_type,
                academic_level=effective_level,
                class_level=class_level
            )
            user_prompt = self._create_user_prompt(
                question=question,
                student_answer=student_answer,
                textbook_context=textbook_context,
                marking_scheme=marking_scheme
            )
            
            raw_response = None
            provider_used = self.provider
            model_used = self.deepseek_model if self.provider == "deepseek" else self.gemini_model

            # Try primary provider (DeepSeek or Gemini)
            if self.provider == "deepseek" and self.deepseek_async_client:
                try:
                    raw_response = await self._call_deepseek_async(sys_instruction, user_prompt)
                except Exception as de:
                    logger.warning(f"DeepSeek async failed ({de}), attempting Gemini fallback...")
                    if self.gemini_client:
                        raw_response = await self._call_gemini_async(sys_instruction, user_prompt)
                        provider_used = "gemini"
                        model_used = self.gemini_model
                    else:
                        raise de
            elif self.gemini_client:
                try:
                    raw_response = await self._call_gemini_async(sys_instruction, user_prompt)
                except Exception as ge:
                    logger.warning(f"Gemini async failed ({ge}), attempting DeepSeek fallback...")
                    if self.deepseek_async_client:
                        raw_response = await self._call_deepseek_async(sys_instruction, user_prompt)
                        provider_used = "deepseek"
                        model_used = self.deepseek_model
                    else:
                        raise ge

            evaluation = self._parse_response(raw_response, max_score)
            return self._finalize_evaluation(
                evaluation, student_answer, rag_scores, marking_scheme,
                max_score, system_type, effective_level, provider=provider_used, model=model_used
            )
        except Exception as e:
            logger.error(f"❌ Async evaluation failed: {e}")
            return self._create_fallback_evaluation(max_score, str(e))

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
        """Evaluate student answer synchronously with primary provider and fallback"""
        effective_level = academic_level or class_level
        logger.info(f"Evaluating {subject} Q (max: {max_score} marks, provider: {self.provider}, level: {effective_level})")
        
        try:
            sys_instruction = self._create_system_instruction(
                subject=subject,
                max_score=max_score,
                system_type=system_type,
                academic_level=effective_level,
                class_level=class_level
            )
            user_prompt = self._create_user_prompt(
                question=question,
                student_answer=student_answer,
                textbook_context=textbook_context,
                marking_scheme=marking_scheme
            )

            raw_response = None
            provider_used = self.provider
            model_used = self.deepseek_model if self.provider == "deepseek" else self.gemini_model

            if self.provider == "deepseek" and self.deepseek_client:
                try:
                    raw_response = self._call_deepseek_sync(sys_instruction, user_prompt)
                except Exception as de:
                    logger.warning(f"DeepSeek sync failed ({de}), attempting Gemini fallback...")
                    if self.gemini_client:
                        raw_response = self._call_gemini_sync(sys_instruction, user_prompt)
                        provider_used = "gemini"
                        model_used = self.gemini_model
                    else:
                        raise de
            elif self.gemini_client:
                try:
                    raw_response = self._call_gemini_sync(sys_instruction, user_prompt)
                except Exception as ge:
                    logger.warning(f"Gemini sync failed ({ge}), attempting DeepSeek fallback...")
                    if self.deepseek_client:
                        raw_response = self._call_deepseek_sync(sys_instruction, user_prompt)
                        provider_used = "deepseek"
                        model_used = self.deepseek_model
                    else:
                        raise ge

            evaluation = self._parse_response(raw_response, max_score)
            return self._finalize_evaluation(
                evaluation, student_answer, rag_scores, marking_scheme,
                max_score, system_type, effective_level, provider=provider_used, model=model_used
            )
        except Exception as e:
            logger.error(f"❌ Evaluation failed: {e}")
            return self._create_fallback_evaluation(max_score, str(e))

    def _finalize_evaluation(
        self,
        evaluation: Dict,
        student_answer: str,
        rag_scores: List[float],
        marking_scheme: Any,
        max_score: int,
        system_type: str,
        effective_level: str,
        provider: str = "deepseek",
        model: str = "deepseek-chat"
    ) -> Dict:
        """Apply confidence calculation, leniency boost, and metadata packaging"""
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
            boosted_score = max(0, (max_score / 2.0) - 1.0)
            evaluation["score"] = max(original_score, boosted_score)
            logger.info(f"Confidence {confidence:.2f} > 0.20: Boosted score from {original_score} to {evaluation['score']}")
        
        evaluation["confidence"] = confidence
        evaluation["metadata"] = {
            "model": model,
            "provider": provider,
            "confidence": confidence,
            "system_type": system_type,
            "academic_level": effective_level
        }
        
        logger.info(f"✅ Score: {evaluation['score']}/{max_score}, Confidence: {confidence:.2f}")
        return evaluation
    
    def _create_system_instruction(self, subject: str, max_score: int, 
                                  system_type: str = "general", academic_level: str = None, 
                                  class_level: str = "12") -> str:
        """Create structured system instruction for Gemini prompt prefix caching"""
        correctness = round(max_score * 0.5, 1)
        completeness = round(max_score * 0.3, 1)
        understanding = round(max_score - correctness - completeness, 1)
        
        level_str = str(academic_level or class_level or "General")
        system_lower = str(system_type or "general").lower()
        system_display = str(system_type or "General Academic").strip().title()
        
        if any(keyword in system_lower for keyword in ["university", "college", "higher_ed", "engineering", "undergraduate", "postgraduate"]):
            evaluator_role = f"an expert University Professor and Examiner in {subject} (Academic Level: {level_str})"
            grading_guidance = (
                "Evaluate with university-level academic rigor. Verify conceptual accuracy, "
                "technical precision, mathematical derivations/steps, and professional terminology. "
                "Award fair partial credit for correct working steps."
            )
        elif any(keyword in system_lower for keyword in ["competitive", "gate", "gre", "upsc", "certification", "professional"]):
            evaluator_role = f"a rigorous Senior Evaluator for competitive and professional examination standards in {subject}"
            grading_guidance = (
                "Evaluate with high precision. Check analytical correctness, concise justifications, "
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
                "Evaluate fairly and constructively against the reference material and marking criteria. "
                "Reward valid points and provide clear, actionable feedback."
            )

        return f"""You are {evaluator_role}.
Guidance: {grading_guidance}

Evaluate the student answer against the reference material and marking scheme.
Output ONLY valid JSON matching this schema:
{{
  "score": <number between 0 and {max_score}>,
  "score_breakdown": {{
    "correctness": <0 to {correctness}>,
    "completeness": <0 to {completeness}>,
    "understanding": <0 to {understanding}>
  }},
  "correct_points": ["Specific correct points or steps demonstrated"],
  "errors": [
    {{
      "what": "Concise mistake or misconception statement",
      "why": "Conceptual explanation of why it is incorrect",
      "impact": "Mark reduction impact"
    }}
  ],
  "missing_concepts": ["Missing formulas, steps, or concepts"],
  "correct_answer_should_include": ["Core expectations for full-mark answer"],
  "improvement_guidance": [
    {{
      "suggestion": "Actionable recommendation",
      "resource": "Specific topic or chapter to revise",
      "practice": "Targeted problem type to practice"
    }}
  ],
  "overall_feedback": "Constructive, objective summary of performance."
}}
Return ONLY valid JSON without markdown code fences or conversational prose."""

    def _create_user_prompt(self, question: str, student_answer: str, textbook_context: str, 
                            marking_scheme: Any = None) -> str:
        """Create concise user prompt payload for minimal latency and token consumption"""
        marking_text = ""
        if marking_scheme:
            if isinstance(marking_scheme, dict):
                breakdown = marking_scheme.get("breakdown", [])
                if breakdown:
                    items = [f"- {item.get('point', '')} ({item.get('marks', '')} mark)" for item in breakdown]
                    marking_text += "\n\nOFFICIAL MARKING SCHEME / RUBRIC:\n" + "\n".join(items)
                elif marking_scheme.get("rubric"):
                    marking_text += f"\n\nOFFICIAL MARKING SCHEME / RUBRIC:\n{marking_scheme['rubric']}"
            elif isinstance(marking_scheme, str) and marking_scheme.strip():
                marking_text += f"\n\nOFFICIAL MARKING SCHEME / RUBRIC:\n{marking_scheme.strip()}"
            if isinstance(marking_scheme, dict) and "keywords" in marking_scheme and marking_scheme["keywords"]:
                marking_text += f"\nRequired Technical Keywords: {', '.join(marking_scheme['keywords'])}"

        parts = [f"QUESTION:\n{question.strip()}"]
        if marking_text:
            parts.append(marking_text.strip())
        if textbook_context and textbook_context.strip():
            parts.append(f"CURRICULUM REFERENCE / REFERENCE MATERIAL:\n{textbook_context.strip()}")
        parts.append(f"STUDENT SUBMITTED ANSWER:\n{student_answer.strip() if student_answer else '(No response submitted)'}")

        return "\n\n".join(parts)

    def _create_prompt(self, question, student_answer, textbook_context, 
                      subject, max_score, class_level, marking_scheme,
                      system_type="general", academic_level=None):
        """Backward-compatible combined prompt generator"""
        sys_inst = self._create_system_instruction(
            subject=subject,
            max_score=max_score,
            system_type=system_type,
            academic_level=academic_level,
            class_level=class_level
        )
        user_p = self._create_user_prompt(
            question=question,
            student_answer=student_answer,
            textbook_context=textbook_context,
            marking_scheme=marking_scheme
        )
        return f"{sys_inst}\n\n{user_p}"
    
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
        if marking_scheme and isinstance(marking_scheme, dict) and 'keywords' in marking_scheme:
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


# Global singleton instance
_evaluation_service_instance = None


def get_evaluation_service() -> EvaluationService:
    """Thread-safe lazy singleton for EvaluationService to avoid duplicate GenAI client instantiations"""
    global _evaluation_service_instance
    if _evaluation_service_instance is None:
        _evaluation_service_instance = EvaluationService()
    return _evaluation_service_instance

