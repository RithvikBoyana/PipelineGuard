from fastapi import APIRouter, Depends
from models import UsageResponse
from auth import get_current_user
from rate_limit import get_usage_count, get_user_limit, get_week_bounds

router = APIRouter()


@router.get("/usage", response_model=UsageResponse)
def get_usage(user_id: str = Depends(get_current_user)):
    _, next_monday = get_week_bounds()
    return UsageResponse(
        used=get_usage_count(user_id),
        limit=get_user_limit(user_id),
        resets_at=next_monday.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
