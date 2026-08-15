import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import text
from app.database import AsyncSessionLocal, engine, Base
from app.models import Department, Citizen, Complaint, Incident, incident_complaints
from app.services.ai_service import generate_embedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kural.seed")

DEPARTMENTS = [
    {"name": "water_department", "sla_hours": 24},
    {"name": "roads_department", "sla_hours": 72},
    {"name": "electricity_department", "sla_hours": 12},
    {"name": "sanitation_department", "sla_hours": 48},
    {"name": "police_department", "sla_hours": 6},
]

DEMO_CITIZENS = [
    {"phone": "+919876543210", "name": "Kabilan R", "language_pref": "ta"},
    {"phone": "+919840123456", "name": "Anitha S", "language_pref": "en"},
    {"phone": "+919176987654", "name": "Murugan K", "language_pref": "tanglish"},
]

DEMO_COMPLAINTS = [
    {
        "complaint_code": "KR-2026-004821",
        "phone": "+919876543210",
        "channel": "telegram",
        "category": "water_supply",
        "department": "water_department",
        "priority": "critical",
        "sentiment": "negative",
        "confidence": 0.96,
        "summary": "Main water pipeline burst near T. Nagar market causing heavy street flooding and zero tap supply.",
        "raw_text": "T. Nagar market la water pipe burst aagidichu! Full flood irukku, kudineer varala 2 days ah. Emergency repair kudunga!",
        "language": "tanglish",
        "lat": 13.0418,
        "lng": 80.2341,
        "status": "open"
    },
    {
        "complaint_code": "KR-2026-004822",
        "phone": "+919840123456",
        "channel": "telegram",
        "category": "water_supply",
        "department": "water_department",
        "priority": "high",
        "sentiment": "negative",
        "confidence": 0.93,
        "summary": "Water supply completely cut off in Ward 18 residential area for past 48 hours.",
        "raw_text": "No drinking water supply in Ward 18 since yesterday morning. Please look into this urgently.",
        "language": "en",
        "lat": 13.0425,
        "lng": 80.2350,
        "status": "in_progress"
    },
    {
        "complaint_code": "KR-2026-004823",
        "phone": "+919176987654",
        "channel": "telegram",
        "category": "roads",
        "department": "roads_department",
        "priority": "high",
        "sentiment": "negative",
        "confidence": 0.91,
        "summary": "Dangerous 4-foot deep pothole on Velachery Main Road near bus stop causing bike accidents.",
        "raw_text": "வேளச்சேரி மெயின் ரோட்டில் மிகப்பெரிய குழி உள்ளது. இருசக்கர வாகனங்கள் விபத்துக்குள்ளாகின்றன. உடனே சீரமைக்கவும்.",
        "language": "ta",
        "lat": 12.9815,
        "lng": 80.2180,
        "status": "open"
    },
    {
        "complaint_code": "KR-2026-004824",
        "phone": "+919876543210",
        "channel": "voice_call",
        "category": "electricity",
        "department": "electricity_department",
        "priority": "critical",
        "sentiment": "negative",
        "confidence": 0.98,
        "summary": "High voltage transformer sparks and power outage in Anna Nagar Ward 10.",
        "raw_text": "Transformer sparking with loud noise near 5th Avenue Anna Nagar. Power is completely down.",
        "language": "en",
        "lat": 13.0850,
        "lng": 80.2101,
        "status": "in_progress"
    },
    {
        "complaint_code": "KR-2026-004825",
        "phone": "+919840123456",
        "channel": "telegram",
        "category": "sanitation",
        "department": "sanitation_department",
        "priority": "medium",
        "sentiment": "neutral",
        "confidence": 0.88,
        "summary": "Garbage dump uncleared for 3 days near Adyar canal bridge.",
        "raw_text": "Garbage overflow near Adyar bridge. Smells bad, please clear garbage bins.",
        "language": "en",
        "lat": 13.0064,
        "lng": 80.2570,
        "status": "resolved"
    }
]

async def seed_database():
    logger.info("Starting Supabase database seeding...")
    async with engine.begin() as conn:
        # Enable extensions on Supabase if not present
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector;'))
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Supabase schema & extensions initialized.")

    async with AsyncSessionLocal() as db:
        # Seed Departments
        for d in DEPARTMENTS:
            existing = await db.execute(Base.metadata.tables["departments"].select().where(Base.metadata.tables["departments"].c.name == d["name"]))
            if not existing.first():
                dept = Department(name=d["name"], sla_hours=d["sla_hours"])
                db.add(dept)
        await db.commit()
        logger.info("Departments seeded.")

        # Seed Citizens
        citizen_map = {}
        for c_data in DEMO_CITIZENS:
            existing = await db.execute(Base.metadata.tables["citizens"].select().where(Base.metadata.tables["citizens"].c.phone == c_data["phone"]))
            row = existing.first()
            if not row:
                cit = Citizen(phone=c_data["phone"], name=c_data["name"], language_pref=c_data["language_pref"])
                db.add(cit)
                await db.flush()
                citizen_map[c_data["phone"]] = cit.id
            else:
                citizen_map[c_data["phone"]] = row[0]
        await db.commit()
        logger.info("Citizens seeded.")

        # Seed Complaints
        created_complaints = []
        for comp_data in DEMO_COMPLAINTS:
            existing = await db.execute(Base.metadata.tables["complaints"].select().where(Base.metadata.tables["complaints"].c.complaint_code == comp_data["complaint_code"]))
            if not existing.first():
                emb = await generate_embedding(comp_data["summary"])
                comp = Complaint(
                    complaint_code=comp_data["complaint_code"],
                    citizen_id=citizen_map[comp_data["phone"]],
                    channel=comp_data["channel"],
                    category=comp_data["category"],
                    department=comp_data["department"],
                    priority=comp_data["priority"],
                    sentiment=comp_data["sentiment"],
                    confidence=comp_data["confidence"],
                    summary=comp_data["summary"],
                    raw_text=comp_data["raw_text"],
                    transcript=comp_data["raw_text"] if comp_data["channel"] == "voice_call" else None,
                    language=comp_data["language"],
                    lat=comp_data["lat"],
                    lng=comp_data["lng"],
                    status=comp_data["status"],
                    embedding=emb
                )
                db.add(comp)
                created_complaints.append(comp)
        await db.commit()
        logger.info("Demo Complaints seeded.")

        # Create fused incident for duplicate water supply complaints
        if len(created_complaints) >= 2:
            inc = Incident(
                category="water_supply",
                ward="Ward 18",
                complaint_count=2,
                status="open",
                ai_note="2 high-priority water pipeline outage complaints reported in Ward 18 in last 24 hours."
            )
            db.add(inc)
            await db.flush()

            c1 = created_complaints[0]
            c2 = created_complaints[1]
            await db.execute(
                incident_complaints.insert().values([
                    {"incident_id": inc.id, "complaint_id": c1.id},
                    {"incident_id": inc.id, "complaint_id": c2.id}
                ])
            )
            await db.commit()
            logger.info("Demo Incident fused.")

    logger.info("Supabase database seeding finished successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
