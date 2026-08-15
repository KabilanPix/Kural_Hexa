import logging
import random
import re
from datetime import datetime
from typing import Tuple, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from twilio.twiml.messaging_response import MessagingResponse

from app.models import Citizen, Complaint
from app.services.ai_service import classify_complaint_ai, generate_embedding
from app.services.duplicate_service import fuse_incident_if_duplicate
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("kural.whatsapp_service")

def generate_complaint_code() -> str:
    year = datetime.utcnow().year
    number = random.randint(100000, 999999)
    return f"KR-{year}-{number}"

def format_twiml_response(text: str) -> str:
    resp = MessagingResponse()
    resp.message(text)
    return str(resp)

async def get_or_create_citizen(db: AsyncSession, phone: str, name: Optional[str] = "Citizen") -> Citizen:
    clean_phone = phone.replace("whatsapp:", "").strip()
    stmt = select(Citizen).where(Citizen.phone == clean_phone)
    res = await db.execute(stmt)
    citizen = res.scalar_one_or_none()

    if not citizen:
        citizen = Citizen(
            phone=clean_phone,
            name=name or "Citizen",
            language_pref="en"
        )
        db.add(citizen)
        await db.commit()
        await db.refresh(citizen)
        logger.info(f"Created new citizen record for phone {clean_phone}")
    return citizen

async def process_whatsapp_message(
    db: AsyncSession,
    from_phone: str,
    body: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    media_url: Optional[str] = None
) -> str:
    clean_phone = from_phone.replace("whatsapp:", "").strip()
    citizen = await get_or_create_citizen(db, clean_phone)
    text_upper = body.strip().upper()

    # Menu request
    if text_upper in ["HI", "HELLO", "MENU", "HELP", "VANAKKAM", "1"]:
        menu_text = (
            "🏛️ *Welcome to Kural Citizen Grievance Portal*\n\n"
            "How can we assist you today?\n"
            "• Simply type your complaint (in English, Tamil, or Tanglish) e.g., _\"No water supply in Ward 18 for 2 days\"_\n"
            "• Type *TRACK <Code>* (e.g. `TRACK KR-2026-004821`) to check status\n"
            "• Type *MY COMPLAINTS* to view your active complaints\n"
            "• Send a photo, voice note, or location pin directly!\n"
            "• Type *EMERGENCY* for urgent life-safety issues"
        )
        return format_twiml_response(menu_text)

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
                return format_twiml_response(track_text)
            else:
                return format_twiml_response(f"❌ Complaint code `{code}` not found. Please verify and try again.")
        else:
            return format_twiml_response("⚠️ Please provide a valid complaint code in format `TRACK KR-YYYY-NNNNNN`.")

    # My Complaints flow
    if text_upper in ["MY COMPLAINTS", "3", "HISTORY"]:
        stmt = select(Complaint).where(Complaint.citizen_id == citizen.id).order_by(Complaint.created_at.desc()).limit(5)
        res = await db.execute(stmt)
        complaints = res.scalars().all()

        if not complaints:
            return format_twiml_response("ℹ️ You have no registered complaints yet. Type any issue to submit one!")

        lines = ["📋 *Your Recent Complaints:*"]
        for c in complaints:
            status_badge = "🟢" if c.status == "resolved" else "🟡" if c.status == "in_progress" else "🔴"
            lines.append(f"\n• *{c.complaint_code}* {status_badge} [{c.priority.upper()}]\n  Dept: {c.department.replace('_', ' ').title()}\n  Summary: {c.summary[:50]}...")
        
        lines.append("\nType *TRACK <Code>* for full details.")
        return format_twiml_response("\n".join(lines))

    # Emergency Flow
    if text_upper == "EMERGENCY":
        return format_twiml_response(
            "🚨 *EMERGENCY RESPONSE TRIGGERED*\n\n"
            "If this is an immediate threat to life, fire, or severe accident, emergency teams are being alerted.\n"
            "Please describe your urgent situation immediately or call 112."
        )

    # Free-Text Complaint Ingestion Pipeline
    classification = await classify_complaint_ai(body)
    embedding = await generate_embedding(classification.summary)
    complaint_code = generate_complaint_code()

    new_complaint = Complaint(
        complaint_code=complaint_code,
        citizen_id=citizen.id,
        channel="whatsapp",
        category=classification.category,
        department=classification.department,
        priority=classification.priority,
        sentiment=classification.sentiment,
        confidence=classification.confidence,
        summary=classification.summary,
        raw_text=body,
        language="ta" if re.search(r'[\u0B80-\u0BFF]', body) else "en",
        lat=latitude or 13.0827, # Default Chennai lat if null
        lng=longitude or 80.2707, # Default Chennai lng if null
        status="open",
        embedding=embedding
    )

    db.add(new_complaint)
    await db.commit()
    await db.refresh(new_complaint)

    # Fuse with existing incident if duplicate (similarity > 0.85)
    fused_incident = await fuse_incident_if_duplicate(
        db,
        new_complaint=new_complaint,
        summary=classification.summary,
        embedding=embedding,
        category=classification.category,
        ward=classification.entities.get("ward", "Ward 18")
    )

    # Broadcast real-time update to dashboard WebSockets
    dashboard_payload = {
        "id": str(new_complaint.id),
        "complaint_code": new_complaint.complaint_code,
        "citizen_phone": citizen.phone,
        "channel": new_complaint.channel,
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

    # Construct response TwiML
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

    return format_twiml_response(reply_msg)
