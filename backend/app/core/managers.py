"""Shared helper for event manager authorization (leader or co-manager)."""
from app.core.supabase import get_supabase_admin


def is_authorized_manager(event_id: str, user_id: str) -> bool:
    """Return True if user_id is the event leader or a co-manager of the event."""
    db = get_supabase_admin()

    event = db.table("events").select("event_leader_id").eq("id", event_id).maybe_single().execute()
    if not event.data:
        return False

    if event.data["event_leader_id"] == user_id:
        return True

    co_manager = (
        db.table("event_co_managers")
        .select("id")
        .eq("event_id", event_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return bool(co_manager.data)
