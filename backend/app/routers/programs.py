from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_editor
from app.models.user import User
from app.models.programs import Program, Semester, Module, ModuleSkillCoverage

router = APIRouter()


# ── Programs ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_programs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Program).order_by(Program.name))
    return result.scalars().all()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_program(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    program = Program(
        name=payload["name"],
        level=payload["level"],
        duration_years=payload["duration_years"],
        description=payload.get("description"),
    )
    db.add(program)
    await db.commit()
    await db.refresh(program)
    return program


@router.get("/{program_id}")
async def get_program(
    program_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Program).where(Program.id == program_id))
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Programme introuvable")
    return program


@router.patch("/{program_id}")
async def update_program(
    program_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    result = await db.execute(select(Program).where(Program.id == program_id))
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Programme introuvable")
    for field in ("name", "level", "duration_years", "description", "is_active"):
        if field in payload:
            setattr(program, field, payload[field])
    await db.commit()
    await db.refresh(program)
    return program


# ── Semesters ─────────────────────────────────────────────────────────────────

@router.get("/{program_id}/semesters")
async def list_semesters(
    program_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Semester).where(Semester.program_id == program_id).order_by(Semester.number)
    )
    return result.scalars().all()


@router.post("/{program_id}/semesters", status_code=status.HTTP_201_CREATED)
async def create_semester(
    program_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    sem = Semester(program_id=program_id, number=payload["number"])
    db.add(sem)
    await db.commit()
    await db.refresh(sem)
    return sem


# ── Modules ───────────────────────────────────────────────────────────────────

@router.get("/semesters/{semester_id}/modules")
async def list_modules(
    semester_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Module).where(Module.semester_id == semester_id).order_by(Module.name)
    )
    return result.scalars().all()


@router.post("/semesters/{semester_id}/modules", status_code=status.HTTP_201_CREATED)
async def create_module(
    semester_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    module = Module(
        semester_id=semester_id,
        name=payload["name"],
        code=payload.get("code"),
        credits_ects=payload.get("credits_ects"),
        hours_total=payload.get("hours_total"),
        description=payload.get("description"),
    )
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return module


@router.patch("/modules/{module_id}")
async def update_module(
    module_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module introuvable")
    for field in ("name", "code", "credits_ects", "hours_total", "description"):
        if field in payload:
            setattr(module, field, payload[field])
    await db.commit()
    await db.refresh(module)
    return module


# ── Skill Coverage ────────────────────────────────────────────────────────────

@router.get("/modules/{module_id}/skills")
async def list_module_skills(
    module_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ModuleSkillCoverage).where(ModuleSkillCoverage.module_id == module_id)
    )
    return result.scalars().all()


@router.post("/modules/{module_id}/skills", status_code=status.HTTP_201_CREATED)
async def add_module_skill(
    module_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    coverage = ModuleSkillCoverage(
        module_id=module_id,
        skill_id=payload["skill_id"],
        coverage_level=payload["coverage_level"],
    )
    db.add(coverage)
    await db.commit()
    await db.refresh(coverage)
    return coverage


@router.delete("/modules/{module_id}/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_module_skill(
    module_id: str,
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    result = await db.execute(
        select(ModuleSkillCoverage).where(
            ModuleSkillCoverage.module_id == module_id,
            ModuleSkillCoverage.skill_id == skill_id,
        )
    )
    coverage = result.scalar_one_or_none()
    if coverage:
        await db.delete(coverage)
        await db.commit()
