from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from models import DealCreate, DealDetail, DealSummary
from auth import get_current_user
from db import get_db
from services import ai_service

router = APIRouter()


@router.get("", response_model=list[DealSummary])
def list_deals(user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("deals")
        .select("id, name, company_name, overall_score, transcript_count, created_at, updated_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("", response_model=DealSummary, status_code=status.HTTP_201_CREATED)
def create_deal(payload: DealCreate, user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("deals")
        .insert({
            "user_id": user_id,
            "name": payload.name,
            "company_name": payload.company_name,
        })
        .execute()
    )
    return result.data[0]


@router.get("/{deal_id}", response_model=DealDetail)
def get_deal(deal_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("deals")
        .select("*")
        .eq("id", deal_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
    return result.data


@router.post("/{deal_id}/reanalyze", response_model=DealDetail)
def reanalyze_deal(deal_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()

    # Check rate limit
    WEEKLY_LIMIT = 5
    today = datetime.utcnow()
    week_start = (today - timedelta(days=today.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    used = (
        db.table("usage_logs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", week_start.isoformat())
        .execute()
    ).count or 0
    if used >= WEEKLY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Weekly analysis limit of {WEEKLY_LIMIT} reached. Resets next Monday.",
        )

    deal_result = (
        db.table("deals").select("id").eq("id", deal_id).eq("user_id", user_id).execute()
    )
    if not deal_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")

    transcripts = (
        db.table("transcripts")
        .select("raw_text, call_number")
        .eq("deal_id", deal_id)
        .eq("status", "done")
        .order("call_number")
        .execute()
    ).data
    if not transcripts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No analyzed transcripts to re-analyze")

    aggregate = ai_service.analyze_aggregate(transcripts)

    db.table("deals").update({
        "overall_score": aggregate.score,
        "overall_analysis": aggregate.model_dump(),
        "score_stale": False,
        "updated_at": "now()",
    }).eq("id", deal_id).execute()

    db.table("usage_logs").insert({
        "user_id": user_id,
        "deal_id": deal_id,
        "transcript_id": None,
    }).execute()

    return db.table("deals").select("*").eq("id", deal_id).execute().data[0]


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deal(deal_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("deals")
        .select("id")
        .eq("id", deal_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
    db.table("deals").delete().eq("id", deal_id).execute()
