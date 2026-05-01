from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.core.deps import require_editor, require_admin, get_current_user
from app.models.user import User
from app.models.scraping import ScrapingSource, ScrapingJob, RawJobPost, RawPodcastEpisode

router = APIRouter()


# ── Sources ───────────────────────────────────────────────────────────────────

@router.get("/sources")
async def list_sources(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(ScrapingSource).order_by(ScrapingSource.name))
    sources = result.scalars().all()
    return [_source_out(s) for s in sources]


@router.post("/sources", status_code=status.HTTP_201_CREATED)
async def create_source(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    source = ScrapingSource(
        name=payload["name"],
        source_type=payload["source_type"],
        base_url=payload["base_url"],
        config=payload.get("config", {}),
        is_active=payload.get("is_active", True),
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return _source_out(source)


@router.patch("/sources/{source_id}")
async def update_source(
    source_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(ScrapingSource).where(ScrapingSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source introuvable")
    for field in ("name", "base_url", "config", "is_active"):
        if field in payload:
            setattr(source, field, payload[field])
    await db.commit()
    await db.refresh(source)
    return _source_out(source)


# ── Jobs ──────────────────────────────────────────────────────────────────────

@router.get("/jobs")
async def list_jobs(
    source_id: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(ScrapingJob).order_by(ScrapingJob.created_at.desc()).limit(limit)
    if source_id:
        q = q.where(ScrapingJob.source_id == source_id)
    result = await db.execute(q)
    jobs = result.scalars().all()
    return [_job_out(j) for j in jobs]


@router.post("/trigger", status_code=status.HTTP_202_ACCEPTED)
async def trigger_scraping(
    payload: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    """Manually trigger a scraping job for a given source."""
    source_id: str = payload.get("source_id", "")
    result = await db.execute(select(ScrapingSource).where(ScrapingSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source introuvable")

    job = ScrapingJob(
        source_id=source_id,
        triggered_by="manual",
        triggered_by_user=current_user.id,
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # TODO: background_tasks.add_task(run_scraping_job, job.id)

    return {"job_id": job.id, "status": job.status}


@router.get("/raw-posts")
async def list_raw_posts(
    source_id: Optional[str] = None,
    is_processed: Optional[bool] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(RawJobPost).order_by(RawJobPost.scraped_at.desc()).limit(limit)
    if source_id:
        q = q.where(RawJobPost.source_id == source_id)
    if is_processed is not None:
        q = q.where(RawJobPost.is_processed == is_processed)
    result = await db.execute(q)
    posts = result.scalars().all()
    return posts


# ── Serializers ───────────────────────────────────────────────────────────────

def _source_out(s: ScrapingSource) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "source_type": s.source_type,
        "base_url": s.base_url,
        "config": s.config,
        "is_active": s.is_active,
        "last_successful_scrape_at": s.last_successful_scrape_at,
        "created_at": s.created_at,
    }


def _job_out(j: ScrapingJob) -> dict:
    return {
        "id": j.id,
        "source_id": j.source_id,
        "status": j.status,
        "triggered_by": j.triggered_by,
        "started_at": j.started_at,
        "completed_at": j.completed_at,
        "items_scraped": j.items_scraped,
        "error_message": j.error_message,
        "created_at": j.created_at,
    }
