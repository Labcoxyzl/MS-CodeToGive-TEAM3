"""Points service — award points and update user totals."""
import uuid
from datetime import datetime


POINTS_PER_HOUR = 10
LEADER_MULTIPLIER = 1.5   # Leaders earn 15 pts/hr vs volunteers' 10 pts/hr
LEADER_BONUS_PER_ATTENDEE = 5  # Extra pts per volunteer who attended the event


def _parse_time(value: str) -> datetime:
    """Parse HH:MM:SS, HH:MM, or a full ISO datetime — return a datetime object."""
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            pass
    # Full ISO datetime (e.g. "2026-03-29T11:00:00+00:00")
    return datetime.fromisoformat(value)


def calculate_event_points(start_time: str, end_time: str) -> int:
    """Convert event duration to points. e.g. 2.5hrs → 25 pts."""
    hours = (_parse_time(end_time) - _parse_time(start_time)).total_seconds() / 3600
    return round(hours * POINTS_PER_HOUR)


def calculate_leader_points(start_time: str, end_time: str) -> int:
    """Points awarded to the event leader on completion (1.5x volunteer rate)."""
    hours = (_parse_time(end_time) - _parse_time(start_time)).total_seconds() / 3600
    return round(hours * POINTS_PER_HOUR * LEADER_MULTIPLIER)


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
