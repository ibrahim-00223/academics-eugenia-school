import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Text, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ScrapingSource(Base):
    __tablename__ = "scraping_sources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    source_type: Mapped[str] = mapped_column(
        SAEnum("job_board", "podcast", "rss", name="source_type_enum"), nullable=False
    )
    base_url: Mapped[str] = mapped_column(String, nullable=False)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_successful_scrape_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    jobs: Mapped[list["ScrapingJob"]] = relationship(back_populates="source")


class ScrapingJob(Base):
    __tablename__ = "scraping_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(String, ForeignKey("scraping_sources.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "running", "completed", "failed", "rate_limited", name="job_status_enum"),
        default="pending",
    )
    triggered_by: Mapped[str] = mapped_column(
        SAEnum("cron", "manual", name="trigger_enum"), default="cron"
    )
    triggered_by_user: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    items_scraped: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    source: Mapped["ScrapingSource"] = relationship(back_populates="jobs")


class RawJobPost(Base):
    __tablename__ = "raw_job_posts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scraping_job_id: Mapped[str] = mapped_column(String, ForeignKey("scraping_jobs.id"), nullable=False)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("scraping_sources.id"), nullable=False)
    external_id: Mapped[str | None] = mapped_column(String, nullable=True)
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    company: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    contract_type: Mapped[str | None] = mapped_column(String, nullable=True)
    salary_raw: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False)


class RawPodcastEpisode(Base):
    __tablename__ = "raw_podcast_episodes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scraping_job_id: Mapped[str] = mapped_column(String, ForeignKey("scraping_jobs.id"), nullable=False)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("scraping_sources.id"), nullable=False)
    external_id: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False)
