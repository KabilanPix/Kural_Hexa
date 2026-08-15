import logging
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models import Complaint, Citizen
from app.schemas import ComplaintCreate, ComplaintUpdate, ComplaintResponse
from app.services.ai_service import classify_complaint_ai, generate_embedding
from app.services.whatsapp_service import generate_complaint_code, get_or_create_citizen
from app.services.duplicate_service import fuse_incident_if_duplicate
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("kural.router.complaints")
router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

@router.post("", response_model=ComplaintResponse)
async def create_complaint(req: ComplaintCreate, db: AsyncSession = Depends(get_db)):
    """Create a new citizen complaint manually via REST API."""
    citizen = await get_or_create_citizen(db, req.phone, req.name)
    classification = await classify_complaint_ai(req.raw_text)
    embedding = await generate_embedding(classification.summary)
    complaint_code = generate_complaint_code()

    comp = Complaint(
        complaint_code=complaint_code,
        citizen_id=citizen.id,
        channel=req.channel,
        category=classification.category,
        department=classification.department,
        priority=classification.priority,
        sentiment=classification.sentiment,
        confidence=classification.confidence,
        summary=classification.summary,
        raw_text=req.raw_text,
        transcript=req.transcript,
        language="en",
        lat=req.lat or 13.0827,
        lng=req.lng or 80.2707,
        status="open",
        embedding=embedding
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)

    # Fuse with incident if duplicate
    await fuse_incident_if_duplicate(
        db=db,
        new_complaint=comp,
        summary=classification.summary,
        embedding=embedding,
        category=classification.category,
        ward=classification.entities.get("ward", "Ward 18")
    )

    # Broadcast via WebSockets
    payload = {
        "id": str(comp.id),
        "complaint_code": comp.complaint_code,
        "citizen_phone": citizen.phone,
        "channel": comp.channel,
        "category": comp.category,
        "department": comp.department,
        "priority": comp.priority,
        "sentiment": comp.sentiment,
        "confidence": comp.confidence,
        "summary": comp.summary,
        "raw_text": comp.raw_text,
        "language": comp.language,
        "lat": comp.lat,
        "lng": comp.lng,
        "status": comp.status,
        "created_at": comp.created_at.isoformat(),
        "entities": classification.entities
    }
    await ws_manager.broadcast("NEW_COMPLAINT", payload)

    return ComplaintResponse(
        id=comp.id,
        complaint_code=comp.complaint_code,
        citizen_id=comp.citizen_id,
        citizen_phone=citizen.phone,
        channel=comp.channel,
        category=comp.category,
        department=comp.department,
        priority=comp.priority,
        sentiment=comp.sentiment,
        confidence=comp.confidence,
        summary=comp.summary,
        raw_text=comp.raw_text,
        transcript=comp.transcript,
        language=comp.language,
        lat=comp.lat,
        lng=comp.lng,
        status=comp.status,
        created_at=comp.created_at,
        updated_at=comp.updated_at,
        entities=classification.entities
    )

@router.get("", response_model=List[ComplaintResponse])
async def list_complaints(
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List and filter complaints by category, priority, status, department, or keyword search."""
    stmt = select(Complaint, Citizen.phone).join(Citizen, Complaint.citizen_id == Citizen.id)

    if category:
        stmt = stmt.where(Complaint.category == category)
    if priority:
        stmt = stmt.where(Complaint.priority == priority)
    if status:
        stmt = stmt.where(Complaint.status == status)
    if department:
        stmt = stmt.where(Complaint.department == department)
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where((Complaint.summary.ilike(search_pattern)) | (Complaint.complaint_code.ilike(search_pattern)))

    stmt = stmt.order_by(Complaint.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    rows = res.all()

    output = []
    for comp, phone in rows:
        output.append(ComplaintResponse(
            id=comp.id,
            complaint_code=comp.complaint_code,
            citizen_id=comp.citizen_id,
            citizen_phone=phone,
            channel=comp.channel,
            category=comp.category,
            department=comp.department,
            priority=comp.priority,
            sentiment=comp.sentiment,
            confidence=comp.confidence,
            summary=comp.summary,
            raw_text=comp.raw_text,
            transcript=comp.transcript,
            language=comp.language,
            lat=comp.lat,
            lng=comp.lng,
            status=comp.status,
            created_at=comp.created_at,
            updated_at=comp.updated_at
        ))
    return output

@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(complaint_id: UUID, db: AsyncSession = Depends(get_db)):
    """Fetch single complaint by UUID."""
    stmt = select(Complaint, Citizen.phone).join(Citizen, Complaint.citizen_id == Citizen.id).where(Complaint.id == complaint_id)
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")

    comp, phone = row
    return ComplaintResponse(
        id=comp.id,
        complaint_code=comp.complaint_code,
        citizen_id=comp.citizen_id,
        citizen_phone=phone,
        channel=comp.channel,
        category=comp.category,
        department=comp.department,
        priority=comp.priority,
        sentiment=comp.sentiment,
        confidence=comp.confidence,
        summary=comp.summary,
        raw_text=comp.raw_text,
        transcript=comp.transcript,
        language=comp.language,
        lat=comp.lat,
        lng=comp.lng,
        status=comp.status,
        created_at=comp.created_at,
        updated_at=comp.updated_at
    )

@router.patch("/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint_status(complaint_id: UUID, update_data: ComplaintUpdate, db: AsyncSession = Depends(get_db)):
    """Update complaint status (open, in_progress, resolved, escalated) or department."""
    stmt = select(Complaint, Citizen.phone).join(Citizen, Complaint.citizen_id == Citizen.id).where(Complaint.id == complaint_id)
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")

    comp, phone = row
    if update_data.status:
        comp.status = update_data.status
    if update_data.department:
        comp.department = update_data.department
    if update_data.priority:
        comp.priority = update_data.priority

    await db.commit()
    await db.refresh(comp)

    # Broadcast updated status to WebSockets
    payload = {
        "id": str(comp.id),
        "complaint_code": comp.complaint_code,
        "status": comp.status,
        "department": comp.department,
        "priority": comp.priority
    }
    await ws_manager.broadcast("COMPLAINT_UPDATED", payload)

    return ComplaintResponse(
        id=comp.id,
        complaint_code=comp.complaint_code,
        citizen_id=comp.citizen_id,
        citizen_phone=phone,
        channel=comp.channel,
        category=comp.category,
        department=comp.department,
        priority=comp.priority,
        sentiment=comp.sentiment,
        confidence=comp.confidence,
        summary=comp.summary,
        raw_text=comp.raw_text,
        transcript=comp.transcript,
        language=comp.language,
        lat=comp.lat,
        lng=comp.lng,
        status=comp.status,
        created_at=comp.created_at,
        updated_at=comp.updated_at
    )
