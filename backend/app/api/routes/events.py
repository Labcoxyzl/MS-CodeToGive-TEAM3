"""Event routes — CRUD for flyering events."""
import uuid
from datetime import datetime, timezone
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from app.core.auth import CurrentUser
from app.core.supabase import get_supabase_admin
from app.core.points import award_points, calculate_leader_points, LEADER_BONUS_PER_ATTENDEE

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
    pantry_mode: Literal["none", "nearby_resources", "single_resource"] = "none"
    resource_count: int | None = None     # used when pantry_mode = "nearby_resources"
    resource_id: str | None = None        # Lemontree API resource ID for single_resource mode
    flyer_language: Literal["en", "es", "fr", "pt", "it", "pl", "ht", "tl"] = "en"


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
    pantry_mode: Literal["none", "nearby_resources", "single_resource"] | None = None
    resource_count: int | None = None
    resource_id: str | None = None
    flyer_language: Literal["en", "es", "fr", "pt", "it", "pl", "ht", "tl"] | None = None


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
    resource_count: int | None
    resource_id: str | None
    flyer_language: str
    flyer_url: str | None
    shareable_link: str | None
    created_at: str | None
    updated_at: str | None


# ── Routes ────────────────────────────────────────────────────────────────────

# List all public events with optional filters for status, date range, and pagination
@router.get("/", response_model=list[EventResponse])
async def list_events(
    status_filter: str | None = Query(default=None, alias="status"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
):
    sb = get_supabase_admin()

    if status_filter:
        rows = (
            sb.table("events").select("*")
            .eq("visibility", "public")
            .eq("status", status_filter)
            .order("date", desc=False)
            .execute()
            .data
        )
        if date_from:
            rows = [r for r in rows if r["date"] >= date_from]
        if date_to:
            rows = [r for r in rows if r["date"] <= date_to]
        offset = (page - 1) * limit
        return rows[offset: offset + limit]

    # No status filter: fetch ALL upcoming/active (never truncated) +
    # only the most recent `limit` completed events (past events are secondary).
    upcoming = (
        sb.table("events").select("*")
        .eq("visibility", "public")
        .in_("status", ["upcoming", "active"])
        .order("date", desc=False)
        .execute()
        .data
    )
    completed = (
        sb.table("events").select("*")
        .eq("visibility", "public")
        .eq("status", "completed")
        .order("date", desc=True)
        .range(0, limit - 1)
        .execute()
        .data
    )

    rows = upcoming + completed
    if date_from:
        rows = [r for r in rows if r["date"] >= date_from]
    if date_to:
        rows = [r for r in rows if r["date"] <= date_to]
    return rows


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

    event = result.data[0]

    # Auto-register the event leader as a volunteer
    get_supabase_admin().table("event_signups").insert({
        "event_id": event["id"],
        "user_id": user_id,
        "status": "registered",
        "signed_up_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    # Keep denormalized count in sync
    get_supabase_admin().table("events").update({"current_signup_count": 1}).eq("id", event["id"]).execute()

    return event


# Get all events created by the current user, optionally filtered by status
@router.get("/my/created", response_model=list[EventResponse])
async def get_my_created_events(
    current_user: CurrentUser,
    status_filter: str | None = Query(default=None, alias="status"),
):
    query = get_supabase_admin().table("events").select("*").eq("event_leader_id", current_user["sub"])

    if status_filter:
        query = query.eq("status", status_filter)

    result = query.execute()
    return result.data


# Get all events the current user has signed up for, optionally filtered by status
@router.get("/my/joined", response_model=list[EventResponse])
async def get_my_joined_events(
    current_user: CurrentUser,
    status_filter: str | None = Query(default=None, alias="status"),
):
    signups = get_supabase_admin().table("event_signups").select("event_id").eq("user_id", current_user["sub"]).neq("status", "cancelled").execute()

    if not signups.data:
        return []

    event_ids = [s["event_id"] for s in signups.data]
    query = get_supabase_admin().table("events").select("*").in_("id", event_ids)

    if status_filter:
        query = query.eq("status", status_filter)

    result = query.execute()
    return result.data


@router.get("/share/{token}", response_model=EventResponse)
async def get_event_by_share_token(token: str):
    """Resolve a share token to an event — no auth required, works for private events."""
    shareable_link = f"/events/{token}"
    result = get_supabase_admin().table("events").select("*").eq("shareable_link", shareable_link).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return result.data


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

    # Award leader points when event is marked completed (only once, on transition)
    if update_data.get("status") == "completed" and event.get("status") != "completed":
        try:
            db = get_supabase_admin()

            # Base points for leading (1.5x volunteer rate)
            base_pts = calculate_leader_points(event["start_time"], event["end_time"])

            # Bonus points per attended volunteer
            attended_res = db.table("event_signups") \
                .select("id") \
                .eq("event_id", event_id) \
                .eq("status", "attended") \
                .execute()
            attendee_count = len(attended_res.data) if attended_res.data else 0
            bonus_pts = attendee_count * LEADER_BONUS_PER_ATTENDEE

            total_pts = base_pts + bonus_pts
            hours = round(base_pts / 15)
            description = f"Led event ({hours}hr, {attendee_count} attendees)"

            award_points(
                db,
                user_id=event["event_leader_id"],
                action="event_created",
                points=total_pts,
                event_id=event_id,
                description=description,
            )
        except Exception:
            pass  # Don't fail the update if points award errors

    return updated.data[0]


# Get nearby food resources/pantries for an event using the Lemontree Data API
@router.get("/{event_id}/nearby-resources")
async def get_nearby_resources(event_id: str, count: int = Query(default=4, ge=1, le=10)):
    # Fetch the event to get its lat/lng
    result = get_supabase_admin().table("events").select("id, latitude, longitude").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    event = result.data[0]
    if event["latitude"] is None or event["longitude"] is None:
        raise HTTPException(status_code=422, detail="Event does not have a location set")

    # Proxy request to Lemontree Data API
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://platform.foodhelpline.org/api/resources",
            params={"lat": event["latitude"], "lng": event["longitude"], "take": count},
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch nearby pantries from Lemontree API")

    return response.json()


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
