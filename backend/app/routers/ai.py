from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import ClassificationRequest, ClassificationResponse, DuplicateCheckRequest, DuplicateCheckResponse
from app.services.ai_service import classify_complaint_ai, generate_embedding
from app.services.duplicate_service import check_duplicates

router = APIRouter(prefix="/api/ai", tags=["AI Engine"])

@router.post("/classify", response_model=ClassificationResponse)
async def classify_text(req: ClassificationRequest):
    """
    Classifies raw complaint text (English, Tamil, Tanglish) into structured JSON contract.
    Enforces emergency keyword detection overrides.
    """
    return await classify_complaint_ai(req.text)

@router.post("/duplicate-check", response_model=DuplicateCheckResponse)
async def duplicate_check(req: DuplicateCheckRequest, db: AsyncSession = Depends(get_db)):
    """
    Performs vector similarity search against existing complaints from the last 7 days.
    Returns matched complaints above 0.85 similarity threshold.
    """
    summary_text = req.text or ""
    embedding = req.embedding or []

    if not embedding and summary_text:
        embedding = await generate_embedding(summary_text)

    return await check_duplicates(
        db=db,
        summary=summary_text,
        embedding=embedding,
        category=req.category or "water_supply",
        ward=req.ward or "Ward 18",
        threshold=0.85
    )
