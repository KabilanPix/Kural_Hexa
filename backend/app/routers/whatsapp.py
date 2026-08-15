import logging
from typing import Optional
from fastapi import APIRouter, Form, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.whatsapp_service import process_whatsapp_message

logger = logging.getLogger("kural.router.whatsapp")
router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

@router.post("/webhook")
async def whatsapp_webhook(
    From: str = Form(...),
    Body: Optional[str] = Form(""),
    Latitude: Optional[float] = Form(None),
    Longitude: Optional[float] = Form(None),
    MediaUrl0: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Twilio inbound WhatsApp message webhook handler.
    Supports text, photo media URLs, voice note links, and location pins.
    """
    logger.info(f"Received WhatsApp webhook from {From}. Body: '{Body}'")
    
    twiml_xml = await process_whatsapp_message(
        db=db,
        from_phone=From,
        body=Body or "",
        latitude=Latitude,
        longitude=Longitude,
        media_url=MediaUrl0
    )
    return Response(content=twiml_xml, media_type="text/xml")

@router.post("/webhook/status")
async def whatsapp_status(
    MessageSid: Optional[str] = Form(None),
    MessageStatus: Optional[str] = Form(None)
):
    """Twilio delivery status callback."""
    logger.info(f"WhatsApp status update for Sid {MessageSid}: {MessageStatus}")
    return {"status": "ok"}
