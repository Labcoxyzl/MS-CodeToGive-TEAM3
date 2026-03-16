"""Admin routes — analytics, user/event management, and signup management."""
import csv
import io
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.points import award_points, calculate_event_points
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UpdateRoleRequest(BaseModel):
    role: Literal["volunteer", "leader", "promoter", "admin"]


class UpdateSignupStatusRequest(BaseModel):
    status: Literal["registered", "attended", "cancelled"]


# ── Auth helper ───────────────────────────────────────────────────────────────

def require_admin(current_user: CurrentUser) -> dict:
    """Check that the current user has the admin role."""
    admin = get_supabase_admin()
    result = admin.table("users").select("role").eq("id", current_user["sub"]).maybe_single().execute()
    if not result.data or result.data["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


# ── Signup enrichment helper ──────────────────────────────────────────────────

def _enrich_signups(db, signups: list[dict]) -> list[dict]:
    """Batch-enrich signup rows with user/guest names and event details."""
    if not signups:
        return []

    user_ids = list({s["user_id"] for s in signups if s.get("user_id")})
    guest_ids = list({s["guest_signup_id"] for s in signups if s.get("guest_signup_id")})
    event_ids = list({s["event_id"] for s in signups if s.get("event_id")})

    users_map: dict[str, dict] = {}
    if user_ids:
        users_res = db.table("users").select("id, name, email, phone, role, category").in_("id", user_ids).execute()
        users_map = {u["id"]: u for u in (users_res.data or [])}

    guests_map: dict[str, dict] = {}
    if guest_ids:
        guests_res = db.table("guest_signups").select("id, name, email, phone").in_("id", guest_ids).execute()
        guests_map = {g["id"]: g for g in (guests_res.data or [])}

    events_map: dict[str, dict] = {}
    if event_ids:
        events_res = db.table("events").select("id, title, date, location_name, latitude, longitude, start_time, end_time").in_("id", event_ids).execute()
        events_map = {e["id"]: e for e in (events_res.data or [])}

    enriched = []
    for s in signups:
        name = email = phone = None
        user_role = user_category = None
        is_guest = False

        if s.get("user_id") and s["user_id"] in users_map:
            u = users_map[s["user_id"]]
            name, email, phone = u.get("name"), u.get("email"), u.get("phone")
            user_role, user_category = u.get("role"), u.get("category")
        elif s.get("guest_signup_id") and s["guest_signup_id"] in guests_map:
            g = guests_map[s["guest_signup_id"]]
            name, email, phone = g.get("name"), g.get("email"), g.get("phone")
            is_guest = True

        ev = events_map.get(s.get("event_id"), {})

        enriched.append({
            **s,
            "name": name,
            "email": email,
            "phone": phone,
            "is_guest": is_guest,
            "user_role": user_role,
            "user_category": user_category,
            "event_title": ev.get("title"),
            "event_date": ev.get("date"),
            "event_location": ev.get("location_name"),
            "event_latitude": ev.get("latitude"),
            "event_longitude": ev.get("longitude"),
            "event_start_time": ev.get("start_time"),
            "event_end_time": ev.get("end_time"),
        })

    return enriched


def _build_signup_query(db, *, event_id: str = "", signup_status: str = "", date_from: str = "", date_to: str = "", count_only: bool = False):
    """Build a base event_signups query with common filters applied."""
    if count_only:
        query = db.table("event_signups").select("id", count="exact").limit(1)
    else:
        query = db.table("event_signups").select("*")
    if event_id:
        query = query.eq("event_id", event_id)
    if signup_status:
        query = query.eq("status", signup_status)
    if date_from:
        query = query.gte("signed_up_at", date_from)
    if date_to:
        query = query.lte("signed_up_at", date_to)
    return query


def _apply_search_filter(enriched: list[dict], search: str) -> list[dict]:
    """Filter enriched signup rows by a search term matching name, email, or phone."""
    if not search:
        return enriched
    term = search.lower()
    return [
        row for row in enriched
        if term in (row.get("name") or "").lower()
        or term in (row.get("email") or "").lower()
        or term in (row.get("phone") or "").lower()
    ]


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(current_user: CurrentUser):
    require_admin(current_user)
    admin = get_supabase_admin()

    users_res = admin.table("users").select("id", count="exact").limit(1).execute()
    events_res = admin.table("events").select("id", count="exact").limit(1).execute()
    signups_res = admin.table("event_signups").select("id", count="exact").limit(1).execute()
    attended_res = admin.table("event_signups").select("id", count="exact").eq("status", "attended").limit(1).execute()

    roles_data = admin.table("users").select("role").execute()
    roles_breakdown: dict[str, int] = {}
    for row in roles_data.data or []:
        r = row.get("role", "unknown")
        roles_breakdown[r] = roles_breakdown.get(r, 0) + 1

    return {
        "total_users": users_res.count,
        "total_events": events_res.count,
        "total_signups": signups_res.count or 0,
        "total_attended": attended_res.count or 0,
        "roles_breakdown": roles_breakdown,
    }


# ── Analytics: trend ──────────────────────────────────────────────────────────

@router.get("/analytics/trend")
async def analytics_trend(current_user: CurrentUser, weeks: int = 12):
    require_admin(current_user)
    admin = get_supabase_admin()

    cutoff = (date.today() - timedelta(weeks=weeks)).isoformat()

    events_res = admin.table("events").select("date").gte("date", cutoff).execute()
    signups_res = admin.table("event_signups").select("signed_up_at").gte("signed_up_at", cutoff).execute()

    # Build ISO week → label mapping for the past N weeks
    today = date.today()
    week_starts: list[date] = [today - timedelta(weeks=i) for i in range(weeks - 1, -1, -1)]
    week_starts = [d - timedelta(days=d.weekday()) for d in week_starts]  # normalise to Monday

    buckets: dict[str, dict] = {}
    for ws in week_starts:
        key = ws.isoformat()
        label = ws.strftime("%b %-d")
        buckets[key] = {"week": label, "events": 0, "signups": 0}

    def iso_week_start(date_str: str) -> str | None:
        try:
            d = date.fromisoformat(date_str[:10])
            return (d - timedelta(days=d.weekday())).isoformat()
        except Exception:
            return None

    for row in events_res.data or []:
        ws = iso_week_start(row.get("date") or "")
        if ws and ws in buckets:
            buckets[ws]["events"] += 1

    for row in signups_res.data or []:
        ws = iso_week_start(row.get("signed_up_at") or "")
        if ws and ws in buckets:
            buckets[ws]["signups"] += 1

    return list(buckets.values())


# ── Analytics: status breakdown ────────────────────────────────────────────────

@router.get("/analytics/status-breakdown")
async def analytics_status_breakdown(current_user: CurrentUser):
    require_admin(current_user)
    admin = get_supabase_admin()

    events_res = admin.table("events").select("status").execute()
    counts: dict[str, int] = defaultdict(int)
    for row in events_res.data or []:
        counts[row.get("status", "unknown")] += 1

    order = ["upcoming", "active", "completed", "cancelled"]
    return [{"status": s, "count": counts[s]} for s in order if counts[s] > 0]


# ── Analytics: participation rate ─────────────────────────────────────────────

@router.get("/analytics/participation")
async def analytics_participation(current_user: CurrentUser, limit: int = 15):
    require_admin(current_user)
    admin = get_supabase_admin()

    events_res = (
        admin.table("events")
        .select("id, title, date, current_signup_count")
        .eq("status", "completed")
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )
    event_ids = [e["id"] for e in (events_res.data or [])]
    if not event_ids:
        return []

    attended_res = (
        admin.table("event_signups")
        .select("event_id")
        .eq("status", "attended")
        .in_("event_id", event_ids)
        .execute()
    )
    attended_counts: dict[str, int] = defaultdict(int)
    for row in attended_res.data or []:
        attended_counts[row["event_id"]] += 1

    result = []
    for ev in events_res.data or []:
        signups = ev.get("current_signup_count") or 0
        attended = attended_counts.get(ev["id"], 0)
        result.append({
            "title": ev["title"],
            "date": ev["date"],
            "signups": signups,
            "attended": attended,
            "rate": round(attended / signups * 100) if signups > 0 else 0,
        })
    return result


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
async def get_all_users(current_user: CurrentUser, skip: int = 0, limit: int = 20, search: str = ""):
    require_admin(current_user)
    admin = get_supabase_admin()

    query = admin.table("users").select("*")
    count_query = admin.table("users").select("id", count="exact").limit(1)

    if search:
        filt = f"name.ilike.%{search}%,email.ilike.%{search}%"
        query = query.or_(filt)
        count_query = count_query.or_(filt)

    response = query.range(skip, skip + limit - 1).execute()
    count_res = count_query.execute()

    return {
        "total": count_res.count,
        "users": response.data
    }


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, body: UpdateRoleRequest, current_user: CurrentUser):
    require_admin(current_user)
    admin = get_supabase_admin()

    response = admin.table("users").update({"role": body.role}).eq("id", user_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User role updated successfully", "user": response.data[0]}


# ── Events ────────────────────────────────────────────────────────────────────

@router.get("/events")
async def get_all_events(current_user: CurrentUser, skip: int = 0, limit: int = 20, status: str = ""):
    require_admin(current_user)
    admin = get_supabase_admin()

    query = admin.table("events").select("*")
    count_query = admin.table("events").select("id", count="exact").limit(1)

    if status:
        query = query.eq("status", status)
        count_query = count_query.eq("status", status)

    response = query.range(skip, skip + limit - 1).execute()
    count_res = count_query.execute()

    return {
        "total": count_res.count,
        "events": response.data
    }


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: CurrentUser):
    require_admin(current_user)
    admin = get_supabase_admin()

    # Verify event exists before deleting
    check = admin.table("events").select("id").eq("id", event_id).maybe_single().execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Event not found")

    # Delete child rows first to avoid FK constraint violations
    admin.table("event_signups").delete().eq("event_id", event_id).execute()
    admin.table("event_messages").delete().eq("event_id", event_id).execute()
    admin.table("event_photos").delete().eq("event_id", event_id).execute()
    admin.table("events").delete().eq("id", event_id).execute()

    return {"success": True, "message": "Event deleted successfully"}


