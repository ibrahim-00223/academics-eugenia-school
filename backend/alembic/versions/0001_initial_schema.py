"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────────────────
    op.execute("CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer')")
    op.execute("CREATE TYPE source_type_enum AS ENUM ('job_board', 'podcast', 'rss')")
    op.execute("CREATE TYPE job_status_enum AS ENUM ('pending', 'running', 'completed', 'failed', 'rate_limited')")
    op.execute("CREATE TYPE trigger_enum AS ENUM ('cron', 'manual')")
    op.execute("CREATE TYPE skill_category_enum AS ENUM ('technical', 'soft', 'domain')")
    op.execute("CREATE TYPE batch_status_enum AS ENUM ('pending', 'running', 'completed', 'failed')")
    op.execute("CREATE TYPE batch_source_type_enum AS ENUM ('job_post', 'podcast')")
    op.execute("CREATE TYPE extracted_source_type_enum AS ENUM ('job_post', 'podcast')")
    op.execute("CREATE TYPE salary_source_type_enum AS ENUM ('job_post', 'csv_import', 'manual')")
    op.execute("CREATE TYPE program_level_enum AS ENUM ('bachelor', 'master')")
    op.execute("CREATE TYPE coverage_level_enum AS ENUM ('introduced', 'practiced', 'mastered')")
    op.execute("CREATE TYPE event_type_enum AS ENUM ('hackathon', 'conference', 'workshop', 'webinar', 'guest_lecture', 'other')")
    op.execute("CREATE TYPE event_status_enum AS ENUM ('suggested', 'planned', 'confirmed', 'completed', 'cancelled')")
    op.execute("CREATE TYPE report_type_enum AS ENUM ('monthly', 'quarterly', 'annual')")
    op.execute("CREATE TYPE report_status_enum AS ENUM ('generating', 'ready', 'failed')")

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("google_id", sa.String(), nullable=True, unique=True),
        sa.Column("role", sa.Enum("admin", "editor", "viewer", name="user_role", create_type=False), nullable=False, server_default="viewer"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_google_id", "users", ["google_id"])

    # ── monthly_reports (needed early for FK in events) ───────────────────────
    op.create_table(
        "monthly_reports",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column("period_month", sa.Integer(), nullable=False),
        sa.Column("report_type", sa.Enum("monthly", "quarterly", "annual", name="report_type_enum", create_type=False), nullable=False, server_default="monthly"),
        sa.Column("status", sa.Enum("generating", "ready", "failed", name="report_status_enum", create_type=False), nullable=False, server_default="generating"),
        sa.Column("summary_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("pdf_storage_path", sa.String(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── scraping_sources ──────────────────────────────────────────────────────
    op.create_table(
        "scraping_sources",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True),
        sa.Column("source_type", sa.Enum("job_board", "podcast", "rss", name="source_type_enum", create_type=False), nullable=False),
        sa.Column("base_url", sa.String(), nullable=False),
        sa.Column("config", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("last_successful_scrape_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── scraping_jobs ─────────────────────────────────────────────────────────
    op.create_table(
        "scraping_jobs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("source_id", sa.String(), sa.ForeignKey("scraping_sources.id"), nullable=False),
        sa.Column("status", sa.Enum("pending", "running", "completed", "failed", "rate_limited", name="job_status_enum", create_type=False), nullable=False, server_default="pending"),
        sa.Column("triggered_by", sa.Enum("cron", "manual", name="trigger_enum", create_type=False), nullable=False, server_default="cron"),
        sa.Column("triggered_by_user", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("items_scraped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── raw_job_posts ─────────────────────────────────────────────────────────
    op.create_table(
        "raw_job_posts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("scraping_job_id", sa.String(), sa.ForeignKey("scraping_jobs.id"), nullable=False),
        sa.Column("source_id", sa.String(), sa.ForeignKey("scraping_sources.id"), nullable=False),
        sa.Column("external_id", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("contract_type", sa.String(), nullable=True),
        sa.Column("salary_raw", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_processed", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index("ix_raw_job_posts_is_processed", "raw_job_posts", ["is_processed"])

    # ── raw_podcast_episodes ──────────────────────────────────────────────────
    op.create_table(
        "raw_podcast_episodes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("scraping_job_id", sa.String(), sa.ForeignKey("scraping_jobs.id"), nullable=False),
        sa.Column("source_id", sa.String(), sa.ForeignKey("scraping_sources.id"), nullable=False),
        sa.Column("external_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("audio_url", sa.String(), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_processed", sa.Boolean(), nullable=False, server_default="false"),
    )

    # ── skill_taxonomy ────────────────────────────────────────────────────────
    op.create_table(
        "skill_taxonomy",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True),
        sa.Column("category", sa.Enum("technical", "soft", "domain", name="skill_category_enum", create_type=False), nullable=False),
        sa.Column("parent_id", sa.String(), sa.ForeignKey("skill_taxonomy.id"), nullable=True),
        sa.Column("aliases", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_skill_taxonomy_name", "skill_taxonomy", ["name"])

    # ── extraction_batches ────────────────────────────────────────────────────
    op.create_table(
        "extraction_batches",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("status", sa.Enum("pending", "running", "completed", "failed", name="batch_status_enum", create_type=False), nullable=False, server_default="pending"),
        sa.Column("source_type", sa.Enum("job_post", "podcast", name="batch_source_type_enum", create_type=False), nullable=False, server_default="job_post"),
        sa.Column("total_items", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("processed_items", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tokens_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_usd", sa.Float(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── extracted_skills ──────────────────────────────────────────────────────
    op.create_table(
        "extracted_skills",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("batch_id", sa.String(), sa.ForeignKey("extraction_batches.id"), nullable=False),
        sa.Column("source_type", sa.Enum("job_post", "podcast", name="extracted_source_type_enum", create_type=False), nullable=False),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("skill_id", sa.String(), sa.ForeignKey("skill_taxonomy.id"), nullable=True),
        sa.Column("skill_name_raw", sa.String(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("context_snippet", sa.Text(), nullable=True),
        sa.Column("extracted_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── skill_aggregates ──────────────────────────────────────────────────────
    op.create_table(
        "skill_aggregates",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("skill_id", sa.String(), sa.ForeignKey("skill_taxonomy.id"), nullable=False),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column("period_month", sa.Integer(), nullable=False),
        sa.Column("mention_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("job_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_skill_aggregates_period", "skill_aggregates", ["skill_id", "period_year", "period_month"])

    # ── salary_data_points ────────────────────────────────────────────────────
    op.create_table(
        "salary_data_points",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("source_type", sa.Enum("job_post", "csv_import", "manual", name="salary_source_type_enum", create_type=False), nullable=False),
        sa.Column("source_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("contract_type", sa.String(), nullable=True),
        sa.Column("salary_min", sa.Float(), nullable=True),
        sa.Column("salary_max", sa.Float(), nullable=True),
        sa.Column("salary_raw", sa.String(), nullable=True),
        sa.Column("experience_years_min", sa.Integer(), nullable=True),
        sa.Column("experience_years_max", sa.Integer(), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── skill_clusters ────────────────────────────────────────────────────────
    op.create_table(
        "skill_clusters",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("skill_ids", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── salary_simulations ────────────────────────────────────────────────────
    op.create_table(
        "salary_simulations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("cluster_id", sa.String(), sa.ForeignKey("skill_clusters.id"), nullable=False),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column("period_month", sa.Integer(), nullable=False),
        sa.Column("contract_type", sa.String(), nullable=True),
        sa.Column("experience_band", sa.String(), nullable=True),
        sa.Column("p25_salary", sa.Float(), nullable=True),
        sa.Column("p50_salary", sa.Float(), nullable=True),
        sa.Column("p75_salary", sa.Float(), nullable=True),
        sa.Column("sample_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("ai_narrative", sa.Text(), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── programs ──────────────────────────────────────────────────────────────
    op.create_table(
        "programs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("level", sa.Enum("bachelor", "master", name="program_level_enum", create_type=False), nullable=False),
        sa.Column("duration_years", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── semesters ─────────────────────────────────────────────────────────────
    op.create_table(
        "semesters",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("program_id", sa.String(), sa.ForeignKey("programs.id"), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── modules ───────────────────────────────────────────────────────────────
    op.create_table(
        "modules",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("semester_id", sa.String(), sa.ForeignKey("semesters.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=True),
        sa.Column("credits_ects", sa.Integer(), nullable=True),
        sa.Column("hours_total", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── module_skill_coverage ─────────────────────────────────────────────────
    op.create_table(
        "module_skill_coverage",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("module_id", sa.String(), sa.ForeignKey("modules.id"), nullable=False),
        sa.Column("skill_id", sa.String(), sa.ForeignKey("skill_taxonomy.id"), nullable=False),
        sa.Column("coverage_level", sa.Enum("introduced", "practiced", "mastered", name="coverage_level_enum", create_type=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── events ────────────────────────────────────────────────────────────────
    op.create_table(
        "events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("event_type", sa.Enum("hackathon", "conference", "workshop", "webinar", "guest_lecture", "other", name="event_type_enum", create_type=False), nullable=False),
        sa.Column("status", sa.Enum("suggested", "planned", "confirmed", "completed", "cancelled", name="event_status_enum", create_type=False), nullable=False, server_default="suggested"),
        sa.Column("scheduled_date", sa.Date(), nullable=True),
        sa.Column("target_skills", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("report_id", sa.String(), sa.ForeignKey("monthly_reports.id"), nullable=True),
        sa.Column("created_by", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("events")
    op.drop_table("module_skill_coverage")
    op.drop_table("modules")
    op.drop_table("semesters")
    op.drop_table("programs")
    op.drop_table("salary_simulations")
    op.drop_table("skill_clusters")
    op.drop_table("salary_data_points")
    op.drop_table("skill_aggregates")
    op.drop_table("extracted_skills")
    op.drop_table("extraction_batches")
    op.drop_table("skill_taxonomy")
    op.drop_table("raw_podcast_episodes")
    op.drop_table("raw_job_posts")
    op.drop_table("scraping_jobs")
    op.drop_table("scraping_sources")
    op.drop_table("monthly_reports")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS event_status_enum")
    op.execute("DROP TYPE IF EXISTS event_type_enum")
    op.execute("DROP TYPE IF EXISTS coverage_level_enum")
    op.execute("DROP TYPE IF EXISTS program_level_enum")
    op.execute("DROP TYPE IF EXISTS salary_source_type_enum")
    op.execute("DROP TYPE IF EXISTS extracted_source_type_enum")
    op.execute("DROP TYPE IF EXISTS batch_source_type_enum")
    op.execute("DROP TYPE IF EXISTS batch_status_enum")
    op.execute("DROP TYPE IF EXISTS skill_category_enum")
    op.execute("DROP TYPE IF EXISTS trigger_enum")
    op.execute("DROP TYPE IF EXISTS job_status_enum")
    op.execute("DROP TYPE IF EXISTS source_type_enum")
    op.execute("DROP TYPE IF EXISTS report_status_enum")
    op.execute("DROP TYPE IF EXISTS report_type_enum")
    op.execute("DROP TYPE IF EXISTS user_role")
