import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Complaint, Citizen
from app.config import settings

logger = logging.getLogger("kural.router.notify")
router = APIRouter(prefix="/api/notify", tags=["Notifications"])

class NotificationRequest(BaseModel):
    complaint_id: str
    message_override: str = ""

from app.services.telegram_service import send_telegram_message

@router.post("/telegram-update")
async def send_telegram_update(req: NotificationRequest, db: AsyncSession = Depends(get_db)):
    """
    Triggers outbound Telegram status update notification to citizen.
    """
    stmt = select(Complaint, Citizen.phone).join(Citizen, Complaint.citizen_id == Citizen.id).where(Complaint.id == req.complaint_id)
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")

    comp, phone = row
    msg_body = req.message_override or (
        f"🔔 *Kural Grievance Update*\n\n"
        f"Your complaint *{comp.complaint_code}* status has been updated to: *{comp.status.upper()}*.\n"
        f"Department: {comp.department.replace('_', ' ').title()}\n"
        f"Summary: {comp.summary}\n\n"
        f"Thank you for helping keep our city clean and safe!"
    )

    if settings.TELEGRAM_BOT_TOKEN and phone and phone.isdigit():
        try:
            success = await send_telegram_message(settings.TELEGRAM_BOT_TOKEN, int(phone), msg_body)
            if success:
                logger.info(f"Sent outbound Telegram update to chat_id {phone}")
                return {"status": "sent", "recipient": phone, "channel": "telegram"}
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")

    logger.info(f"[SIMULATED OUTBOUND TELEGRAM] To: {phone} | Body: {msg_body}")
    return {
        "status": "simulated",
        "recipient": phone,
        "channel": "telegram",
        "body": msg_body
    }
