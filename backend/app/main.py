from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, events, health, admin, flyer, signups, messages, photos, points

app = FastAPI(title="MS CodeToGive API", version="0.1.0")

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(admin.router)
app.include_router(flyer.router, prefix="/api/v1")
app.include_router(signups.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(photos.router, prefix="/api/v1")
app.include_router(points.router, prefix="/api/v1")
