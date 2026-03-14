"""Event signup routes — register, guest signup, cancel, list, and check-in."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.auth import CurrentUser
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/events", tags=["signups"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class GuestSignupRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    referral_code: str | None = None


class AuthSignupRequest(BaseModel):
    referral_code: str | None = None


class SignupResponse(BaseModel):
    id: str
    event_id: str
    user_id: str | None
    guest_signup_id: str | None
    status: str
    referred_by_code: str | None
    signed_up_at: str
    checked_in_at: str | None


class SignupWithDetailsResponse(SignupResponse):
    name: str | None
    email: str | None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/{event_id}/signup", status_code=status.HTTP_201_CREATED, response_model=SignupResponse)
async def signup_for_event(event_id: str, body: AuthSignupRequest, current_user: CurrentUser):
    """Authenticated user signs up for an event."""
    db = get_supabase_admin()
    user_id = current_user["sub"]

    # Verify event exists and is open
    event_result = db.table("events").select("id, status, volunteer_limit, current_signup_count").eq("id", event_id).execute()
    if not event_result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    event = event_result.data[0]
    if event["status"] in ("cancelled", "completed"):
        raise HTTPException(status_code=422, detail="Event is no longer accepting signups")

    # Check volunteer limit
    if event["volunteer_limit"] is not None and event["current_signup_count"] >= event["volunteer_limit"]:
        raise HTTPException(status_code=422, detail="Event has reached its volunteer limit")

    # Prevent duplicate signups
    existing = db.table("event_signups").select("id, status").eq("event_id", event_id).eq("user_id", user_id).execute()
    if existing.data and existing.data[0]["status"] != "cancelled":
        raise HTTPException(status_code=409, detail="You are already signed up for this event")

    now = datetime.now(timezone.utc).isoformat()
    insert_data = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "user_id": user_id,
        "status": "registered",
        "referred_by_code": body.referral_code,
        "signed_up_at": now,
    }

    result = db.table("event_signups").insert(insert_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create signup")

    # Increment signup count
    db.table("events").update({"current_signup_count": event["current_signup_count"] + 1}).eq("id", event_id).execute()

    return result.data[0]


@router.post("/{event_id}/guest-signup", status_code=status.HTTP_201_CREATED, response_model=SignupResponse)
async def guest_signup_for_event(event_id: str, body: GuestSignupRequest):
    """Guest (unauthenticated) signs up for an event."""
    db = get_supabase_admin()

    # Verify event exists and is open
    event_result = db.table("events").select("id, status, volunteer_limit, current_signup_count").eq("id", event_id).execute()
    if not event_result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    event = event_result.data[0]
    if event["status"] in ("cancelled", "completed"):
        raise HTTPException(status_code=422, detail="Event is no longer accepting signups")

    # Check volunteer limit
    if event["volunteer_limit"] is not None and event["current_signup_count"] >= event["volunteer_limit"]:
        raise HTTPException(status_code=422, detail="Event has reached its volunteer limit")

    # Prevent duplicate guest signups for the same event by email
    existing_guest = db.table("guest_signups").select("id").eq("email", body.email).execute()
    if existing_guest.data:
        guest_id = existing_guest.data[0]["id"]
        existing_signup = db.table("event_signups").select("id, status").eq("event_id", event_id).eq("guest_signup_id", guest_id).execute()
        if existing_signup.data and existing_signup.data[0]["status"] != "cancelled":
            raise HTTPException(status_code=409, detail="This email is already signed up for this event")

    now = datetime.now(timezone.utc).isoformat()

    # Create guest record
    guest_data = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email,
        "phone": body.phone,
        "created_at": now,
    }
    guest_result = db.table("guest_signups").insert(guest_data).execute()
    if not guest_result.data:
        raise HTTPException(status_code=500, detail="Failed to create guest record")

    guest_id = guest_result.data[0]["id"]

    # Create signup record
    signup_data = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "guest_signup_id": guest_id,
        "status": "registered",
        "referred_by_code": body.referral_code,
        "signed_up_at": now,
    }
    result = db.table("event_signups").insert(signup_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create signup")

    # Increment signup count
    db.table("events").update({"current_signup_count": event["current_signup_count"] + 1}).eq("id", event_id).execute()

    return result.data[0]


@router.delete("/{event_id}/signup", status_code=status.HTTP_200_OK)
async def cancel_signup(event_id: str, current_user: CurrentUser):
    """Authenticated user cancels their signup for an event."""
    db = get_supabase_admin()
    user_id = current_user["sub"]

    existing = db.table("event_signups").select("id, status").eq("event_id", event_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Signup not found")

    signup = existing.data[0]
    if signup["status"] == "cancelled":
        raise HTTPException(status_code=409, detail="Signup is already cancelled")

    db.table("event_signups").update({"status": "cancelled"}).eq("id", signup["id"]).execute()

    # Decrement signup count (floor at 0)
    event_result = db.table("events").select("current_signup_count").eq("id", event_id).execute()
    if event_result.data:
        current_count = event_result.data[0]["current_signup_count"]
        db.table("events").update({"current_signup_count": max(0, current_count - 1)}).eq("id", event_id).execute()

    return {"success": True}


@router.get("/{event_id}/signups", response_model=list[SignupWithDetailsResponse])
async def list_event_signups(event_id: str, current_user: CurrentUser):
    """List all signups for an event — only accessible by the event leader."""
    db = get_supabase_admin()

    # Verify event exists and requester is the leader
    event_result = db.table("events").select("id, event_leader_id").eq("id", event_id).execute()
    if not event_result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    if event_result.data[0]["event_leader_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Only the event leader can view signups")

    signups = db.table("event_signups").select("*").eq("event_id", event_id).neq("status", "cancelled").execute()

    enriched = []
    for s in signups.data:
        name = None
        email = None

        if s.get("user_id"):
            user = db.table("users").select("name, email").eq("id", s["user_id"]).execute()
            if user.data:
                name = user.data[0]["name"]
                email = user.data[0]["email"]
        elif s.get("guest_signup_id"):
            guest = db.table("guest_signups").select("name, email").eq("id", s["guest_signup_id"]).execute()
            if guest.data:
                name = guest.data[0]["name"]
                email = guest.data[0]["email"]

        enriched.append({**s, "name": name, "email": email})

    return enriched


@router.patch("/{event_id}/signups/{signup_id}/check-in", response_model=SignupResponse)
async def check_in_volunteer(event_id: str, signup_id: str, current_user: CurrentUser):
    """Mark a volunteer as checked in — only accessible by the event leader."""
    db = get_supabase_admin()

    # Verify requester is the event leader
    event_result = db.table("events").select("id, event_leader_id").eq("id", event_id).execute()
    if not event_result.data:
        raise HTTPException(status_code=404, detail="Event not found")

    if event_result.data[0]["event_leader_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Only the event leader can check in volunteers")

    signup_result = db.table("event_signups").select("*").eq("id", signup_id).eq("event_id", event_id).execute()
    if not signup_result.data:
        raise HTTPException(status_code=404, detail="Signup not found")

    if signup_result.data[0]["status"] == "cancelled":
        raise HTTPException(status_code=422, detail="Cannot check in a cancelled signup")

    now = datetime.now(timezone.utc).isoformat()
    updated = db.table("event_signups").update({"status": "attended", "checked_in_at": now}).eq("id", signup_id).execute()
    if not updated.data:
        raise HTTPException(status_code=500, detail="Failed to check in volunteer")

    return updated.data[0]