# ── Signups (admin-level cross-event management) ─────────────────────────────

@router.get("/signups/export")
async def export_signups_csv(
    current_user: CurrentUser,
    search: str = "",
    event_id: str = "",
    signup_status: str = Query("", alias="status"),
    date_from: str = "",
    date_to: str = "",
):
    """Export filtered signups as a CSV download."""
    require_admin(current_user)
    db = get_supabase_admin()

    query = _build_signup_query(db, event_id=event_id, signup_status=signup_status, date_from=date_from, date_to=date_to)
    signups = query.order("signed_up_at", desc=True).execute()

    enriched = _enrich_signups(db, signups.data or [])
    enriched = _apply_search_filter(enriched, search)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "Name", "Email", "Phone", "Type", "Event Title", "Event Date",
        "Event Location", "Signup Status", "Signed Up At", "Checked In At",
        "Referral Code",
    ])
    for row in enriched:
        writer.writerow([
            row.get("name") or "",
            row.get("email") or "",
            row.get("phone") or "",
            "Guest" if row.get("is_guest") else "User",
            row.get("event_title") or "",
            row.get("event_date") or "",
            row.get("event_location") or "",
            row.get("status") or "",
            row.get("signed_up_at") or "",
            row.get("checked_in_at") or "",
            row.get("referred_by_code") or "",
        ])

    buf.seek(0)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="signups_export_{today}.csv"'},
    )


