from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import Optional
from models import TranscriptSummary
from auth import get_current_user
from db import get_db
from services import parser_service, storage_service, ai_service

router = APIRouter()

WEEKLY_ANALYSIS_LIMIT = 5


def _check_rate_limit(user_id: str) -> int:
    db = get_db()
    from datetime import datetime, timedelta
    today = datetime.utcnow()
    week_start = today - timedelta(days=today.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    result = (
        db.table("usage_logs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", week_start.isoformat())
        .execute()
    )
    used = result.count or 0
    if used >= WEEKLY_ANALYSIS_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Weekly analysis limit of {WEEKLY_ANALYSIS_LIMIT} reached. Resets next Monday.",
        )
    return used


@router.get("/{deal_id}/transcripts", response_model=list[TranscriptSummary])
def list_transcripts(deal_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    _assert_deal_owner(deal_id, user_id)
    result = (
        db.table("transcripts")
        .select("*")
        .eq("deal_id", deal_id)
        .order("call_number", desc=False)
        .execute()
    )
    return result.data


@router.post("/{deal_id}/transcripts", response_model=TranscriptSummary, status_code=status.HTTP_201_CREATED)
async def upload_transcript(
    deal_id: str,
    user_id: str = Depends(get_current_user),
    file: Optional[UploadFile] = File(None),
    pasted_text: Optional[str] = Form(None),
):
    if not file and not pasted_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide a file or pasted text.")

    _check_rate_limit(user_id)
    db = get_db()
    deal = _assert_deal_owner(deal_id, user_id)

    # Parse transcript text
    if pasted_text:
        raw_text = pasted_text
        file_name = None
        file_path = None
    else:
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds 10MB limit.")
        content = await file.read()
        raw_text = parser_service.parse(content, file.filename)
        file_name = file.filename
        file_path = None  # set after storage upload below

    # Determine call number
    count_result = (
        db.table("transcripts")
        .select("id", count="exact")
        .eq("deal_id", deal_id)
        .execute()
    )
    call_number = (count_result.count or 0) + 1

    # Insert transcript row (status=analyzing)
    row = db.table("transcripts").insert({
        "deal_id": deal_id,
        "user_id": user_id,
        "call_number": call_number,
        "file_name": file_name,
        "raw_text": raw_text,
        "status": "analyzing",
    }).execute().data[0]
    transcript_id = row["id"]

    # Upload file to storage if present
    if file and file_name:
        file_path = storage_service.upload(
            user_id=user_id,
            deal_id=deal_id,
            transcript_id=transcript_id,
            filename=file_name,
            content=content,
        )
        db.table("transcripts").update({"file_path": file_path}).eq("id", transcript_id).execute()

    # Step 1: individual analysis
    individual = ai_service.analyze_individual(raw_text)

    # Step 2: aggregate analysis across all transcripts
    all_transcripts = (
        db.table("transcripts")
        .select("raw_text, call_number")
        .eq("deal_id", deal_id)
        .order("call_number")
        .execute()
    ).data
    # Replace current transcript's raw_text (it may not be saved yet in the query)
    all_transcripts = [t for t in all_transcripts if t["call_number"] != call_number]
    all_transcripts.append({"raw_text": raw_text, "call_number": call_number})
    all_transcripts.sort(key=lambda t: t["call_number"])

    aggregate = ai_service.analyze_aggregate(all_transcripts)

    # Update transcript row with individual results
    db.table("transcripts").update({
        "individual_score": individual.score,
        "individual_analysis": individual.model_dump(),
        "status": "done",
    }).eq("id", transcript_id).execute()

    # Update deal with aggregate results
    db.table("deals").update({
        "overall_score": aggregate.score,
        "overall_analysis": aggregate.model_dump(),
        "transcript_count": call_number,
        "updated_at": "now()",
    }).eq("id", deal_id).execute()

    # Log usage
    db.table("usage_logs").insert({
        "user_id": user_id,
        "deal_id": deal_id,
        "transcript_id": transcript_id,
    }).execute()

    return db.table("transcripts").select("*").eq("id", transcript_id).single().execute().data


@router.delete("/{deal_id}/transcripts/{transcript_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transcript(deal_id: str, transcript_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    _assert_deal_owner(deal_id, user_id)
    result = (
        db.table("transcripts")
        .select("id, file_path")
        .eq("id", transcript_id)
        .eq("deal_id", deal_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not found")
    if result.data.get("file_path"):
        storage_service.delete(result.data["file_path"])
    db.table("transcripts").delete().eq("id", transcript_id).execute()


def _assert_deal_owner(deal_id: str, user_id: str) -> dict:
    db = get_db()
    result = (
        db.table("deals")
        .select("id, name")
        .eq("id", deal_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
    return result.data
