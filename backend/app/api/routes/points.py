"""Points and leaderboard routes."""
from fastapi import APIRouter, Query

from app.core.auth import CurrentUser
from app.core.supabase import get_supabase_admin

router = APIRouter(tags=["points"])


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/points/me")
async def get_my_points(current_user: CurrentUser):
    """Return the current user's total points and full transaction history."""
    db = get_supabase_admin()
    user_id = current_user["sub"]

    user = db.table("users").select("total_points").eq("id", user_id).execute()
    total = user.data[0]["total_points"] if user.data else 0

    transactions = (
        db.table("point_transactions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return {"total_points": total, "transactions": transactions.data}


@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None),
):
    """Return top users ranked by total points. Public — no auth required."""
    db = get_supabase_admin()

    query = db.table("users").select("id, name, total_points, category").order("total_points", desc=True).limit(limit)

    if category:
        query = query.eq("category", category)

    result = query.execute()

    # Attach rank
    leaderboard = [
        {**user, "rank": idx + 1}
        for idx, user in enumerate(result.data)
    ]

    return {"leaders": leaderboard}
