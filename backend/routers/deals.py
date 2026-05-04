from fastapi import APIRouter, Depends, HTTPException, status
from models import DealCreate, DealDetail, DealSummary
from auth import get_current_user
from db import get_db
from rate_limit import check_rate_limit
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
    check_rate_limit(user_id)

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
