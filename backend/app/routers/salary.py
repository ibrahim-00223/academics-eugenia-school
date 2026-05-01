from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_editor
from app.models.user import User
from app.models.salary import SkillCluster, SalarySimulation, SalaryDataPoint

router = APIRouter()


# ── Clusters ──────────────────────────────────────────────────────────────────

@router.get("/clusters")
async def list_clusters(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(SkillCluster).order_by(SkillCluster.name))
    clusters = result.scalars().all()
    return [_cluster_out(c) for c in clusters]


@router.post("/clusters", status_code=status.HTTP_201_CREATED)
async def create_cluster(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    cluster = SkillCluster(
        name=payload["name"],
        description=payload.get("description"),
        skill_ids=payload.get("skill_ids", []),
    )
    db.add(cluster)
    await db.commit()
    await db.refresh(cluster)
    return _cluster_out(cluster)


@router.patch("/clusters/{cluster_id}")
async def update_cluster(
    cluster_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    result = await db.execute(select(SkillCluster).where(SkillCluster.id == cluster_id))
    cluster = result.scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster introuvable")
    for field in ("name", "description", "skill_ids", "is_active"):
        if field in payload:
            setattr(cluster, field, payload[field])
    await db.commit()
    await db.refresh(cluster)
    return _cluster_out(cluster)


# ── Simulations ───────────────────────────────────────────────────────────────

@router.get("/simulations")
async def list_simulations(
    cluster_id: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(SalarySimulation).order_by(
        SalarySimulation.period_year.desc(), SalarySimulation.period_month.desc()
    )
    if cluster_id:
        q = q.where(SalarySimulation.cluster_id == cluster_id)
    if year:
        q = q.where(SalarySimulation.period_year == year)
    if month:
        q = q.where(SalarySimulation.period_month == month)
    result = await db.execute(q)
    sims = result.scalars().all()
    return [_sim_out(s) for s in sims]


@router.post("/simulate", status_code=status.HTTP_202_ACCEPTED)
async def trigger_simulation(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    """Trigger P25/P50/P75 computation for a given cluster + period."""
    cluster_id = payload.get("cluster_id")
    year = payload.get("year")
    month = payload.get("month")
    contract_type = payload.get("contract_type")
    experience_band = payload.get("experience_band")

    if not all([cluster_id, year, month]):
        raise HTTPException(status_code=400, detail="cluster_id, year et month sont requis")

    result = await db.execute(select(SkillCluster).where(SkillCluster.id == cluster_id))
    cluster = result.scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster introuvable")

    sim = SalarySimulation(
        cluster_id=cluster_id,
        period_year=year,
        period_month=month,
        contract_type=contract_type,
        experience_band=experience_band,
    )
    db.add(sim)
    await db.commit()
    await db.refresh(sim)
    # TODO: background_tasks.add_task(compute_salary_simulation, sim.id)
    return {"simulation_id": sim.id, "status": "pending"}


# ── Data points ───────────────────────────────────────────────────────────────

@router.get("/data-points")
async def list_data_points(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(SalaryDataPoint).order_by(SalaryDataPoint.created_at.desc()).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cluster_out(c: SkillCluster) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "skill_ids": c.skill_ids,
        "is_active": c.is_active,
    }


def _sim_out(s: SalarySimulation) -> dict:
    return {
        "id": s.id,
        "cluster_id": s.cluster_id,
        "period_year": s.period_year,
        "period_month": s.period_month,
        "contract_type": s.contract_type,
        "experience_band": s.experience_band,
        "p25_salary": s.p25_salary,
        "p50_salary": s.p50_salary,
        "p75_salary": s.p75_salary,
        "sample_size": s.sample_size,
        "confidence_score": s.confidence_score,
        "ai_narrative": s.ai_narrative,
        "computed_at": s.computed_at,
    }
