import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(
        SAEnum("hackathon", "conference", "workshop", "webinar", "guest_lecture", "other",
               name="event_type_enum"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        SAEnum("suggested", "planned", "confirmed", "completed", "cancelled",
               name="event_status_enum"),
        default="suggested",
    )
    scheduled_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_skills: Mapped[list] = mapped_column(JSON, default=list)  # list[str] — skill_taxonomy ids
    report_id: Mapped[str | None] = mapped_column(String, ForeignKey("monthly_reports.id"), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
