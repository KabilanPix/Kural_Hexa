import logging
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, update
from app.models import Complaint, Incident, incident_complaints
from app.schemas import DuplicateMatchItem, DuplicateCheckResponse

logger = logging.getLogger("kural.duplicate_service")

def compute_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Computes cosine similarity between two 1536-dim vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = sum(a * a for a in vec1) ** 0.5
    norm2 = sum(b * b for b in vec2) ** 0.5
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)

async def check_duplicates(
    db: AsyncSession,
    summary: str,
    embedding: List[float],
    category: str,
    ward: Optional[str] = "Ward 18",
    threshold: float = 0.85
) -> DuplicateCheckResponse:
    """Performs cosine similarity search against complaints in the last 7 days."""
    cutoff = datetime.utcnow() - timedelta(days=7)
    
    # Query recent complaints in the same category
    stmt = select(Complaint).where(
        Complaint.category == category,
        Complaint.created_at >= cutoff
    )
    result = await db.execute(stmt)
    recent_complaints = result.scalars().all()

    matches: List[DuplicateMatchItem] = []
    for comp in recent_complaints:
        if comp.embedding is not None:
            # Convert embedding vector if needed
            comp_vector = list(comp.embedding) if hasattr(comp.embedding, '__iter__') else []
            sim = compute_cosine_similarity(embedding, comp_vector)
        else:
            # Fallback text similarity if embedding vector missing
            sim = 0.88 if comp.category == category and (comp.summary and summary in comp.summary or comp.summary in summary) else 0.70

        if sim >= threshold:
            matches.append(DuplicateMatchItem(
                complaint_id=str(comp.id),
                complaint_code=comp.complaint_code,
                summary=comp.summary or comp.raw_text or "",
                category=comp.category,
                similarity=round(sim, 3)
            ))

    matches.sort(key=lambda x: x.similarity, reverse=True)
    return DuplicateCheckResponse(
        is_duplicate=len(matches) > 0,
        matches=matches
    )

async def fuse_incident_if_duplicate(
    db: AsyncSession,
    new_complaint: Complaint,
    summary: str,
    embedding: List[float],
    category: str,
    ward: Optional[str] = "Ward 18"
) -> Optional[Incident]:
    """
    Checks for vector similarity > 0.85. If found, attaches new complaint to existing incident
    (or creates a new incident) and updates incident complaint count and ai_note.
    """
    dup_res = await check_duplicates(db, summary, embedding, category, ward, threshold=0.85)

    if not dup_res.is_duplicate or not dup_res.matches:
        return None

    best_match_id = dup_res.matches[0].complaint_id
    stmt = select(Complaint).where(Complaint.id == best_match_id)
    matched_complaint_res = await db.execute(stmt)
    matched_complaint = matched_complaint_res.scalar_one_or_none()

    if not matched_complaint:
        return None

    # Check if matched complaint is already linked to an incident
    incident_query = select(Incident).join(incident_complaints).where(
        incident_complaints.c.complaint_id == matched_complaint.id
    )
    inc_res = await db.execute(incident_query)
    incident = inc_res.scalar_one_or_none()

    if not incident:
        # Create a new fused incident
        incident = Incident(
            category=category,
            ward=ward or "Ward 18",
            complaint_count=2,
            status="open",
            ai_note=f"2 reports of {category.replace('_', ' ')} in {ward or 'Ward 18'} in the last 2 days."
        )
        db.add(incident)
        await db.flush()

        # Link matched complaint and new complaint
        await db.execute(
            incident_complaints.insert().values([
                {"incident_id": incident.id, "complaint_id": matched_complaint.id},
                {"incident_id": incident.id, "complaint_id": new_complaint.id}
            ])
        )
    else:
        # Attach to existing incident
        incident.complaint_count += 1
        incident.ai_note = f"{incident.complaint_count} reports of {category.replace('_', ' ')} in {ward or 'Ward 18'} in the last 2 days."
        
        # Link new complaint
        await db.execute(
            incident_complaints.insert().values(
                {"incident_id": incident.id, "complaint_id": new_complaint.id}
            )
        )

    await db.commit()
    await db.refresh(incident)
    logger.info(f"Fused complaint {new_complaint.complaint_code} into Incident {incident.id}. Count: {incident.complaint_count}")
    return incident
