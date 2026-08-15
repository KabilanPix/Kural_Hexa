from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Incident, Complaint
from app.schemas import IncidentResponse, ComplaintResponse

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentResponse])
async def list_incidents(db: AsyncSession = Depends(get_db)):
    """List all fused incidents with their linked complaints count."""
    stmt = select(Incident).options(selectinload(Incident.complaints)).order_by(Incident.created_at.desc())
    res = await db.execute(stmt)
    incidents = res.scalars().all()

    output = []
    for inc in incidents:
        output.append(IncidentResponse(
            id=inc.id,
            category=inc.category,
            ward=inc.ward,
            complaint_count=inc.complaint_count,
            status=inc.status,
            ai_note=inc.ai_note,
            created_at=inc.created_at,
            complaints=[
                ComplaintResponse(
                    id=c.id,
                    complaint_code=c.complaint_code,
                    citizen_id=c.citizen_id,
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
                for c in inc.complaints
            ]
        ))
    return output

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident_detail(incident_id: UUID, db: AsyncSession = Depends(get_db)):
    """Fetch detail for a single incident and all linked complaints."""
    stmt = select(Incident).options(selectinload(Incident.complaints)).where(Incident.id == incident_id)
    res = await db.execute(stmt)
    inc = res.scalar_one_or_none()

    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    return IncidentResponse(
        id=inc.id,
        category=inc.category,
        ward=inc.ward,
        complaint_count=inc.complaint_count,
        status=inc.status,
        ai_note=inc.ai_note,
        created_at=inc.created_at,
        complaints=[
            ComplaintResponse(
                id=c.id,
                complaint_code=c.complaint_code,
                citizen_id=c.citizen_id,
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
            for c in inc.complaints
        ]
    )
