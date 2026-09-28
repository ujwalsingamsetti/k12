"""Answer Normalizer and Multi-Page Collation Service.

Cleans OCR transcription errors, normalizes mathematical notations and spelling,
and collates scattered student answers across multiple exam booklet pages prior to
targeted question-by-question vector retrieval and evaluation.
"""
import os
import re
import json
import asyncio
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from loguru import logger
from google import genai
from openai import AsyncOpenAI
from app.services.answer_parser import AnswerParser

load_dotenv()


class AnswerNormalizer:
    """LLM-powered OCR text cleanup, normalization, and multi-page answer collation service."""

    def __init__(self) -> None:
        """Initialize LLM clients for answer normalization and collation."""
        self.provider: str = os.environ.get("LLM_PROVIDER", "deepseek").lower()
        self.answer_parser: AnswerParser = AnswerParser()

        # DeepSeek Client
        self.deepseek_api_key: Optional[str] = os.environ.get("DEEPSEEK_API_KEY")
        self.deepseek_base_url: str = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        self.deepseek_model: str = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
        self.deepseek_async_client: Optional[AsyncOpenAI] = None

        if self.deepseek_api_key:
            try:
                self.deepseek_async_client = AsyncOpenAI(
                    api_key=self.deepseek_api_key,
                    base_url=self.deepseek_base_url
                )
                logger.info(f"✅ AnswerNormalizer: DeepSeek client initialized with {self.deepseek_model}")
            except Exception as e:
                logger.warning(f"AnswerNormalizer: Failed to initialize DeepSeek client: {e}")

        # Gemini Client
        self.gemini_api_key: Optional[str] = os.environ.get("GEMINI_API_KEY")
        self.gemini_model: str = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
        self.gemini_client: Optional[genai.Client] = None

        if self.gemini_api_key:
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
                logger.info(f"✅ AnswerNormalizer: GenAI client initialized with {self.gemini_model}")
            except Exception as e:
                logger.warning(f"AnswerNormalizer: Failed to initialize Gemini client: {e}")

    async def normalize_and_collate_answers_async(
        self,
        questions: List[Dict[str, Any]],
        page_ocr_items: List[Dict[str, Any]],
        subject: str = "science",
        academic_level: str = "Class 10"
    ) -> Dict[str, Any]:
        """Clean OCR transcription errors, collate multi-page answers, and map to individual questions.

        Args:
            questions: List of question dictionaries containing question_number, question_text, marking_scheme.
            page_ocr_items: List of dictionaries with 'page_number' (int) and 'text' (str).
            subject: Academic subject (e.g. physics, science, mathematics).
            academic_level: Academic grade level (e.g. Class 10, Class 12).

        Returns:
            Dictionary containing mapped question answers, cleaning notes, and collation telemetry:
            {
                "questions_map": {question_number: {...}},
                "overall_cleaning_summary": "...",
                "raw_text_length": int,
                "cleaned_text_length": int
            }
        """
        logger.info(
            f"Starting LLM OCR cleanup and multi-page collation for {len(questions)} questions "
            f"across {len(page_ocr_items)} pages (subject={subject}, level={academic_level})"
        )

        # Prepare formatted prompt payload
        system_instruction = (
            "You are an expert OCR transcription normalizer and multi-page examination collation specialist. "
            "Your tasks are:\n"
            "1. Read the provided OCR text extracted from each page of a student's examination booklet.\n"
            "2. Fix OCR spelling mistakes, broken mathematical symbols, missing exponents, and distorted formatting.\n"
            "3. Identify and COLLATE all fragments, equations, and continuation sections that belong to each specific question, "
            "even if written on different pages, in margins, or out of order.\n"
            "4. Return a structured answer for EACH question number present in the question paper.\n"
            "5. STRICT RULE: DO NOT GRADE, EVALUATE, OR ASSIGN MARKS. Only clean, normalize, and consolidate.\n"
            "6. If a student did not attempt a question anywhere on any page, set 'cleaned_student_answer' to "
            "'[Not attempted by student in submitted sheet]' and 'attempted' to false.\n"
            "Return JSON only, no prose, no markdown code blocks."
        )

        user_payload = {
            "subject": subject,
            "academic_level": academic_level,
            "target_questions": [
                {
                    "question_number": int(q.get("question_number", idx)),
                    "question_text": str(q.get("question_text", "")),
                    "marking_scheme_summary": str(q.get("marking_scheme", ""))[:200]
                }
                for idx, q in enumerate(questions, start=1)
            ],
            "raw_ocr_pages": [
                {
                    "page_number": int(item.get("page_number", idx)),
                    "raw_ocr_text": str(item.get("text", "")).strip()
                }
                for idx, item in enumerate(page_ocr_items, start=1)
                if item.get("text", "").strip()
            ]
        }

        json_schema_prompt = (
            "Format your response as a valid JSON object with this exact structure:\n"
            "{\n"
            '  "questions": [\n'
            "    {\n"
            '      "question_number": 1,\n'
            '      "cleaned_student_answer": "Unified, typo-corrected student answer for Question 1",\n'
            '      "raw_extracted_fragment": "Brief snippet of raw OCR text found for this question",\n'
            '      "attempted": true,\n'
            '      "sources_found_on_pages": [1, 2],\n'
            '      "cleaning_notes": "Merged answer from page 1 and continuation from page 2. Fixed formula symbols."\n'
            "    }\n"
            "  ],\n"
            '  "overall_cleaning_summary": "Summary of corrections and multi-page collations performed"\n'
            "}\n"
            "Return JSON only, no prose, no markdown."
        )

        prompt_str = f"{json.dumps(user_payload, indent=2)}\n\n{json_schema_prompt}"

        # 1. Attempt LLM Normalization (DeepSeek primary or Gemini fallback)
        raw_llm_response: Optional[str] = None
        if self.provider == "deepseek" and self.deepseek_async_client:
            try:
                logger.info("Executing OCR normalization and collation via DeepSeek-V3...")
                response = await self.deepseek_async_client.chat.completions.create(
                    model=self.deepseek_model,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt_str}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=8192
                )
                if response.choices and response.choices[0].message.content:
                    raw_llm_response = response.choices[0].message.content.strip()
                    logger.info("DeepSeek OCR normalization completed successfully")
            except Exception as e:
                logger.warning(f"DeepSeek OCR normalization failed: {e}. Falling back to Gemini...")

        # Fallback to Gemini if DeepSeek was unavailable or failed
        if not raw_llm_response and self.gemini_client:
            gemini_candidates = [
                os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
                "gemini-3.5-flash-lite",
                "gemini-3.6-flash",
                "gemini-1.5-flash"
            ]
            for g_model in gemini_candidates:
                try:
                    logger.info(f"Attempting OCR normalization via Gemini ({g_model})...")
                    gemini_resp = await asyncio.to_thread(
                        self.gemini_client.models.generate_content,
                        model=g_model,
                        contents=[f"{system_instruction}\n\n{prompt_str}"]
                    )
                    if gemini_resp and gemini_resp.text:
                        raw_llm_response = gemini_resp.text.strip()
                        logger.info(f"Gemini OCR normalization succeeded with {g_model}")
                        break
                except Exception as ge:
                    logger.warning(f"Gemini model {g_model} normalization attempt failed: {ge}")

        # Helper for resilient JSON decoding with partial-recovery support
        def _parse_or_repair_json(raw_text: str) -> Optional[Dict[str, Any]]:
            if not raw_text:
                return None
            clean_str = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
            clean_str = re.sub(r"\s*```$", "", clean_str, flags=re.MULTILINE).strip()
            
            # Direct parse attempt
            try:
                return json.loads(clean_str)
            except Exception:
                pass

            # Truncation recovery: If truncated inside questions array, close it cleanly
            try:
                last_brace = clean_str.rfind("}")
                if last_brace != -1:
                    repaired = clean_str[:last_brace + 1].strip()
                    if not repaired.endswith("]}"):
                        if not repaired.endswith("]"):
                            repaired += "\n  ],\n  \"overall_cleaning_summary\": \"Recovered from partial stream\"\n}"
                        else:
                            repaired += "\n}"
                    return json.loads(repaired)
            except Exception as re_err:
                logger.debug(f"JSON truncation repair attempt 1 failed: {re_err}")

            # Heuristic regex item extraction: extract individual question objects
            try:
                question_items = []
                q_blocks = re.findall(r'\{\s*"question_number"\s*:\s*(\d+)[\s\S]*?"cleaned_student_answer"\s*:\s*"((?:[^"\\]|\\.)*)"', clean_str)
                for q_num_str, q_ans in q_blocks:
                    question_items.append({
                        "question_number": int(q_num_str),
                        "cleaned_student_answer": q_ans.replace('\\"', '"').replace('\\n', '\n'),
                        "attempted": True,
                        "sources_found_on_pages": [],
                        "cleaning_notes": "Recovered via regex pattern extraction"
                    })
                if question_items:
                    logger.info(f"Successfully recovered {len(question_items)} questions via regex pattern extraction")
                    return {
                        "questions": question_items,
                        "overall_cleaning_summary": f"Recovered {len(question_items)} questions from formatted stream"
                    }
            except Exception as rx_err:
                logger.debug(f"Regex item extraction failed: {rx_err}")

            return None

        # Parse LLM response JSON
        if raw_llm_response:
            parsed_data = _parse_or_repair_json(raw_llm_response)
            if parsed_data and isinstance(parsed_data, dict):
                try:
                    questions_list = parsed_data.get("questions", [])
                    questions_map: Dict[int, Dict[str, Any]] = {}
                    for item in questions_list:
                        q_num = int(item.get("question_number", 0))
                        if q_num > 0:
                            questions_map[q_num] = {
                                "question_number": q_num,
                                "cleaned_student_answer": str(item.get("cleaned_student_answer", "")).strip(),
                                "raw_extracted_fragment": str(item.get("raw_extracted_fragment", "")).strip(),
                                "attempted": bool(item.get("attempted", True)),
                                "sources_found_on_pages": item.get("sources_found_on_pages", []),
                                "cleaning_notes": str(item.get("cleaning_notes", "Normalized via LLM"))
                            }

                    # Ensure all requested questions exist in map
                    for q in questions:
                        q_num = int(q.get("question_number", 1))
                        if q_num not in questions_map:
                            questions_map[q_num] = {
                                "question_number": q_num,
                                "cleaned_student_answer": "[Not attempted by student in submitted sheet]",
                                "raw_extracted_fragment": "",
                                "attempted": False,
                                "sources_found_on_pages": [],
                                "cleaning_notes": "Not detected across submitted pages"
                            }

                    total_cleaned_len = sum(len(v["cleaned_student_answer"]) for v in questions_map.values())
                    total_raw_len = sum(len(item.get("text", "")) for item in page_ocr_items)

                    return {
                        "questions_map": questions_map,
                        "overall_cleaning_summary": parsed_data.get(
                            "overall_cleaning_summary",
                            f"Successfully cleaned and collated {len(questions_map)} questions across {len(page_ocr_items)} pages."
                        ),
                        "raw_text_length": total_raw_len,
                        "cleaned_text_length": total_cleaned_len,
                        "provider_used": self.provider
                    }
                except Exception as pe:
                    logger.warning(f"Error mapping parsed normalizer data ({pe}); falling back to AnswerParser...")
            else:
                logger.warning("Could not parse LLM normalizer JSON output; falling back to AnswerParser...")

        # 2. Resilient Rule-Based Fallback using AnswerParser
        logger.info("Executing rule-based AnswerParser fallback for answer mapping...")
        combined_text = "\n\n".join(
            f"[Page {item.get('page_number', idx)}] {item.get('text', '')}"
            for idx, item in enumerate(page_ocr_items, start=1)
        )
        regex_map = self.answer_parser.parse_answers(combined_text)

        fallback_questions_map: Dict[int, Dict[str, Any]] = {}
        for q in questions:
            q_num = int(q.get("question_number", 1))
            ans_text = regex_map.get(q_num, "").strip()
            fallback_questions_map[q_num] = {
                "question_number": q_num,
                "cleaned_student_answer": ans_text if ans_text else "[Not attempted by student in submitted sheet]",
                "raw_extracted_fragment": ans_text[:200] if ans_text else "",
                "attempted": bool(ans_text),
                "sources_found_on_pages": [1],
                "cleaning_notes": "Extracted via regex rule-based segmenter fallback"
            }

        return {
            "questions_map": fallback_questions_map,
            "overall_cleaning_summary": "Extracted using regex AnswerParser fallback",
            "raw_text_length": len(combined_text),
            "cleaned_text_length": sum(len(v["cleaned_student_answer"]) for v in fallback_questions_map.values()),
            "provider_used": "regex_fallback"
        }
