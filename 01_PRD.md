# Kural — Product Requirements Document

**Tagline:** AI-Powered Citizen Call & Message Intelligence Platform
**Event:** Hexaware Mavericks Hackathon
**Judging criteria:** Completeness of technical execution, features implemented, innovation

---

## 1. Problem Statement

Government organizations receive thousands of citizen calls every day through helplines, grievance cells, municipal offices, electricity boards, water departments, transport authorities, healthcare services, police control rooms, and disaster management centers. Most calls are manually recorded and forwarded, leading to delays, duplicate complaints, poor tracking, and limited visibility into recurring public issues.

**Design and develop an AI-powered Citizen Call Intelligence Platform** that captures and analyzes incoming calls in real time, automatically identifies citizen issues, classifies complaints, generates summaries, recommends the appropriate department, tracks resolution progress, and provides actionable insights to government officials. The platform should reduce manual intervention, improve response times, enhance citizen satisfaction, and support data-driven governance.

## 2. Objectives (from brief, mapped to Kural)

| Brief objective | Kural implementation |
|---|---|
| Record and transcribe incoming calls | Twilio Voice + Media Streams → OpenAI Realtime / Whisper transcription |
| Automatically classify complaints | OpenAI classification pipeline, structured JSON output |
| Prioritize emergency cases | Intent + keyword emergency detection → instant escalation |
| Recommend the appropriate department | AI department-routing engine |
| Detect duplicate complaints | OpenAI embeddings + pgvector similarity search |
| Track complaint lifecycle | Postgres status state machine, citizen-facing tracking |
| Provide dashboards and analytics | Officer + Admin dashboards, SLA, heatmap, trends |
| Predict recurring issues using AI | Trend-based hotspot/recurrence detection |

## 3. Interpretation Notes (state these explicitly to judges)

- **"Citizen Portal"** is interpreted as *the lowest-friction citizen access channel*, not a mandated native app. Kural uses **WhatsApp** as the citizen portal — zero install, works on any phone, matches how citizens already communicate. Voice calling is offered as a second, equally-weighted channel per the original problem statement.
- Both channels feed the **same backend, same AI engine, same database** — proving the architecture is channel-agnostic and production-extensible.

## 4. Target Users / Personas

1. **Citizen** — reports an issue via WhatsApp or phone call, in English, Tamil, or Tanglish. Wants speed and simplicity, no forms.
2. **Call Center / Officer** — monitors live incoming complaints and calls, updates status, needs AI to pre-triage so they don't read/listen to everything raw.
3. **Administrator** — needs department-level analytics, SLA compliance, hotspot/trend visibility for resource allocation and governance reporting.

## 5. Scope

### 5.1 Core (must be fully working and demoed live)
- WhatsApp intake: menu flow + free-text NLP complaint capture
- Photo complaint intake (image → AI classification)
- Voice-note complaint intake (audio → transcription → same pipeline)
- Location capture (WhatsApp live location → lat/long)
- Complaint tracking by ID and by phone number
- AI pipeline: classification, priority, sentiment, summary, department routing, confidence score
- Duplicate detection (embedding similarity)
- Incident fusion (clustering related complaints)
- Officer Dashboard: live complaint feed with AI fields, status updates, map pins
- Multilingual demo: English, Tamil, Tanglish

### 5.2 Stretch (build after Core is demo-stable)
- Live phone call via Twilio Media Streams + OpenAI Realtime, with tool-calling (`create_complaint`, `get_complaint_status`, `get_citizen_history`, `detect_emergency`, `find_similar_complaints`)
- Admin Dashboard: department analytics, trends over time
- SLA monitoring: countdown timers, breach alerts
- Heat map of complaint density
- Predictive recurring-issue detection (trend-based)
- WhatsApp outbound status notifications
- SLA breach alerts to officers/admins

### 5.3 Out of scope (say so if asked)
- Production WhatsApp Business API onboarding (Sandbox used for demo; call out the swap path)
- Multi-tenant / multi-city support
- Authentication/RBAC hardening beyond basic login for dashboards
- Payment or in-person service integration

## 6. Functional Requirements (detailed)

**FR1 — WhatsApp Intake**
System shall receive inbound WhatsApp messages via Twilio webhook, identify or create a citizen record by phone number, maintain conversation state, and support: greeting menu, free-text complaint, photo, voice note, location share, track-by-ID, and "my complaints" history.

**FR2 — Voice Intake**
System shall accept inbound calls via Twilio Voice, stream audio to a WebSocket, connect to OpenAI Realtime for conversational handling in English/Tamil/Tanglish, and expose backend tools for the model to call.

**FR3 — AI Classification Pipeline**
Given a complaint text (from any channel), the system shall return: category, department, priority (low/medium/high/critical), sentiment, confidence score, structured summary, and extracted entities (location, duration, ward).

**FR4 — Duplicate & Incident Detection**
System shall embed each complaint summary, compare against recent complaints via vector similarity, and either attach to an existing incident or create a new one above a similarity threshold.

**FR5 — Complaint Lifecycle**
Complaints move through states: `open → in_progress → resolved` (optionally `escalated`). Officers can update state from the dashboard; citizens can query state via WhatsApp.

**FR6 — Officer Dashboard**
Real-time (WebSocket-driven) list/feed of complaints and, if built, live calls, each showing AI-derived fields, with filter by category/priority/status and a map view.

**FR7 — Admin Dashboard**
Aggregated analytics: complaint volume trends, department breakdown, SLA compliance %, hotspot heatmap, recurring-issue flags.

**FR8 — Emergency Escalation**
Any input (text, voice, or call) matching emergency intent/keywords is flagged `priority=critical` and surfaced at the top of the officer feed immediately.

## 7. Success Metrics (for the demo narrative, not literal production KPIs)

- Time from citizen message → structured complaint in dashboard: **under a few seconds**
- Classification confidence shown and reasonable (>80% on demo inputs)
- At least one live duplicate/incident fusion shown on stage
- All 3 languages (English/Tamil/Tanglish) correctly classified in the demo set

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Live phone call/Realtime API flaky under demo network | Have a pre-recorded call clip as fallback path through the same pipeline |
| WhatsApp Sandbox message delivery delay | Rehearse with a warm sandbox session before presenting; have screenshots as backup |
| Tamil STT/NLP accuracy weak | Curate 2-3 known-good Tamil/Tanglish demo phrases in advance |
| Running out of build time | Core scope (Section 5.1) is a complete, demoable product on its own — stretch features are additive, not required for a working demo |

## 9. Demo Script (5–6 min)

1. State the problem in one sentence + current pain (manual, no tracking, no prioritization).
2. Live: citizen reports a complaint via WhatsApp in Tamil/Tanglish.
3. Show it becoming structured JSON in real time (category, priority, department, sentiment).
4. Officer dashboard: complaint appears already routed, already prioritized, clustered with similar ones into an incident.
5. (Stretch) Live/recorded call demo through the same pipeline.
6. Admin dashboard: SLA, heatmap, trends.
7. Close with the architecture in one line: *"Twilio connects the citizen; OpenAI understands the citizen; our backend takes action; PostgreSQL remembers everything; the dashboards show the result."*
