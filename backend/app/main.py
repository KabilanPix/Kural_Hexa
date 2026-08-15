import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import settings
from app.database import engine, Base
from app.services.websocket_manager import ws_manager
from app.services.telegram_service import start_telegram_polling

from app.routers import (
    whatsapp,
    voice,
    complaints,
    citizens,
    incidents,
    ai,
    dashboard,
    notify
)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("kural.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Kural AI Backend Service...")
    # Attempt DB init (create extensions & tables on Supabase if not existing)
    try:
        async with engine.begin() as conn:
            await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
            await conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector;'))
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Supabase database tables & vector extensions initialized successfully.")
    except Exception as e:
        logger.warning(f"Note on DB initialization: {e}")

    # Launch background Telegram polling task if token configured
    telegram_task = None
    if settings.TELEGRAM_BOT_TOKEN:
        telegram_task = asyncio.create_task(start_telegram_polling())
        logger.info("Telegram Bot worker launched successfully!")

    yield

    if telegram_task:
        telegram_task.cancel()
    logger.info("Shutting down Kural Backend Service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Kural — AI-Powered Citizen Call & Message Intelligence Platform API",
    lifespan=lifespan
)

# CORS configuration for frontend Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(whatsapp.router)
app.include_router(voice.router)
app.include_router(complaints.router)
app.include_router(citizens.router)
app.include_router(incidents.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(notify.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "openai_status": "live_key" if settings.OPENAI_API_KEY else "mock_classifier_active",
        "telegram_status": "active" if settings.TELEGRAM_BOT_TOKEN else "disabled"
    }

@app.websocket("/ws/dashboard")
async def dashboard_websocket_endpoint(websocket: WebSocket):
    """Real-time WebSocket feed pushing new complaints and status changes live to connected dashboards."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)
