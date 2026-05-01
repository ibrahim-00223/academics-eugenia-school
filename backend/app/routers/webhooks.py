"""
Apify webhook — called when a LinkedIn scraping run completes or fails.
Configure Apify actor webhook URL to: https://your-backend.up.railway.app/api/webhooks/apify
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import httpx

from app.core.database import get_db
from app.core.config import settings
from app.models.scraping import ScrapingJob, RawJobPost, ScrapingSource

router = APIRouter()


@router.post("/apify")
async def apify_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Handle Apify run completion webhook."""
    # Verify webhook secret if configured
    if settings.APIFY_WEBHOOK_SECRET:
        expected = f"Bearer {settings.APIFY_WEBHOOK_SECRET}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Invalid webhook secret")

    payload = await request.json()
    job_id: str = payload.get("jobId", "")
    run_id: str = payload.get("runId", "")
    status: str = payload.get("status", "")
    dataset_id: str = payload.get("datasetId", "")

    if not job_id:
        raise HTTPException(status_code=400, detail="Missing jobId")

    # Fetch the scraping job
    result = await db.execute(select(ScrapingJob).where(ScrapingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if status == "FAILED":
        job.status = "failed"
        job.error_message = f"Apify run {run_id} failed"
        from datetime import datetime, timezone
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()
        return {"received": True}

    if status != "SUCCEEDED":
        return {"received": True}

    # Fetch items from Apify dataset
    if not settings.APIFY_API_TOKEN:
        raise HTTPException(status_code=500, detail="APIFY_API_TOKEN not configured")

    async with httpx.AsyncClient() as http:
        resp = await http.get(
            f"https://api.apify.com/v2/datasets/{dataset_id}/items",
            params={"token": settings.APIFY_API_TOKEN, "limit": 500},
        )
        if resp.status_code != 200:
            job.status = "failed"
            job.error_message = "Failed to fetch Apify dataset"
            await db.commit()
            raise HTTPException(status_code=500, detail="Dataset fetch failed")

        items = resp.json()

    # Insert raw job posts
    from datetime import datetime, timezone

    inserted = 0
    for item in items:
        # Skip duplicates (same source + external_id)
        external_id = item.get("id")
        if external_id:
            dup = await db.execute(
                select(RawJobPost).where(
                    RawJobPost.source_id == job.source_id,
                    RawJobPost.external_id == external_id,
                )
            )
            if dup.scalar_one_or_none():
                continue

        posted_at = None
        if item.get("postedAt"):
            try:
                posted_at = datetime.fromisoformat(item["postedAt"].replace("Z", "+00:00"))
            except ValueError:
                pass

        post = RawJobPost(
            scraping_job_id=job_id,
            source_id=job.source_id,
            external_id=external_id,
            url=item.get("jobUrl"),
            title=item.get("title"),
            company=item.get("companyName"),
            location=item.get("location"),
            contract_type=item.get("employmentType"),
            salary_raw=item.get("salaryText"),
            description=item.get("description"),
            posted_at=posted_at,
            is_processed=False,
        )
        db.add(post)
        inserted += 1

    # Update job
    job.status = "completed"
    job.items_scraped = inserted
    job.completed_at = datetime.now(timezone.utc)
    job.metadata_ = {"apify_run_id": run_id, "dataset_id": dataset_id}

    # Update last_successful_scrape_at on source
    src = await db.execute(select(ScrapingSource).where(ScrapingSource.id == job.source_id))
    source = src.scalar_one_or_none()
    if source:
        source.last_successful_scrape_at = datetime.now(timezone.utc)

    await db.commit()
    return {"received": True, "items_inserted": inserted}
