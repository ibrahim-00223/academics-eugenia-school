import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.core.config import settings

app = FastAPI(
    title="Eugenia Academics API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check — registered FIRST so it works even if routers fail ──────────
@app.get("/api/health", include_in_schema=False)
async def health():
    return JSONResponse({"status": "ok"})


# ── Routers — wrapped so a broken import doesn't kill the whole app ───────────
_router_map = [
    ("app.routers.auth",      "/api/auth",      ["auth"]),
    ("app.routers.scraping",  "/api/scraping",  ["scraping"]),
    ("app.routers.skills",    "/api/skills",    ["skills"]),
    ("app.routers.salary",    "/api/salary",    ["salary"]),
    ("app.routers.programs",  "/api/programs",  ["programs"]),
    ("app.routers.events",    "/api/events",    ["events"]),
    ("app.routers.reports",   "/api/reports",   ["reports"]),
    ("app.routers.admin",     "/api/admin",     ["admin"]),
    ("app.routers.webhooks",  "/api/webhooks",  ["webhooks"]),
]

for module_path, prefix, tags in _router_map:
    try:
        import importlib
        module = importlib.import_module(module_path)
        app.include_router(module.router, prefix=prefix, tags=tags)
        logger.info(f"✓ Router loaded: {prefix}")
    except Exception as exc:
        logger.error(f"✗ Failed to load router {module_path}: {exc}", exc_info=True)
