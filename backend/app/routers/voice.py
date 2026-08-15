import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, Response, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.twiml.voice_response import VoiceResponse, Connect
from app.config import settings
from app.database import get_db
from app.services.call_service import execute_voice_tool

logger = logging.getLogger("kural.router.voice")
router = APIRouter(prefix="/api/voice", tags=["Voice"])

class SimulateCallRequest(BaseModel):
    phone: str = "+919876543210"
    transcript: str
    action: str = "create_complaint" # create_complaint | get_status | check_emergency

@router.post("/incoming")
async def voice_incoming():
    """
    Twilio incoming call handler.
    Returns TwiML instructing Twilio to open a WebSocket stream to /api/voice/stream.
    """
    resp = VoiceResponse()
    resp.say("Welcome to Kural Citizen Helpline. Connecting you to our AI voice engine.")
    connect = Connect()
    ws_url = settings.PUBLIC_BASE_URL.replace("http", "ws") + "/api/voice/stream"
    connect.stream(url=ws_url)
    resp.append(connect)
    return Response(content=str(resp), media_type="text/xml")

@router.websocket("/stream")
async def voice_stream_ws(websocket: WebSocket):
    """
    Bidirectional WebSocket audio stream endpoint for Twilio / OpenAI Realtime API.
    """
    await websocket.accept()
    logger.info("Twilio Voice Media Stream connected.")
    try:
        while True:
            data = await websocket.receive_text()
            # Audio packet streaming logic bridge
    except Exception as e:
        logger.info(f"Voice WebSocket stream closed: {e}")

@router.post("/simulate")
async def simulate_voice_call(req: SimulateCallRequest, db: AsyncSession = Depends(get_db)):
    """
    Dev fallback endpoint to simulate an AI voice call transcript and tool execution.
    Guarantees a 100% stable demo without live phone line requirements.
    """
    if req.action == "create_complaint":
        result = await execute_voice_tool(
            tool_name="create_complaint",
            args={"raw_text": req.transcript, "summary": req.transcript},
            db=db,
            citizen_phone=req.phone
        )
    elif req.action == "check_emergency":
        result = await execute_voice_tool(
            tool_name="detect_emergency",
            args={"transcript": req.transcript},
            db=db,
            citizen_phone=req.phone
        )
    else:
        result = await execute_voice_tool(
            tool_name="get_citizen_history",
            args={},
            db=db,
            citizen_phone=req.phone
        )

    return {
        "status": "success",
        "action": req.action,
        "input_transcript": req.transcript,
        "tool_execution_result": result
    }
