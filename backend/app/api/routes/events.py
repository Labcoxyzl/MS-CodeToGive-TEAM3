"""Event routes — CRUD for flyering events."""
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.auth import CurrentUser
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/events", tags=["events"])

# NOTE: This is a super rough mock up of what events could look like
#       Feel free to edit whatever is needed

# ── Schemas ───────────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    title: str
    description: str
    date: str        # e.g. "2026-04-15"
    start_time: str  # e.g. "09:00:00"
    end_time: str    # e.g. "12:00:00"
    visibility: Literal["public", "private"] = "public"
    status: Literal["draft", "upcoming", "active", "completed", "cancelled"] = "upcoming"
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    volunteer_limit: int | None = None
    pantry_mode: Literal["none", "closest_pantries", "single_venue"] = "none"
    pantry_count: int | None = None       # used when pantry_mode = "closest_pantries"
    pantry_venue_id: str | None = None    # used when pantry_mode = "single_venue"
    flyer_language: Literal["en", "es"] = "en"


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    visibility: Literal["public", "private"] | None = None
    status: Literal["draft", "upcoming", "active", "completed", "cancelled"] | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    volunteer_limit: int | None = None
    pantry_mode: Literal["none", "closest_pantries", "single_venue"] | None = None
    pantry_count: int | None = None
    pantry_venue_id: str | None = None
    flyer_language: Literal["en", "es"] | None = None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    event_leader_id: str
    visibility: str
    status: str
    date: str
    start_time: str
    end_time: str
    location_name: str | None
    latitude: float | None
    longitude: float | None
    volunteer_limit: int | None
    current_signup_count: int
    pantry_mode: str
    pantry_count: int | None
    pantry_venue_id: str | None
    flyer_language: str
    flyer_url: str | None
    shareable_link: str | None
    created_at: str
    updated_at: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=EventResponse)
async def create_event(body: EventCreate, current_user: CurrentUser):
    user_id = current_user["sub"]
    shareable_link = f"/events/{uuid.uuid4().hex[:10]}"

    insert_data = body.model_dump() | {
        "event_leader_id": user_id,
        "shareable_link": shareable_link,
    }

    result = get_supabase_admin().table("events").insert(insert_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create event")

    return result.data[0]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    result = get_supabase_admin().table("events").select("*").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    return result.data[0]


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, body: EventUpdate, current_user: CurrentUser):
    # Fetch existing event
    result = get_supabase_admin().table("events").select("*").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    event = result.data[0]
    if event["event_leader_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this event")

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=422, detail="No fields provided to update")

    updated = get_supabase_admin().table("events").update(update_data).eq("id", event_id).execute()
    if not updated.data:
        raise HTTPException(status_code=500, detail="Failed to update event")

    return updated.data[0]


# Cancel an event (soft delete) — only the event leader can cancel it
@router.delete("/{event_id}")
async def cancel_event(event_id: str, current_user: CurrentUser):
    result = get_supabase_admin().table("events").select("id, event_leader_id").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    if result.data[0]["event_leader_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this event")

    get_supabase_admin().table("events").update({"status": "cancelled"}).eq("id", event_id).execute()

    return {"success": True}
