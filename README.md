# Kural — AI-Powered Citizen Call & Message Intelligence Platform

> **Hackathon Project for Governance & Civic Services**  
> Tagline: Real-Time Multilingual Citizen Grievance Intelligence Engine via WhatsApp & AI Voice.

---

## 🏛️ Project Overview

**Kural** is an AI-powered citizen grievance intelligence system. It allows citizens to submit civic complaints (water supply, roads, electricity, sanitation, police) via **WhatsApp** and **Voice Calls** in **English, Tamil, and Tanglish (romanized Tamil)**.

An async FastAPI + OpenAI pipeline automatically classifies, prioritizes, extracts entities, detects sentiment, routes to municipal departments, and deduplicates complaints using Supabase `pgvector` vector similarity. Results stream in real time over WebSockets to Next.js Officer and Admin dashboards.

---

## 🏗️ Architecture

```
                  CITIZEN
                     │
          ┌──────────┴──────────┐
          │                     │
       WhatsApp               Phone / Audio
   (Text/Media/Loc)             (Voice Call)
          │                     │
          └──────────┬──────────┘
                     ▼
             FASTAPI BACKEND
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
  AI Engine    Conversation   WebSocket
(OpenAI/Mock)    State Machine  Broadcaster
       │             │             │
       └─────────────┼─────────────┘
                     ▼
             Supabase PostgreSQL 
               (+ pgvector)
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   Officer Dashboard     Admin Dashboard
       (Next.js)             (Next.js)
```

---

## 🛠️ Setup Instructions (Supabase)

### 1. Configure Supabase Connection String
Open `backend/.env` and update `DATABASE_URL` with your Supabase Connection String (from Supabase Dashboard -> **Project Settings** -> **Database** -> **Connection string**):

```env
DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### 2. Backend Setup
Create virtual environment and install dependencies:
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
```

Seed initial departments and demo complaints directly into your Supabase database:
```bash
python -m app.seed
```

Run FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```
FastAPI interactive docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open Officer Dashboard at [http://localhost:3000](http://localhost:3000).  
Open Admin Analytics at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## 📄 License
Developed for Hackathon Demonstration.
