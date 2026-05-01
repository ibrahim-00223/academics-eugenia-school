import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Text, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    report_type: Mapped[str] = mapped_column(
        SAEnum("monthly", "quarterly", "annual", name="report_type_enum"),
        default="monthly",
    )
    status: Mapped[str] = mapped_column(
        SAEnum("generating", "ready", "failed", name="report_status_enum"),
        default="generating",
    )
    summary_json: Mapped[dict] = mapped_column(JSON, default=dict)  # structured data used in the report
    pdf_storage_path: Mapped[str | None] = mapped_column(String, nullable=True)  # path in Railway/S3 storage
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
