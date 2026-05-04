from fastapi import APIRouter, Depends, HTTPException, status
from models import DealCreate, DealDetail, DealSummary
from auth import get_current_user
from db import get_db

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
