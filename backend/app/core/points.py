"""Points service — award points and update user totals."""
import uuid
from datetime import datetime


POINTS_PER_HOUR = 10


def calculate_event_points(start_time: str, end_time: str) -> int:
    """Convert event duration to points. e.g. 2.5hrs → 25 pts."""
    fmt = "%H:%M:%S"
    start = datetime.strptime(start_time, fmt)
    end = datetime.strptime(end_time, fmt)
    hours = (end - start).total_seconds() / 3600
    return round(hours * POINTS_PER_HOUR)


def award_points(db, user_id: str, action: str, points: int, event_id: str | None = None, description: str | None = None):
    """Insert a point transaction and increment the user's total_points."""
    db.table("point_transactions").insert({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "event_id": event_id,
        "action": action,
        "points": points,
        "description": description,
    }).execute()

    # Fetch current total and increment
    result = db.table("users").select("total_points").eq("id", user_id).execute()
    if result.data:
        current = result.data[0]["total_points"] or 0
        db.table("users").update({"total_points": current + points}).eq("id", user_id).execute()
