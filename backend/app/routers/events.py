from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_editor
from app.models.user import User
from app.models.events import Event

router = APIRouter()


@router.get("")
async def list_events(
    event_type: Optional[str] = None,
    event_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Event).order_by(Event.scheduled_date.asc().nullslast())
    if event_type:
        q = q.where(Event.event_type == event_type)
    if event_status:
        q = q.where(Event.status == event_status)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    event = Event(
        title=payload["title"],
        description=payload.get("description"),
        event_type=payload["event_type"],
        status=payload.get("status", "suggested"),
        scheduled_date=payload.get("scheduled_date"),
        target_skills=payload.get("target_skills", []),
        report_id=payload.get("report_id"),
        created_by=current_user.id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.patch("/{event_id}")
async def update_event(
    event_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable")
    for field in ("title", "description", "event_type", "status", "scheduled_date", "target_skills", "report_id"):
        if field in payload:
            setattr(event, field, payload[field])
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event:
        await db.delete(event)
        await db.commit()
