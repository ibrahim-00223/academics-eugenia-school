from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_editor, require_admin
from app.models.user import User
from app.models.skills import SkillTaxonomy, ExtractionBatch, SkillAggregate

router = APIRouter()


# ── Taxonomy ──────────────────────────────────────────────────────────────────

@router.get("/taxonomy")
async def list_skills(
    category: Optional[str] = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(SkillTaxonomy).where(SkillTaxonomy.is_active == is_active).order_by(SkillTaxonomy.name)
    if category:
        q = q.where(SkillTaxonomy.category == category)
    result = await db.execute(q)
    skills = result.scalars().all()
    return [_skill_out(s) for s in skills]


@router.post("/taxonomy", status_code=status.HTTP_201_CREATED)
async def create_skill(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    skill = SkillTaxonomy(
        name=payload["name"],
        category=payload["category"],
        parent_id=payload.get("parent_id"),
        aliases=payload.get("aliases", []),
    )
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return _skill_out(skill)


@router.patch("/taxonomy/{skill_id}")
async def update_skill(
    skill_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    result = await db.execute(select(SkillTaxonomy).where(SkillTaxonomy.id == skill_id))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Compétence introuvable")
    for field in ("name", "category", "parent_id", "aliases", "is_active"):
        if field in payload:
            setattr(skill, field, payload[field])
    await db.commit()
    await db.refresh(skill)
    return _skill_out(skill)


# ── Aggregates / Trends ───────────────────────────────────────────────────────

@router.get("/aggregates")
async def get_aggregates(
    year: int,
    month: int,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return top skills by mention count for a given period."""
    q = (
        select(SkillAggregate, SkillTaxonomy.name, SkillTaxonomy.category)
        .join(SkillTaxonomy, SkillAggregate.skill_id == SkillTaxonomy.id)
        .where(SkillAggregate.period_year == year, SkillAggregate.period_month == month)
        .order_by(SkillAggregate.mention_count.desc())
        .limit(limit)
    )
    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "skill_id": agg.id,
            "skill_name": name,
            "category": cat,
            "mention_count": agg.mention_count,
            "job_count": agg.job_count,
            "period_year": agg.period_year,
            "period_month": agg.period_month,
        }
        for agg, name, cat in rows
    ]


# ── Extraction Batches ────────────────────────────────────────────────────────

@router.get("/batches")
async def list_batches(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(ExtractionBatch).order_by(ExtractionBatch.created_at.desc()).limit(limit)
    result = await db.execute(q)
    batches = result.scalars().all()
    return [
        {
            "id": b.id,
            "status": b.status,
            "source_type": b.source_type,
            "total_items": b.total_items,
            "processed_items": b.processed_items,
            "tokens_used": b.tokens_used,
            "cost_usd": b.cost_usd,
            "started_at": b.started_at,
            "completed_at": b.completed_at,
        }
        for b in batches
    ]


@router.post("/extract", status_code=status.HTTP_202_ACCEPTED)
async def trigger_extraction(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    """Trigger a new AI extraction batch."""
    source_type = payload.get("source_type", "job_post")
    batch = ExtractionBatch(source_type=source_type, status="pending")
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    # TODO: enqueue background task run_extraction_batch(batch.id)
    return {"batch_id": batch.id, "status": batch.status}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _skill_out(s: SkillTaxonomy) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "category": s.category,
        "parent_id": s.parent_id,
        "aliases": s.aliases,
        "is_active": s.is_active,
    }
