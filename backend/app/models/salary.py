import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Float, Text, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class SalaryDataPoint(Base):
    __tablename__ = "salary_data_points"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_type: Mapped[str] = mapped_column(
        SAEnum("job_post", "csv_import", "manual", name="salary_source_type_enum"), nullable=False
    )
    source_id: Mapped[str | None] = mapped_column(String, nullable=True)  # raw_job_post id if from scraping
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    company: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    contract_type: Mapped[str | None] = mapped_column(String, nullable=True)  # CDI, CDD, freelance, stage…
    salary_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_raw: Mapped[str | None] = mapped_column(String, nullable=True)
    experience_years_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    experience_years_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skills: Mapped[list] = mapped_column(JSON, default=list)  # list[str] — skill names
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SkillCluster(Base):
    __tablename__ = "skill_clusters"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    skill_ids: Mapped[list] = mapped_column(JSON, default=list)  # list[str] — skill_taxonomy ids
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    simulations: Mapped[list["SalarySimulation"]] = relationship(back_populates="cluster")


class SalarySimulation(Base):
    __tablename__ = "salary_simulations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    cluster_id: Mapped[str] = mapped_column(String, ForeignKey("skill_clusters.id"), nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    contract_type: Mapped[str | None] = mapped_column(String, nullable=True)
    experience_band: Mapped[str | None] = mapped_column(String, nullable=True)  # "0-2", "3-5", "5-10", "10+"
    p25_salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    p50_salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    p75_salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    sample_size: Mapped[int] = mapped_column(Integer, default=0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)  # MIN(1.0, sample_size / 30)
    ai_narrative: Mapped[str | None] = mapped_column(Text, nullable=True)  # Claude Haiku narration
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    cluster: Mapped["SkillCluster"] = relationship(back_populates="simulations")
