import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Complaint, Citizen, CallLog
from app.services.ai_service import classify_complaint_ai, check_emergency
from app.services.whatsapp_service import generate_complaint_code, get_or_create_citizen
from app.services.duplicate_service import check_duplicates
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("kural.call_service")

async def execute_voice_tool(
    tool_name: str,
    args: Dict[str, Any],
    db: AsyncSession,
    citizen_phone: str = "+919360708759"
) -> Dict[str, Any]:
    """
    Executes tool calls requested by the voice assistant / Realtime API.
    Defaults citizen_phone to +919360708759.
    """
    citizen = await get_or_create_citizen(db, citizen_phone)

    if tool_name == "create_complaint":
        raw_text = args.get("raw_text") or args.get("summary") or "Voice call complaint submission"
        classification = await classify_complaint_ai(raw_text)
        complaint_code = generate_complaint_code()

        comp = Complaint(
            complaint_code=complaint_code,
            citizen_id=citizen.id,
            channel="voice_call",
            category=args.get("category") or classification.category,
            department=classification.department,
            priority=args.get("priority") or classification.priority,
            sentiment=classification.sentiment,
            confidence=classification.confidence,
            summary=args.get("summary") or classification.summary,
            raw_text=raw_text,
            transcript=raw_text,
            language="en",
            lat=13.0827,
            lng=80.2707,
            status="open"
        )
        db.add(comp)
        await db.commit()
        await db.refresh(comp)

        # Broadcast live to WebSocket dashboard
        await ws_manager.broadcast("NEW_COMPLAINT", {
            "id": str(comp.id),
            "complaint_code": comp.complaint_code,
            "citizen_phone": citizen.phone,
            "channel": "voice_call",
            "category": comp.category,
            "department": comp.department,
            "priority": comp.priority,
            "sentiment": comp.sentiment,
            "confidence": comp.confidence,
            "summary": comp.summary,
            "transcript": comp.transcript,
            "status": comp.status,
            "created_at": comp.created_at.isoformat()
        })

        return {
            "status": "success",
            "complaint_code": comp.complaint_code,
            "department": comp.department,
            "priority": comp.priority,
            "message": f"Complaint registered under code {comp.complaint_code} for department {comp.department}."
        }

    elif tool_name == "get_complaint_status":
        code = args.get("complaint_code")
        stmt = select(Complaint).where(Complaint.complaint_code == code)
        res = await db.execute(stmt)
        comp = res.scalar_one_or_none()
        if comp:
            return {
                "found": True,
                "complaint_code": comp.complaint_code,
                "status": comp.status,
                "department": comp.department,
                "summary": comp.summary
            }
        return {"found": False, "message": f"No complaint found with code {code}."}

    elif tool_name == "get_citizen_history":
        stmt = select(Complaint).where(Complaint.citizen_id == citizen.id).order_by(Complaint.created_at.desc()).limit(5)
        res = await db.execute(stmt)
        complaints = res.scalars().all()
        return {
            "count": len(complaints),
            "complaints": [
                {"code": c.complaint_code, "status": c.status, "summary": c.summary}
                for c in complaints
            ]
        }

    elif tool_name == "find_similar_complaints":
        category = args.get("category", "water_supply")
        dup_res = await check_duplicates(db, summary="", embedding=[], category=category)
        return {"matched_count": len(dup_res.matches), "is_hotspot": len(dup_res.matches) >= 2}

    elif tool_name == "detect_emergency":
        transcript = args.get("transcript", "")
        is_emerg = check_emergency(transcript)
        return {"is_emergency": is_emerg, "priority_override": "critical" if is_emerg else "normal"}

    return {"error": f"Unknown tool: {tool_name}"}
