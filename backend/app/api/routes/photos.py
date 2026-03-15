"""Event photo routes — upload and list photos for an event."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/events", tags=["photos"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── Schemas ────────────────────────────────────────────────────────────────────

class PhotoResponse(BaseModel):
    id: str
    event_id: str
    uploaded_by: str
    photo_url: str
    caption: str | None
    uploaded_at: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/{event_id}/photos", status_code=status.HTTP_201_CREATED, response_model=PhotoResponse)
async def upload_photo(
    event_id: str,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
):
    """Upload a photo for an event — accessible by the leader or any signed-up volunteer."""
    db = get_supabase_admin()

    # Verify event exists
    event = db.table("events").select("id, event_leader_id").eq("id", event_id).maybe_single().execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check user is leader or signed-up volunteer
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
            raise HTTPException(status_code=403, detail="Only the event leader or a signed-up volunteer can upload photos")

    # Validate file type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail=f"File type not allowed. Use: {', '.join(ALLOWED_CONTENT_TYPES)}")

    # Read file and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File too large. Maximum size is 10 MB")

    # Upload to Supabase Storage bucket: event-photos/{event_id}/{uuid}.{ext}
    ext = (file.filename or "photo").rsplit(".", 1)[-1].lower()
    storage_path = f"{event_id}/{uuid.uuid4()}.{ext}"

    storage = get_supabase_admin().storage.from_("event-photos")
    try:
        storage.upload(storage_path, contents, {"content-type": file.content_type})
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to upload photo to storage") from exc

    # Build public URL
    photo_url = get_supabase_admin().storage.from_("event-photos").get_public_url(storage_path)

    # Save record in DB
    result = db.table("event_photos").insert({
        "event_id": event_id,
        "uploaded_by": current_user["sub"],
        "photo_url": photo_url,
        "caption": caption,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save photo record")

    return result.data[0]


@router.get("/{event_id}/photos", response_model=list[PhotoResponse])
async def list_photos(event_id: str):
    """Get all photos for an event — public."""
    db = get_supabase_admin()

    event = db.table("events").select("id").eq("id", event_id).maybe_single().execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")

    result = db.table("event_photos").select("*").eq("event_id", event_id).order("uploaded_at").execute()
    return result.data
