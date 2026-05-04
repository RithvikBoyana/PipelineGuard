from datetime import datetime, timedelta
from db import get_db
from fastapi import HTTPException, status

PLAN_LIMITS: dict[str, int] = {
    "free": 5,
    "tester": 100,
}
DEFAULT_LIMIT = 5


def get_user_limit(user_id: str) -> int:
    db = get_db()
    result = db.table("profiles").select("plan").eq("user_id", user_id).execute()
    if result.data:
        plan = result.data[0].get("plan", "free")
        return PLAN_LIMITS.get(plan, DEFAULT_LIMIT)
    return DEFAULT_LIMIT


def get_week_bounds() -> tuple[datetime, datetime]:
    today = datetime.utcnow()
    week_start = (today - timedelta(days=today.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return week_start, week_start + timedelta(days=7)


def get_usage_count(user_id: str) -> int:
    db = get_db()
    week_start, _ = get_week_bounds()
    result = (
        db.table("usage_logs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", week_start.isoformat())
        .execute()
    )
    return result.count or 0


def check_rate_limit(user_id: str) -> int:
    used = get_usage_count(user_id)
    limit = get_user_limit(user_id)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Weekly analysis limit of {limit} reached. Resets next Monday.",
        )
    return used
