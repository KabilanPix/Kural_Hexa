# Kural — API & Tech Stack Document

## 1. Architecture Overview

```
                 CITIZEN
                    │
          ┌─────────┴─────────┐
          │                   │
       WhatsApp             Phone Call
          │                   │
          ▼                   ▼
       TWILIO              TWILIO VOICE
          │                   │
          │                   │  Media Stream
          └─────────┬─────────┘
                    ▼
              KURAL FASTAPI BACKEND
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
     AI ENGINE   Conversation  Notification
     (OpenAI)      Manager       Service
          │
          ▼
     PostgreSQL + pgvector
          │
   ┌──────┴───────┐
   ▼               ▼
Officer/Admin   WhatsApp
Dashboard       Status Push
(Next.js)
```

Twilio = communication infrastructure (ears). OpenAI = understanding layer (brain). FastAPI = orchestration (nervous system). PostgreSQL = memory. Next.js dashboards = control center.

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Citizen messaging | Twilio WhatsApp API | Sandbox for demo, Business API noted for production |
| Citizen calls | Twilio Programmable Voice + Media Streams | Streams raw call audio over WebSocket |
| Voice conversation AI | OpenAI Realtime API | Speech-to-speech, low latency |
| Text/NLP intelligence | OpenAI API (chat completions) | Classification, summary, extraction |
| Embeddings / duplicate detection | OpenAI embeddings + pgvector | Cosine similarity search |
| Backend | FastAPI (Python) | Async, WebSocket-native |
| Database | PostgreSQL + pgvector extension | |
| Frontend | Next.js + Tailwind CSS | Officer + Admin dashboards |
| Real-time dashboard updates | WebSockets (FastAPI native) | Push new complaints without refresh |
| Maps / heatmap | Mapbox or Google Maps JS SDK | |
| Dev tunneling | ngrok | For Twilio webhook access during dev |
| Hosting | Railway or Render | Fast deploy for hackathon timelines |

## 3. Data Model

```sql
citizens (
  id UUID PRIMARY KEY,
  phone TEXT UNIQUE,
  name TEXT,
  language_pref TEXT,
  created_at TIMESTAMP
)

complaints (
  id TEXT PRIMARY KEY,          -- e.g. KR-2026-004821
  citizen_id UUID REFERENCES citizens(id),
  category TEXT,
  department TEXT,
  priority TEXT,                -- low | medium | high | critical
  sentiment TEXT,
  summary TEXT,
  confidence FLOAT,
  transcript TEXT,
  lat FLOAT,
  lng FLOAT,
  status TEXT,                  -- open | in_progress | resolved
  embedding VECTOR(1536),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

incidents (
  id UUID PRIMARY KEY,
  category TEXT,
  ward TEXT,
  complaint_count INT,
  status TEXT,
  created_at TIMESTAMP
)

incident_complaints (
  incident_id UUID REFERENCES incidents(id),
  complaint_id TEXT REFERENCES complaints(id)
)

departments (
  id UUID PRIMARY KEY,
  name TEXT,
  sla_hours INT
)

call_logs (
  id UUID PRIMARY KEY,
  citizen_id UUID REFERENCES citizens(id),
  transcript TEXT,
  language TEXT,
  duration INT,
  created_at TIMESTAMP
)
```

## 4. API Endpoints

```
/api
├── /whatsapp
│   ├── POST /webhook              → inbound WhatsApp message handler
│   └── POST /webhook/status       → delivery status callback
│
├── /voice
│   ├── POST /incoming             → returns TwiML, connects call to stream
│   └── WS   /stream                → bidirectional audio ↔ Realtime AI
│
├── /complaints
│   ├── POST /                     → create complaint
│   ├── GET  /{id}                 → fetch complaint
│   ├── PATCH /{id}                → update status
│   └── GET  /                     → list/filter complaints
│
├── /citizens
│   └── GET /{phone}/complaints    → citizen complaint history
│
├── /incidents
│   ├── GET /                      → list fused incidents
│   └── GET /{id}                  → incident detail + linked complaints
│
├── /ai
│   ├── POST /classify             → category + confidence
│   ├── POST /summarize
│   ├── POST /extract-entities
│   ├── POST /sentiment
│   ├── POST /route-department
│   ├── POST /duplicate-check      → embedding similarity search
│   └── POST /predict-trend        → recurring issue / hotspot detection
│
├── /dashboard
│   ├── GET /stats                 → KPI strip data
│   ├── GET /trends                → time-series by category/ward
│   ├── GET /hotspots               → heatmap data
│   └── GET /sla                   → SLA breach status
│
└── /notify
    └── POST /whatsapp-update      → outbound status push to citizen
```

## 5. AI Service Contract

Every complaint (regardless of channel) is normalized into text, then sent through one structured-output AI call:

**Input:** raw text (transcribed if audio) + optional image
**Output (strict JSON):**
```json
{
  "category": "water_supply",
  "department": "water_department",
  "priority": "high",
  "sentiment": "negative",
  "summary": "Citizen reports no water supply since yesterday in Ward 18.",
  "entities": {
    "location": "Ward 18",
    "duration": "1 day"
  },
  "confidence": 0.94,
  "is_emergency": false
}
```

This same schema powers WhatsApp responses, voice call tool-results, and dashboard rendering — one contract, three surfaces.

## 6. Voice AI Tool Definitions (Realtime API)

```
create_complaint(category, summary, location, priority)
get_complaint_status(complaint_id)
get_citizen_history(citizen_id)
find_similar_complaints(category, location)
detect_emergency(transcript)
recommend_department(category)
```

The Realtime model never touches the database directly — it only calls these backend tools, which enforce validation and write to Postgres. This separation is a key architecture talking point for judges.

## 7. Environment Variables

```
OPENAI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
TWILIO_VOICE_NUMBER=
DATABASE_URL=
MAPBOX_TOKEN=
PUBLIC_BASE_URL=        # ngrok URL during dev
```
