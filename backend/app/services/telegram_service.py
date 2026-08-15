import asyncio
import logging
import re
from typing import Optional, Dict, Any
import httpx
from app.config import settings
from app.database import AsyncSessionLocal
from app.services.ai_service import classify_complaint_ai, generate_embedding
from app.services.duplicate_service import fuse_incident_if_duplicate
from app.services.whatsapp_service import generate_complaint_code, get_or_create_citizen
from app.services.websocket_manager import ws_manager
from app.models import Complaint
from sqlalchemy import select

logger = logging.getLogger("kural.telegram_service")

TELEGRAM_API_BASE = "https://api.telegram.org/bot"

async def send_telegram_message(token: str, chat_id: int, text: str, parse_mode: str = "Markdown") -> bool:
    url = f"{TELEGRAM_API_BASE}{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                # Retry without markdown if parsing fails
                payload.pop("parse_mode", None)
                await client.post(url, json=payload)
            return True
    except Exception as e:
        logger.error(f"Error sending Telegram message to {chat_id}: {e}")
        return False

async def handle_telegram_update(update: Dict[str, Any], token: str):
    message = update.get("message")
    if not message:
        return

    chat = message.get("chat", {})
    chat_id = chat.get("id")
    text = message.get("text", "").strip()
    from_user = message.get("from", {})
    phone = str(chat_id)  # Use Telegram chat_id as citizen identifier
    first_name = from_user.get("first_name", "Citizen")

    if not text or not chat_id:
        return

    logger.info(f"Received Telegram message from {first_name} ({chat_id}): '{text}'")

    async with AsyncSessionLocal() as db:
        citizen = await get_or_create_citizen(db, phone=phone, name=first_name)
        text_upper = text.upper()

        # Start / Menu command
        if text_upper in ["/START", "HI", "HELLO", "MENU", "HELP", "VANAKKAM"]:
            menu_text = (
                f"🏛️ *Welcome to Kural Citizen Grievance Portal, {first_name}!*\n\n"
                "How can we assist you today?\n"
                "• Simply type your complaint (in English, Tamil, or Tanglish) e.g., _\"No water supply in Ward 18 for 2 days\"_\n"
                "• Type *TRACK <Code>* (e.g. `TRACK KR-2026-004821`) to check status\n"
                "• Type *MY COMPLAINTS* to view your active complaints\n"
                "• Type *EMERGENCY* for urgent life-safety issues"
            )
            await send_telegram_message(token, chat_id, menu_text)
            return

        # Track status flow
        if text_upper.startswith("TRACK") or "KR-2026-" in text_upper:
            code_match = re.search(r'KR-\d{4}-\d{6}', text_upper)
            if code_match:
                code = code_match.group(0)
                stmt = select(Complaint).where(Complaint.complaint_code == code)
                res = await db.execute(stmt)
                comp = res.scalar_one_or_none()

                if comp:
                    status_emoji = "🟢" if comp.status == "resolved" else "🟡" if comp.status == "in_progress" else "🔴"
                    track_text = (
                        f"📋 *Complaint Details: {comp.complaint_code}*\n\n"
                        f"Status: {status_emoji} *{comp.status.upper()}*\n"
                        f"Department: *{comp.department.replace('_', ' ').title()}*\n"
                        f"Priority: *{comp.priority.upper()}*\n"
                        f"Summary: {comp.summary}\n"
                        f"Reported: {comp.created_at.strftime('%Y-%m-%d %H:%M')}\n\n"
                        f"_Our officers are actively working on resolving your grievance._"
                    )
                    await send_telegram_message(token, chat_id, track_text)
                else:
                    await send_telegram_message(token, chat_id, f"❌ Complaint code `{code}` not found. Please verify and try again.")
            else:
                await send_telegram_message(token, chat_id, "⚠️ Please provide a valid complaint code in format `TRACK KR-YYYY-NNNNNN`.")
            return

        # My Complaints flow
        if text_upper in ["MY COMPLAINTS", "3", "HISTORY"]:
            stmt = select(Complaint).where(Complaint.citizen_id == citizen.id).order_by(Complaint.created_at.desc()).limit(5)
            res = await db.execute(stmt)
            complaints = res.scalars().all()

            if not complaints:
                await send_telegram_message(token, chat_id, "ℹ️ You have no registered complaints yet. Type any issue to submit one!")
                return

            lines = ["📋 *Your Recent Complaints:*"]
            for c in complaints:
                status_badge = "🟢" if c.status == "resolved" else "🟡" if c.status == "in_progress" else "🔴"
                lines.append(f"\n• *{c.complaint_code}* {status_badge} [{c.priority.upper()}]\n  Dept: {c.department.replace('_', ' ').title()}\n  Summary: {c.summary[:50]}...")
            
            lines.append("\nType *TRACK <Code>* for full details.")
            await send_telegram_message(token, chat_id, "\n".join(lines))
            return

        # Emergency Flow
        if text_upper == "EMERGENCY":
            await send_telegram_message(
                token, chat_id,
                "🚨 *EMERGENCY RESPONSE TRIGGERED*\n\n"
                "If this is an immediate threat to life, fire, or severe accident, emergency teams are being alerted.\n"
                "Please describe your urgent situation immediately or call 112."
            )
            return

        # Free-Text Complaint Processing Pipeline
        classification = await classify_complaint_ai(text)
        embedding = await generate_embedding(classification.summary)
        complaint_code = generate_complaint_code()

        new_complaint = Complaint(
            complaint_code=complaint_code,
            citizen_id=citizen.id,
            channel="telegram",
            category=classification.category,
            department=classification.department,
            priority=classification.priority,
            sentiment=classification.sentiment,
            confidence=classification.confidence,
            summary=classification.summary,
            raw_text=text,
            language="ta" if re.search(r'[\u0B80-\u0BFF]', text) else "en",
            lat=13.0827,
            lng=80.2707,
            status="open",
            embedding=embedding
        )

        db.add(new_complaint)
        await db.commit()
        await db.refresh(new_complaint)

        # Fuse with duplicate incident if matching
        fused_incident = await fuse_incident_if_duplicate(
            db,
            new_complaint=new_complaint,
            summary=classification.summary,
            embedding=embedding,
            category=classification.category,
            ward=classification.entities.get("ward", "Ward 18")
        )

        # Broadcast live to WebSocket Dashboard
        dashboard_payload = {
            "id": str(new_complaint.id),
            "complaint_code": new_complaint.complaint_code,
            "citizen_phone": citizen.phone,
            "channel": "telegram",
            "category": new_complaint.category,
            "department": new_complaint.department,
            "priority": new_complaint.priority,
            "sentiment": new_complaint.sentiment,
            "confidence": new_complaint.confidence,
            "summary": new_complaint.summary,
            "raw_text": new_complaint.raw_text,
            "language": new_complaint.language,
            "lat": new_complaint.lat,
            "lng": new_complaint.lng,
            "status": new_complaint.status,
            "created_at": new_complaint.created_at.isoformat(),
            "entities": classification.entities,
            "is_emergency": classification.is_emergency,
            "incident_fused": fused_incident is not None
        }
        await ws_manager.broadcast("NEW_COMPLAINT", dashboard_payload)

        # Reply on Telegram
        priority_emoji = "🚨" if classification.priority == "critical" else "🟠" if classification.priority == "high" else "🟡"
        reply_msg = (
            f"✅ *Complaint Registered Successfully!*\n\n"
            f"🆔 *Code:* `{new_complaint.complaint_code}`\n"
            f"🏢 *Assigned Dept:* {new_complaint.department.replace('_', ' ').title()}\n"
            f"📊 *Priority:* {priority_emoji} {new_complaint.priority.upper()}\n"
            f"💡 *Summary:* {new_complaint.summary}\n"
            f"🎯 *AI Confidence:* {int(new_complaint.confidence * 100)}%\n\n"
            f"Track progress anytime by sending `TRACK {new_complaint.complaint_code}`."
        )

        if fused_incident:
            reply_msg += f"\n\n🔗 _Note: Your report was grouped with similar recent reports in your ward to accelerate field response._"

        await send_telegram_message(token, chat_id, reply_msg)

async def start_telegram_polling():
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        logger.info("No TELEGRAM_BOT_TOKEN provided. Telegram bot polling disabled.")
        return

    logger.info(f"Starting Telegram Bot Polling worker...")
    offset = 0

    while True:
        try:
            url = f"{TELEGRAM_API_BASE}{token}/getUpdates?offset={offset}&timeout=15"
            async with httpx.AsyncClient(timeout=20) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    for update in data.get("result", []):
                        offset = update["update_id"] + 1
                        asyncio.create_task(handle_telegram_update(update, token))
                else:
                    logger.warning(f"Telegram polling error: {res.status_code}")
                    await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Telegram polling exception: {e}")
            await asyncio.sleep(3)

        await asyncio.sleep(0.5)
