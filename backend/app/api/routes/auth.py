"""Auth routes — thin wrappers around Supabase auth so the frontend can call a
single API rather than talking to Supabase directly."""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from enum import Enum
from typing import Optional
from gotrue.errors import AuthApiError
from app.core.auth import CurrentUser
from app.core.supabase import get_supabase_admin, get_supabase_client

router = APIRouter(prefix="/auth", tags=["auth"])


class Category(str, Enum):
    CORPORATE = "corporate"
    LEADERSHIP_GROUP = "leadership_group"
    STUDENT = "student"
    COMMUNITY = "community"
    OTHER = "other"

class Role(str, Enum):
    LEADER = "leader"
    VOLUNTEER = "volunteer"
    PROMOTER = "promoter"
    ADMIN = "admin"

class SupportedLanguages(str, Enum):
    ENGLISH = "English"
    SPANISH = "Spanish"
    FRENCH = "French"
    MANDARIN = "Mandarin"
    CANTONESE = "Cantonese"
    ARABIC = "Arabic"
    HINDI = "Hindi"
    PORTUGUESE = "Portuguese"
    KOREAN = "Korean"
    VIETNAMESE = "Vietnamese"
    TAGALOG = "Tagalog"
    RUSSIAN = "Russian"
    HAITIAN_CREOLE = "Haitian Creole"
    OTHER = "Other"

class SignUpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role
    phone: Optional[str] = None
    category: Optional[Category] = None
    languages: Optional[list[SupportedLanguages]] = None
    referral_source: Optional[str] = None
    referral_code: Optional[str] = None  # code of the user who referred this person


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def sign_up(body: SignUpRequest):
    client = get_supabase_client()
    try:
        response = client.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {"data": {"name": body.name}},
        })
    except AuthApiError as e:
        if "already registered" in str(e).lower() or "email" in str(e).lower():
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        raise HTTPException(status_code=400, detail="Sign-up failed")

    if response.user is None:
        raise HTTPException(status_code=400, detail="Sign-up failed")
    if not response.user.identities:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    admin = get_supabase_admin()

    # Resolve referral code to a user ID if provided
    referred_by_user_id = None
    if body.referral_code:
        ref_result = (
            admin.table("users")
            .select("id")
            .eq("referral_code", body.referral_code)
            .maybe_single()
            .execute()
        )
        if ref_result.data:
            referred_by_user_id = ref_result.data["id"]

    user_row: dict = {
        "id": response.user.id,
        "email": body.email,
        "name": body.name,
        "role": body.role.value,
        "total_points": 0,
    }
    if body.phone is not None:
        user_row["phone"] = body.phone
    if body.category is not None:
        user_row["category"] = body.category.value
    if body.languages is not None:
        user_row["languages"] = [lang.value for lang in body.languages]
    if body.referral_source is not None:
        user_row["referral_source"] = body.referral_source
    if referred_by_user_id is not None:
        user_row["referred_by_user_id"] = referred_by_user_id

    admin.table("users").upsert(user_row).execute()

    return {"message": "Check your email to confirm your account", "user_id": response.user.id}


@router.post("/login")
async def log_in(body: LoginRequest):
    client = get_supabase_client()
    response = client.auth.sign_in_with_password({"email": body.email, "password": body.password})
    if response.user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": response.session.access_token,
        "refresh_token": response.session.refresh_token,
        "token_type": "bearer",
    }


@router.post("/logout")
async def log_out(current_user: CurrentUser):
    get_supabase_admin().auth.admin.sign_out(current_user["sub"], scope="global")
    return {"message": "Signed out"}
