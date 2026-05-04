from openai import OpenAI
from models import AnalysisResult
from pathlib import Path
import json
import os

_client: OpenAI | None = None

SCORING_PROMPT_PATH = Path(__file__).parent.parent / "scoring" / "scoring_prompt.txt"


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


def _load_scoring_prompt() -> str:
    return SCORING_PROMPT_PATH.read_text(encoding="utf-8")


def _call_model(system: str, user: str) -> AnalysisResult:
    model = os.getenv("AI_MODEL", "gpt-4o-mini")
    client = _get_client()
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.1,
    )
    raw = json.loads(response.choices[0].message.content)
    return AnalysisResult(**raw)


def analyze_individual(transcript_text: str) -> AnalysisResult:
    scoring_prompt = _load_scoring_prompt()
    system = f"""{scoring_prompt}

You are analyzing a single discovery call transcript.
Evaluate the transcript against the 5 qualification signals.
Respond with a JSON object matching this exact schema:
{{
  "score": <integer 0-5>,
  "summary": "<one paragraph natural language summary>",
  "signals": {{
    "decision_maker": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence citing transcript evidence>"}},
    "problem_articulation": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence>"}},
    "budget_authority": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence>"}},
    "urgency": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence>"}},
    "next_steps": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence>"}}
  }}
}}"""
    return _call_model(system, f"TRANSCRIPT:\n\n{transcript_text}")


def analyze_aggregate(transcripts: list[dict]) -> AnalysisResult:
    scoring_prompt = _load_scoring_prompt()
    combined = "\n\n---\n\n".join(
        f"CALL {t['call_number']}:\n{t['raw_text']}" for t in transcripts
    )
    system = f"""{scoring_prompt}

You are analyzing ALL transcripts for a single deal to produce an overall qualification score.
Use the best evidence found across ALL calls — a signal confirmed in any call counts as present.
Respond with a JSON object matching this exact schema:
{{
  "score": <integer 0-5>,
  "summary": "<one paragraph natural language summary>",
  "signals": {{
    "decision_maker": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence citing transcript evidence>"}},
    "problem_articulation": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence>"}},
    "budget_authority": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence>"}},
    "urgency": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence>"}},
    "next_steps": {{"present": <bool>, "score": <0 or 1>, "reasoning": "<one sentence>"}}
  }}
}}"""
    return _call_model(system, f"ALL TRANSCRIPTS:\n\n{combined}")
