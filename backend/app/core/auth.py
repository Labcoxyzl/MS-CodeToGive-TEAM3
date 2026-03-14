"""Helpers for validating Supabase JWTs in FastAPI route dependencies."""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.supabase import get_supabase_admin

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> dict:
    """Validate a Supabase JWT by calling Supabase auth; return user payload."""
    token = credentials.credentials
    try:
        response = get_supabase_admin().auth.get_user(token)
        user = response.user
        if not user:
            raise ValueError("No user returned")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return {"sub": user.id, "email": user.email}


CurrentUser = Annotated[dict, Depends(get_current_user)]
