from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import list as List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────
    APP_NAME: str = "Eugenia Academics API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # ── Server ────────────────────────────────────────────────
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Database (Railway PostgreSQL) ─────────────────────────
    DATABASE_URL: str  # e.g. postgresql+asyncpg://user:pass@host:5432/db

    # ── Auth / JWT ────────────────────────────────────────────
    SECRET_KEY: str       # openssl rand -hex 32
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24        # 24h
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Google OAuth ──────────────────────────────────────────
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    # Redirect URI registered in Google Cloud Console
    # Dev:  http://localhost:8000/api/auth/google/callback
    # Prod: https://your-api.up.railway.app/api/auth/google/callback
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    # ── Allowed email domains (comma-separated, empty = all) ──
    ALLOWED_EMAIL_DOMAINS: str = ""

    @property
    def allowed_domains(self) -> list[str]:
        if not self.ALLOWED_EMAIL_DOMAINS:
            return []
        return [d.strip().lower() for d in self.ALLOWED_EMAIL_DOMAINS.split(",")]

    # ── Apify ─────────────────────────────────────────────────
    APIFY_API_TOKEN: str = ""
    APIFY_WEBHOOK_SECRET: str = ""

    # ── AI ────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # ── Cron ──────────────────────────────────────────────────
    CRON_SECRET: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [self.FRONTEND_URL]


settings = Settings()
