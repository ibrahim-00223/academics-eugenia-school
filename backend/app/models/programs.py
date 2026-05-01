import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    level: Mapped[str] = mapped_column(
        SAEnum("bachelor", "master", name="program_level_enum"), nullable=False
    )
    duration_years: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    semesters: Mapped[list["Semester"]] = relationship(back_populates="program", cascade="all, delete-orphan")


class Semester(Base):
    __tablename__ = "semesters"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    program_id: Mapped[str] = mapped_column(String, ForeignKey("programs.id"), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, 3…
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    program: Mapped["Program"] = relationship(back_populates="semesters")
    modules: Mapped[list["Module"]] = relationship(back_populates="semester", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    semester_id: Mapped[str] = mapped_column(String, ForeignKey("semesters.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str | None] = mapped_column(String, nullable=True)  # e.g. "INF301"
    credits_ects: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hours_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    semester: Mapped["Semester"] = relationship(back_populates="modules")
    skill_coverages: Mapped[list["ModuleSkillCoverage"]] = relationship(back_populates="module", cascade="all, delete-orphan")


class ModuleSkillCoverage(Base):
    __tablename__ = "module_skill_coverage"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id: Mapped[str] = mapped_column(String, ForeignKey("modules.id"), nullable=False)
    skill_id: Mapped[str] = mapped_column(String, ForeignKey("skill_taxonomy.id"), nullable=False)
    coverage_level: Mapped[str] = mapped_column(
        SAEnum("introduced", "practiced", "mastered", name="coverage_level_enum"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    module: Mapped["Module"] = relationship(back_populates="skill_coverages")
