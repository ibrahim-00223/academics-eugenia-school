from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user, require_editor
from app.models.user import User
from app.models.reports import MonthlyReport

router = APIRouter()


@router.get("")
async def list_reports(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(MonthlyReport).order_by(
            MonthlyReport.period_year.desc(), MonthlyReport.period_month.desc()
        )
    )
    return result.scalars().all()


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(MonthlyReport).where(MonthlyReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport introuvable")
    return report


@router.post("/generate", status_code=status.HTTP_202_ACCEPTED)
async def trigger_report_generation(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_editor),
):
    """Trigger monthly report generation for a given period."""
    year = payload.get("year")
    month = payload.get("month")
    if not year or not month:
        raise HTTPException(status_code=400, detail="year et month sont requis")

    # Check if report already exists for this period
    result = await db.execute(
        select(MonthlyReport).where(
            MonthlyReport.period_year == year,
            MonthlyReport.period_month == month,
        )
    )
    existing = result.scalar_one_or_none()
    if existing and existing.status == "ready":
        return {"report_id": existing.id, "status": existing.status, "already_exists": True}

    report = MonthlyReport(
        period_year=year,
        period_month=month,
        report_type=payload.get("report_type", "monthly"),
        status="generating",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    # TODO: background_tasks.add_task(generate_monthly_report, report.id)
    return {"report_id": report.id, "status": report.status}


@router.get("/{report_id}/pdf")
async def get_report_pdf_url(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return a signed/direct URL to download the PDF."""
    result = await db.execute(select(MonthlyReport).where(MonthlyReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport introuvable")
    if not report.pdf_storage_path:
        raise HTTPException(status_code=404, detail="PDF non encore généré")
    # TODO: generate signed URL from storage provider
    return {"pdf_url": report.pdf_storage_path}
