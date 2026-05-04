from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SignalResult(BaseModel):
    present: bool
    score: int
    reasoning: str


class AnalysisResult(BaseModel):
    score: float
    summary: str
    signals: dict[str, SignalResult]


class DealCreate(BaseModel):
    name: str
    company_name: Optional[str] = None


class DealSummary(BaseModel):
    id: str
    name: str
    company_name: Optional[str]
    overall_score: Optional[float]
    transcript_count: int
    score_stale: bool = False
    created_at: datetime
    updated_at: datetime


class DealDetail(DealSummary):
    overall_analysis: Optional[AnalysisResult]


class TranscriptSummary(BaseModel):
    id: str
    deal_id: str
    call_number: int
    file_name: Optional[str]
    raw_text: Optional[str]
    individual_score: Optional[float]
    individual_analysis: Optional[AnalysisResult]
    status: str
    created_at: datetime


class UsageResponse(BaseModel):
    used: int
    limit: int
    resets_at: str
