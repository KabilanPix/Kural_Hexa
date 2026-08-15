from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Citizen, Complaint
from app.schemas import ComplaintResponse

router = APIRouter(prefix="/api/citizens", tags=["Citizens"])

@router.get("/{phone}/complaints", response_model=List[ComplaintResponse])
async def get_citizen_complaint_history(phone: str, db: AsyncSession = Depends(get_db)):
    """Fetch complaint history for a specific citizen phone number."""
    clean_phone = phone.replace("telegram:", "").replace("whatsapp:", "").strip()
    stmt = select(Citizen).where(Citizen.phone == clean_phone)
    res = await db.execute(stmt)
    citizen = res.scalar_one_or_none()

    if not citizen:
        return []

    comp_stmt = select(Complaint).where(Complaint.citizen_id == citizen.id).order_by(Complaint.created_at.desc())
    comp_res = await db.execute(comp_stmt)
    complaints = comp_res.scalars().all()

    return [
        ComplaintResponse(
            id=c.id,
            complaint_code=c.complaint_code,
            citizen_id=c.citizen_id,
            citizen_phone=citizen.phone,
            channel=c.channel,
            category=c.category,
            department=c.department,
            priority=c.priority,
            sentiment=c.sentiment,
            confidence=c.confidence,
            summary=c.summary,
            raw_text=c.raw_text,
            transcript=c.transcript,
            language=c.language,
            lat=c.lat,
            lng=c.lng,
            status=c.status,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in complaints
    ]
