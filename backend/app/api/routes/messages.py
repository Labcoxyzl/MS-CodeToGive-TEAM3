"""Event messaging routes — send and list messages for an event."""
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/events", tags=["messages"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    content: str
    message_type: Literal["announcement", "reminder", "appreciation"] = "announcement"


class MessageResponse(BaseModel):
    id: str
    event_id: str
    sender_id: str
    message_type: str
    content: str
    sent_at: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/{event_id}/messages", status_code=status.HTTP_201_CREATED, response_model=MessageResponse)
async def send_message(event_id: str, body: SendMessageRequest, current_user: CurrentUser):
    """Send a message to all event volunteers — only the event leader can send."""
    db = get_supabase_admin()

    event = db.table("events").select("id, event_leader_id").eq("id", event_id).maybe_single().execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.data["event_leader_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Only the event leader can send messages")

    if not body.content.strip():
        raise HTTPException(status_code=422, detail="Message content cannot be empty")

    result = db.table("event_messages").insert({
        "event_id": event_id,
        "sender_id": current_user["sub"],
        "message_type": body.message_type,
        "content": body.content.strip(),
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to send message")

    return result.data[0]


@router.get("/{event_id}/messages", response_model=list[MessageResponse])
async def list_messages(event_id: str, current_user: CurrentUser):
    """Get all messages for an event — accessible by the leader or any signed-up volunteer."""
    db = get_supabase_admin()

    event = db.table("events").select("id, event_leader_id").eq("id", event_id).maybe_single().execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")

    is_leader = event.data["event_leader_id"] == current_user["sub"]

    if not is_leader:
        signup = (
            db.table("event_signups")
            .select("id")
            .eq("event_id", event_id)
            .eq("user_id", current_user["sub"])
            .neq("status", "cancelled")
            .maybe_single()
            .execute()
        )
        if not signup.data:
            raise HTTPException(status_code=403, detail="Only the event leader or a signed-up volunteer can view messages")

    result = db.table("event_messages").select("*").eq("event_id", event_id).order("sent_at").execute()
    return result.data
