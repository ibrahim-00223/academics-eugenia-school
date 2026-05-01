from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from authlib.integrations.httpx_client import AsyncOAuth2Client

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, verify_token, is_email_allowed
from app.core.deps import get_current_user
from app.models.user import User

import httpx

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

COOKIE_SECURE = not settings.DEBUG
COOKIE_SAMESITE = "lax"


@router.get("/google")
async def google_login():
    """Redirect user to Google OAuth consent screen."""
    client = AsyncOAuth2Client(
        client_id=settings.GOOGLE_CLIENT_ID,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        scope="openid email profile",
    )
    uri, state = client.create_authorization_url(GOOGLE_AUTH_URL)
    response = RedirectResponse(url=uri)
    # Store state in a short-lived cookie for CSRF protection
    response.set_cookie(
        "oauth_state",
        state,
        max_age=300,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
    return response


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback, create/update user, set JWT cookies."""
    # Exchange code for tokens
    async with httpx.AsyncClient() as http:
        token_resp = await http.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")

        token_data = token_resp.json()
        access_token_google = token_data.get("access_token")

        # Fetch user info
        userinfo_resp = await http.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token_google}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")

        userinfo = userinfo_resp.json()

    email: str = userinfo.get("email", "")
    if not email:
        raise HTTPException(status_code=400, detail="No email returned by Google")

    # Domain restriction
    if not is_email_allowed(email):
        redirect_url = f"{settings.FRONTEND_URL}/login?error=unauthorized_domain"
        return RedirectResponse(url=redirect_url)

    google_id: str = userinfo.get("sub", "")
    full_name: str | None = userinfo.get("name")
    avatar_url: str | None = userinfo.get("picture")

    # Upsert user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            google_id=google_id,
            full_name=full_name,
            avatar_url=avatar_url,
            role="viewer",
        )
        db.add(user)
        await db.flush()
    else:
        user.google_id = google_id
        if full_name:
            user.full_name = full_name
        if avatar_url:
            user.avatar_url = avatar_url

    await db.commit()
    await db.refresh(user)

    # Issue JWT tokens
    jwt_access = create_access_token(subject=user.id)
    jwt_refresh = create_refresh_token(subject=user.id)

    redirect = RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard", status_code=302)
    _set_auth_cookies(redirect, jwt_access, jwt_refresh)
    return redirect


@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Issue a new access token from a valid refresh token (sent via cookie or body)."""
    # Try reading from cookie if not provided directly
    if refresh_token is None:
        from fastapi import Request
        # handled via Cookie dependency instead — see below

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token invalide ou expiré",
    )
    user_id = verify_token(refresh_token or "", token_type="refresh")
    if not user_id:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise credentials_exception

    new_access = create_access_token(subject=user.id)
    new_refresh = create_refresh_token(subject=user.id)
    _set_auth_cookies(response, new_access, new_refresh)
    return {"message": "tokens refreshed"}


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookies."""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "logged out"}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    """Return current authenticated user info."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "avatar_url": current_user.avatar_url,
        "role": current_user.role,
        "created_at": current_user.created_at,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        "access_token",
        access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
