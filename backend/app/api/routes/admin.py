from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/admin", tags=["admin"])

class UpdateRoleRequest(BaseModel):
    role: str

@router.get("/analytics")
async def get_analytics():
    admin = get_supabase_admin()
    
    users_res = admin.table("users").select("id", count="exact").limit(1).execute()
    events_res = admin.table("events").select("id", count="exact").limit(1).execute()
    
    return {
        "total_users": users_res.count,
        "total_events": events_res.count
    }

@router.get("/users")
async def get_all_users(skip: int = 0, limit: int = 20):
    admin = get_supabase_admin()
    
    response = admin.table("users").select("*").range(skip, skip + limit - 1).execute()
    count_res = admin.table("users").select("id", count="exact").limit(1).execute()
    
    return {
        "total": count_res.count,
        "users": response.data
    }

@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, body: UpdateRoleRequest):
    admin = get_supabase_admin()
    
    response = admin.table("users").update({"role": body.role}).eq("id", user_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": "User role updated successfully", "user": response.data[0]}

@router.get("/events")
async def get_all_events(skip: int = 0, limit: int = 20):
    admin = get_supabase_admin()
    
    response = admin.table("events").select("*").range(skip, skip + limit - 1).execute()
    count_res = admin.table("events").select("id", count="exact").limit(1).execute()
    
    return {
        "total": count_res.count,
        "events": response.data
    }