@router.get("/signups/{signup_id}")
async def get_signup_detail(signup_id: str, current_user: CurrentUser):
    """Get a single enriched signup record."""
    require_admin(current_user)
    db = get_supabase_admin()

    result = db.table("event_signups").select("*").eq("id", signup_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Signup not found")

    enriched = _enrich_signups(db, result.data)
    return enriched[0]


@router.get("/signups")
async def get_all_signups(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 20,
    search: str = "",
    event_id: str = "",
    signup_status: str = Query("", alias="status"),
    date_from: str = "",
    date_to: str = "",
):
    """List all event signups with search, filters, and pagination."""
    require_admin(current_user)
    db = get_supabase_admin()

    query = _build_signup_query(db, event_id=event_id, signup_status=signup_status, date_from=date_from, date_to=date_to)

    if search:
        user_ids_res = db.table("users").select("id").or_(
            f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%"
        ).execute()
        guest_ids_res = db.table("guest_signups").select("id").or_(
            f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%"
        ).execute()

        matching_user_ids = [u["id"] for u in (user_ids_res.data or [])]
        matching_guest_ids = [g["id"] for g in (guest_ids_res.data or [])]

        if not matching_user_ids and not matching_guest_ids:
            return {"total": 0, "signups": []}

        or_parts = []
        if matching_user_ids:
            or_parts.append(f"user_id.in.({','.join(matching_user_ids)})")
        if matching_guest_ids:
            or_parts.append(f"guest_signup_id.in.({','.join(matching_guest_ids)})")
        query = query.or_(",".join(or_parts))

    count_query = _build_signup_query(db, event_id=event_id, signup_status=signup_status, date_from=date_from, date_to=date_to, count_only=True)

    if search:
        or_parts_count = []
        if matching_user_ids:
            or_parts_count.append(f"user_id.in.({','.join(matching_user_ids)})")
        if matching_guest_ids:
            or_parts_count.append(f"guest_signup_id.in.({','.join(matching_guest_ids)})")
        if or_parts_count:
            count_query = count_query.or_(",".join(or_parts_count))

    signups_res = query.order("signed_up_at", desc=True).range(skip, skip + limit - 1).execute()
    count_res = count_query.execute()

    enriched = _enrich_signups(db, signups_res.data or [])

    return {
        "total": count_res.count or 0,
        "signups": enriched,
    }


@router.patch("/signups/{signup_id}/status")
async def update_signup_status(signup_id: str, body: UpdateSignupStatusRequest, current_user: CurrentUser):
    """Admin updates the attendance status of a signup."""
    require_admin(current_user)
    db = get_supabase_admin()

    signup_res = db.table("event_signups").select("*").eq("id", signup_id).execute()
    if not signup_res.data:
        raise HTTPException(status_code=404, detail="Signup not found")

    signup = signup_res.data[0]
    old_status = signup["status"]

    if old_status == body.status:
        raise HTTPException(status_code=422, detail=f"Signup is already '{body.status}'")

    update_data: dict = {"status": body.status}
    now = datetime.now(timezone.utc).isoformat()

    if body.status == "attended":
        update_data["checked_in_at"] = now
    elif old_status == "attended" and body.status != "attended":
        update_data["checked_in_at"] = None

    updated = db.table("event_signups").update(update_data).eq("id", signup_id).execute()
    if not updated.data:
        raise HTTPException(status_code=500, detail="Failed to update signup status")

    if body.status == "attended" and old_status != "attended" and signup.get("user_id"):
        event_res = db.table("events").select("start_time, end_time").eq("id", signup["event_id"]).execute()
        if event_res.data:
            ev = event_res.data[0]
            points = calculate_event_points(ev["start_time"], ev["end_time"])
            award_points(
                db,
                user_id=signup["user_id"],
                action="events_attended",
                points=points,
                event_id=signup["event_id"],
                description=f"Attended event ({points // 10}hr)",
            )

    return {"success": True, "signup": updated.data[0]}