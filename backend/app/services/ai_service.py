import json
import logging
import re
import random
from typing import Dict, Any, List, Optional
import httpx
from app.config import settings
from app.schemas import ClassificationResponse

logger = logging.getLogger("kural.ai_service")

# Emergency keywords across English, Tamil script, and Tanglish
EMERGENCY_KEYWORDS = [
    "fire", "தீ", "thee", "accident", "விபத்து", "vibathu",
    "medical", "ambulance", "ஆம்புலன்ஸ்", "threat to life",
    "gas leak", "gas", "explosion", "வெடி", "building collapse",
    "flood", "வெள்ளம்", "vellaam", "drowning", "electrocution",
    "shock", "மின் அதிர்ச்சி", "urgent emergency", "help emergency"
]

def check_emergency(text: str) -> bool:
    text_lower = text.lower()
    for kw in EMERGENCY_KEYWORDS:
        if kw in text_lower:
            return True
    return False

def mock_classify(text: str) -> ClassificationResponse:
    text_lower = text.lower()
    is_emerg = check_emergency(text_lower)

    # Language detection logic
    has_tamil_script = bool(re.search(r'[\u0B80-\u0BFF]', text))
    if has_tamil_script:
        lang = "ta"
    elif any(word in text_lower for word in ["varala", "illai", "saakkadai", "thanneer", "la", "ku", "nga", "romba", "irukku", "theriyuma"]):
        lang = "tanglish"
    else:
        lang = "en"

    # Category determination
    if any(k in text_lower for k in ["water", "thanneer", "தண்ணீர்", "tap", "pipe", "drainage", "supply", "kudineer", "குடிநீர்"]):
        category = "water_supply"
        department = "water_department"
        default_summary = "Citizen reports issue regarding water supply or pipe leakage."
    elif any(k in text_lower for k in ["road", "pothole", "saalai", "சாலை", "tar", "street", "bridge", "gundhum", "pit"]):
        category = "roads"
        department = "roads_department"
        default_summary = "Citizen reports damaged road or pothole hazard."
    elif any(k in text_lower for k in ["electricity", "power", "current", "minsaram", "மின்சாரம்", "light", "transformer", "wire", "pole"]):
        category = "electricity"
        department = "electricity_department"
        default_summary = "Citizen reports electricity outage or transformer issue."
    elif any(k in text_lower for k in ["sanitation", "garbage", "trash", "saakkadai", "சாக்கடை", "waste", "clean", "smell", "dump"]):
        category = "sanitation"
        department = "sanitation_department"
        default_summary = "Citizen reports uncollected garbage or sanitation issue."
    elif any(k in text_lower for k in ["police", "crime", "theft", "safety", "threat", "fight", "noise", "kaval"]):
        category = "police"
        department = "police_department"
        default_summary = "Citizen reports law and order or public safety issue."
    else:
        category = "civic_infrastructure"
        department = "roads_department"
        default_summary = f"Citizen complaint regarding public service: {text[:60]}"

    # Priority determination
    if is_emerg:
        priority = "critical"
    elif any(k in text_lower for k in ["urgent", "severe", "3 days", "4 days", "week", "overflow", "danger", "burst", "dark"]):
        priority = "high"
    elif any(k in text_lower for k in ["bad", "leaking", "2 days", "dirty"]):
        priority = "medium"
    else:
        priority = "medium"

    # Sentiment determination
    if any(k in text_lower for k in ["worst", "angry", "bad", "useless", "terrible", "waste", "shame"]):
        sentiment = "negative"
    elif any(k in text_lower for k in ["thank", "nandri", "good", "solved"]):
        sentiment = "positive"
    else:
        sentiment = "negative" if priority in ["high", "critical"] else "neutral"

    # Entity extraction mock
    ward_match = re.search(r'ward\s*(\d+)', text_lower)
    ward = f"Ward {ward_match.group(1)}" if ward_match else "Ward 18"
    
    duration_match = re.search(r'(\d+)\s*(days?|hours?|weeks?|naatkal|mani)', text_lower)
    duration = duration_match.group(0) if duration_match else "2 days"

    summary = text if len(text) <= 120 else f"{text[:117]}..."

    return ClassificationResponse(
        category=category,
        department=department,
        priority=priority,
        sentiment=sentiment,
        summary=summary or default_summary,
        confidence=0.92 if not is_emerg else 0.99,
        entities={
            "duration": duration,
            "ward": ward,
            "location_text": ward
        },
        is_emergency=is_emerg
    )

async def classify_complaint_ai(text: str) -> ClassificationResponse:
    """Classifies a complaint using OpenAI structured outputs, with keyword mock fallback."""
    is_emerg = check_emergency(text)

    if not settings.OPENAI_API_KEY:
        logger.info("OPENAI_API_KEY missing - using mock classifier.")
        res = mock_classify(text)
        if is_emerg:
            res.priority = "critical"
            res.is_emergency = True
        return res

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""
You are Kural AI, an intelligent government citizen grievance classifier. Analyze the following citizen complaint (which could be in English, Tamil, or Tanglish).

Complaint Text: "{text}"

Extract the following structured JSON output:
- category: one of [water_supply, roads, electricity, sanitation, police, civic_infrastructure]
- department: corresponding department name (e.g. water_department, roads_department, electricity_department, sanitation_department, police_department)
- priority: one of [low, medium, high, critical]
- sentiment: one of [positive, neutral, negative]
- summary: single plain language summary sentence in English describing the issue clearly
- confidence: float between 0.5 and 1.0
- entities: JSON object containing extracted fields like "duration", "ward", "location_text"
- is_emergency: boolean (true if immediate threat to life, fire, severe accident, active crime)

Return ONLY valid JSON matching this schema.
"""
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        
        data = json.loads(response.choices[0].message.content)
        
        # Override emergency if detected by keyword
        if is_emerg or data.get("is_emergency", False):
            data["priority"] = "critical"
            data["is_emergency"] = True

        return ClassificationResponse(
            category=data.get("category", "civic_infrastructure"),
            department=data.get("department", "roads_department"),
            priority=data.get("priority", "critical" if is_emerg else "medium"),
            sentiment=data.get("sentiment", "neutral"),
            summary=data.get("summary", text[:100]),
            confidence=float(data.get("confidence", 0.95)),
            entities=data.get("entities", {"ward": "Ward 18", "duration": "unspecified"}),
            is_emergency=is_emerg or data.get("is_emergency", False)
        )
    except Exception as e:
        logger.error(f"OpenAI Classification API call failed: {e}. Falling back to mock classifier.")
        res = mock_classify(text)
        if is_emerg:
            res.priority = "critical"
            res.is_emergency = True
        return res

async def generate_embedding(text: str) -> List[float]:
    """Generates a 1536-dimensional embedding vector via OpenAI text-embedding-3-small, or mock fallback."""
    if not settings.OPENAI_API_KEY:
        # Deterministic mock vector based on text hash
        random.seed(hash(text) % 1000000)
        vec = [random.uniform(-0.1, 0.1) for _ in range(1536)]
        # Normalize mock vector
        norm = sum(x*x for x in vec) ** 0.5
        return [x / norm for x in vec]
    
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Failed to generate embedding via OpenAI: {e}. Using deterministic mock vector.")
        random.seed(hash(text) % 1000000)
        vec = [random.uniform(-0.1, 0.1) for _ in range(1536)]
        norm = sum(x*x for x in vec) ** 0.5
        return [x / norm for x in vec]
