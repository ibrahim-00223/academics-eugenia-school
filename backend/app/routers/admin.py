from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "avatar_url": u.avatar_url,
            "role": u.role,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    new_role = payload.get("role")
    if new_role not in ("admin", "editor", "viewer"):
        raise HTTPException(status_code=400, detail="Rôle invalide. Valeurs: admin, editor, viewer")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre rôle")

    user.role = new_role
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role}
