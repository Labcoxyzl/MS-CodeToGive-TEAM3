from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.core.auth import CurrentUser
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/admin", tags=["admin"])


from typing import Literal

class UpdateRoleRequest(BaseModel):
    role: Literal["volunteer", "leader", "promoter", "admin"]


def require_admin(current_user: CurrentUser) -> dict:
    """Check that the current user has the admin role."""
    admin = get_supabase_admin()
    result = admin.table("users").select("role").eq("id", current_user["sub"]).maybe_single().execute()
    if not result.data or result.data["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.get("/analytics")
async def get_analytics(current_user: CurrentUser):
    require_admin(current_user)
    admin = get_supabase_admin()

    users_res = admin.table("users").select("id", count="exact").limit(1).execute()
    events_res = admin.table("events").select("id", count="exact").limit(1).execute()
    signups_res = admin.table("event_signups").select("id", count="exact").limit(1).execute()

    roles_data = admin.table("users").select("role").execute()
    roles_breakdown: dict[str, int] = {}
    for row in roles_data.data or []:
        r = row.get("role", "unknown")
        roles_breakdown[r] = roles_breakdown.get(r, 0) + 1

    return {
        "total_users": users_res.count,
        "total_events": events_res.count,
        "total_signups": signups_res.count or 0,
        "roles_breakdown": roles_breakdown,
    }


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

    response = admin.table("events").delete().eq("id", event_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Event not found")

    return {"success": True, "message": "Event deleted successfully"}