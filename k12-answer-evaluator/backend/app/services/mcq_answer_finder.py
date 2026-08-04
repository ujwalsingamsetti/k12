import os
import logging
from typing import Dict, Optional
from google import genai
from google.genai import types
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

class MCQAnswerFinder:
    """Find correct MCQ answers using RAG + LLM"""
    
    def __init__(self):
        self.rag_service = RAGService()
        api_key = os.environ.get("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key)
        self.model_name = 'gemini-2.5-flash'
    
    def find_correct_answer(
        self,
        question_text: str,
        options: Dict[str, str],
        subject: str
    ) -> Optional[str]:
        """
        Find correct MCQ answer using textbook context + LLM
        
        Args:
            question_text: The MCQ question
            options: Dict like {"A": "option1", "B": "option2", ...}
            subject: Subject name for RAG retrieval
            
        Returns:
            Correct answer letter (A/B/C/D) or None
        """
        
        if not options or len(options) < 2:
            logger.warning("No valid options provided")
            return None
        
        try:
            # Get relevant textbook context
            context_chunks = self.rag_service.retrieve_relevant_context(
                question_text,
                subject=subject,
                top_k=3
            )
            context = self.rag_service.format_context_for_llm(context_chunks)
            
            # Build prompt
            options_text = "\n".join([f"({k}) {v}" for k, v in options.items()])
            
            prompt = f"""You are a {subject} expert. Based on the textbook reference, identify the CORRECT answer.

QUESTION:
{question_text}

OPTIONS:
{options_text}

TEXTBOOK REFERENCE:
{context}

Return ONLY the letter (A, B, C, or D) of the correct answer. No explanation needed.
Answer:"""
            
            # Get LLM response
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,  # Low temperature for factual answers
                    max_output_tokens=10,
                ),
            )
            
            # Extract answer letter
            answer = response.text.strip().upper()
            
            # Validate it's a single letter A-D
            if len(answer) == 1 and answer in options:
                logger.info(f"Found correct answer: {answer}")
                return answer
            
            # Try to extract letter from response
            for char in answer:
                if char in options:
                    logger.info(f"Extracted correct answer: {char}")
                    return char
            
            logger.warning(f"Could not parse answer from: {answer}")
            return None
            
        except Exception as e:
            logger.error(f"Error finding correct answer: {e}")
            return None
