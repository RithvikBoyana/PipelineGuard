from fastapi import APIRouter, Depends
from models import UsageResponse
from auth import get_current_user
from db import get_db
from datetime import datetime, timedelta

router = APIRouter()

WEEKLY_ANALYSIS_LIMIT = 5


@router.get("/usage", response_model=UsageResponse)
def get_usage(user_id: str = Depends(get_current_user)):
    db = get_db()
    today = datetime.utcnow()
    week_start = today - timedelta(days=today.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    next_monday = week_start + timedelta(days=7)

    result = (
        db.table("usage_logs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", week_start.isoformat())
        .execute()
    )
    used = result.count or 0

    return UsageResponse(
        used=used,
        limit=WEEKLY_ANALYSIS_LIMIT,
        resets_at=next_monday.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
