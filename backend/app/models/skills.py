import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Float, Text, JSON, ForeignKey, Enum as SAEnum, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class SkillTaxonomy(Base):
    __tablename__ = "skill_taxonomy"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(
        SAEnum("technical", "soft", "domain", name="skill_category_enum"), nullable=False
    )
    parent_id: Mapped[str | None] = mapped_column(String, ForeignKey("skill_taxonomy.id"), nullable=True)
    aliases: Mapped[list] = mapped_column(JSON, default=list)  # list[str]
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    parent: Mapped["SkillTaxonomy | None"] = relationship("SkillTaxonomy", remote_side="SkillTaxonomy.id", back_populates="children")
    children: Mapped[list["SkillTaxonomy"]] = relationship("SkillTaxonomy", back_populates="parent")
    extracted_skills: Mapped[list["ExtractedSkill"]] = relationship(back_populates="skill")
    aggregates: Mapped[list["SkillAggregate"]] = relationship(back_populates="skill")


class ExtractionBatch(Base):
    __tablename__ = "extraction_batches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "running", "completed", "failed", name="batch_status_enum"),
        default="pending",
    )
    source_type: Mapped[str] = mapped_column(
        SAEnum("job_post", "podcast", name="batch_source_type_enum"), default="job_post"
    )
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    processed_items: Mapped[int] = mapped_column(Integer, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    extracted_skills: Mapped[list["ExtractedSkill"]] = relationship(back_populates="batch")


class ExtractedSkill(Base):
    __tablename__ = "extracted_skills"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id: Mapped[str] = mapped_column(String, ForeignKey("extraction_batches.id"), nullable=False)
    # Source — one of raw_job_posts or raw_podcast_episodes
    source_type: Mapped[str] = mapped_column(
        SAEnum("job_post", "podcast", name="extracted_source_type_enum"), nullable=False
    )
    source_id: Mapped[str] = mapped_column(String, nullable=False)  # id from raw_job_posts or raw_podcast_episodes
    skill_id: Mapped[str | None] = mapped_column(String, ForeignKey("skill_taxonomy.id"), nullable=True)
    skill_name_raw: Mapped[str] = mapped_column(String, nullable=False)  # as extracted by AI (before normalisation)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    context_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    batch: Mapped["ExtractionBatch"] = relationship(back_populates="extracted_skills")
    skill: Mapped["SkillTaxonomy | None"] = relationship(back_populates="extracted_skills")


class SkillAggregate(Base):
    __tablename__ = "skill_aggregates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    skill_id: Mapped[str] = mapped_column(String, ForeignKey("skill_taxonomy.id"), nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    mention_count: Mapped[int] = mapped_column(Integer, default=0)
    job_count: Mapped[int] = mapped_column(Integer, default=0)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    skill: Mapped["SkillTaxonomy"] = relationship(back_populates="aggregates")
