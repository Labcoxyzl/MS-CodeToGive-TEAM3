"""Co-manager routes — promote/demote event co-managers."""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/events", tags=["co-managers"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class AddCoManagerRequest(BaseModel):
    user_id: str | None = None
    email: str | None = None


class CoManagerResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    added_by: str
    added_at: str
    name: str | None
    email: str | None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _require_leader(event_id: str, user_id: str, db) -> None:
    """Raise 403 if user is not the event leader (only leader can manage co-managers)."""
    event = db.table("events").select("event_leader_id").eq("id", event_id).maybe_single().execute()
    if not event or not event.data:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.data["event_leader_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the event leader can manage co-managers")


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/{event_id}/co-managers", response_model=list[CoManagerResponse])
async def list_co_managers(event_id: str, current_user: CurrentUser):
    """List co-managers for an event. Accessible by the leader or any co-manager."""
    db = get_supabase_admin()

    # Verify event exists
    event = db.table("events").select("event_leader_id").eq("id", event_id).maybe_single().execute()
    if not event or not event.data:
        raise HTTPException(status_code=404, detail="Event not found")

    user_id = current_user["sub"]
    is_leader = event.data["event_leader_id"] == user_id

    if not is_leader:
        co_check = (
            db.table("event_co_managers")
            .select("id")
            .eq("event_id", event_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if not co_check or not co_check.data:
            raise HTTPException(status_code=403, detail="Not authorised")

    rows = (
        db.table("event_co_managers")
        .select("*")
        .eq("event_id", event_id)
        .order("added_at")
        .execute()
    )

    enriched = []
    for row in rows.data:
        user = db.table("users").select("name, email").eq("id", row["user_id"]).maybe_single().execute()
        enriched.append({
            **row,
            "name": user.data["name"] if user and user.data else None,
            "email": user.data["email"] if user and user.data else None,
        })

    return enriched


@router.post("/{event_id}/co-managers", status_code=status.HTTP_201_CREATED, response_model=CoManagerResponse)
async def add_co_manager(event_id: str, body: AddCoManagerRequest, current_user: CurrentUser):
    """Promote a user to co-manager. Provide either user_id or email. Leader only."""
    db = get_supabase_admin()
    _require_leader(event_id, current_user["sub"], db)

    if not body.user_id and not body.email:
        raise HTTPException(status_code=422, detail="Provide either user_id or email")

    # Resolve user
    if body.user_id:
        user_result = db.table("users").select("id, name, email").eq("id", body.user_id).maybe_single().execute()
    else:
        user_result = db.table("users").select("id, name, email").eq("email", body.email).maybe_single().execute()

    if not user_result or not user_result.data:
        raise HTTPException(status_code=404, detail="No platform account found for that user")

    target_user = user_result.data

    # Cannot promote the leader themselves
    event = db.table("events").select("event_leader_id").eq("id", event_id).maybe_single().execute()
    if event and event.data and event.data["event_leader_id"] == target_user["id"]:
        raise HTTPException(status_code=422, detail="Event leader is already the primary manager")

    # Check for duplicate
    existing = (
        db.table("event_co_managers")
        .select("id")
        .eq("event_id", event_id)
        .eq("user_id", target_user["id"])
        .maybe_single()
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="User is already a co-manager")

    result = db.table("event_co_managers").insert({
        "event_id": event_id,
        "user_id": target_user["id"],
        "added_by": current_user["sub"],
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to add co-manager")

    return {
        **result.data[0],
        "name": target_user["name"],
        "email": target_user["email"],
    }


@router.delete("/{event_id}/co-managers/{user_id}", status_code=status.HTTP_200_OK)
async def remove_co_manager(event_id: str, user_id: str, current_user: CurrentUser):
    """Remove a co-manager. Leader only."""
    db = get_supabase_admin()
    _require_leader(event_id, current_user["sub"], db)

    existing = (
        db.table("event_co_managers")
        .select("id")
        .eq("event_id", event_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Co-manager not found")

    db.table("event_co_managers").delete().eq("id", existing.data["id"]).execute()
    return {"success": True}
