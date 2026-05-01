from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routers import auth, scraping, skills, salary, programs, events, reports, admin, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title="Eugenia Academics API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])
app.include_router(scraping.router,  prefix="/api/scraping",  tags=["scraping"])
app.include_router(skills.router,    prefix="/api/skills",    tags=["skills"])
app.include_router(salary.router,    prefix="/api/salary",    tags=["salary"])
app.include_router(programs.router,  prefix="/api/programs",  tags=["programs"])
app.include_router(events.router,    prefix="/api/events",    tags=["events"])
app.include_router(reports.router,   prefix="/api/reports",   tags=["reports"])
app.include_router(admin.router,     prefix="/api/admin",     tags=["admin"])
app.include_router(webhooks.router,  prefix="/api/webhooks",  tags=["webhooks"])


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/api/health", include_in_schema=False)
async def health():
    return JSONResponse({"status": "ok"})
