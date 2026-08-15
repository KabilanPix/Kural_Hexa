# Kural — Product Requirements Document

**Tagline:** AI-Powered Citizen Call & Complaint Intelligence Platform
**Hackathon:** Hexaware Mavericks
**Version:** 1.0 (Final Scope)

---

## 1. Problem Statement

Government organizations receive thousands of citizen calls daily across helplines, grievance cells, municipal offices, electricity boards, water departments, transport authorities, healthcare services, police control rooms, and disaster management centers. Most calls are manually recorded and forwarded, leading to delays, duplicate complaints, poor tracking, and limited visibility into recurring public issues.

## 2. Solution Overview

Kural is an AI-powered Citizen Call Intelligence Platform that captures and analyzes incoming citizen interactions (voice calls and WhatsApp) in real time, automatically identifies issues, classifies complaints, generates summaries, recommends the appropriate department, tracks resolution progress, and provides actionable insights to government officials — reducing manual intervention, improving response times, and supporting data-driven governance.

Kural interprets the required "Citizen Portal" as the **lowest-friction citizen access point**: WhatsApp, which reaches citizens with zero app-install friction, plus a phone-call channel for citizens without smartphone/data access. Both channels are two interfaces into one shared AI/service layer — not separate systems.

## 3. Objectives

- Record and transcribe incoming calls
- Automatically classify complaints
- Prioritize emergency cases
- Recommend the appropriate department
- Detect duplicate complaints and fuse them into incidents
- Track complaint lifecycle end-to-end
- Provide dashboards and analytics (officer + admin)
- Predict recurring issues using AI

## 4. Target Users

| User | Access | Needs |
|---|---|---|
| Citizen | WhatsApp, Phone Call | Fast, low-friction complaint filing in their own language; status visibility |
| Call Center Officer | Web Dashboard | Live complaint feed, AI-prioritized queue, status management |
| Department Official | Web Dashboard | Department-filtered queue, SLA visibility |
| Administrator | Web Dashboard | System-wide trends, heatmaps, SLA breach monitoring, executive view |

## 5. Core Features (Full Scope — Nothing Deferred)

### 5.1 Citizen Access — WhatsApp
- Menu-driven intent flow: Register / Track / History / Talk to AI / Emergency
- Free-text natural language complaint filing (no rigid forms)
- Photo complaints (e.g. pothole, garbage) with AI vision classification
- Voice-note complaints → transcription → same AI pipeline
- Live location sharing → stored as lat/long, shown on map
- Status tracking by complaint ID or "my complaints"

### 5.2 Citizen Access — Voice Call
- Inbound call → real-time streamed audio → conversational AI
- English / Tamil / Tanglish handling
- AI can call backend tools: create complaint, check status, fetch history, detect emergency, find similar complaints
- Emergency detection → instant escalation

### 5.3 AI Intelligence Engine
- Speech-to-text (multilingual)
- Language detection & normalization
- Complaint classification with confidence score
- Entity extraction (location, duration, ward, etc.)
- Sentiment analysis
- Priority scoring
- Department routing recommendation
- Embedding-based duplicate detection
- Incident fusion (clustering related complaints)
- AI-generated summary per complaint
- Recurring-issue / hotspot prediction (trend-based anomaly detection)

### 5.4 Call Center / Officer Dashboard
- Live complaint feed with AI fields visible (category, priority, department, sentiment, confidence)
- Live call transcript + AI understanding panel
- Status workflow: Open → In Progress → Resolved
- Map view with complaint pins
- Duplicate/incident grouping view

### 5.5 Administrator Dashboard
- Department-level analytics
- Complaint trend charts (by category / ward / department / time)
- Heatmap of complaint density
- SLA monitoring: countdown timers, breach alerts, resolution-time analytics
- Executive summary view

### 5.6 Notifications
- WhatsApp status updates pushed to citizen on complaint progress
- SLA breach alerts to officers/admins

## 6. Success Metrics (for judging & demo narrative)

- Time from citizen report → structured, routed complaint (target: seconds, not hours)
- % of complaints correctly auto-classified (show confidence scores live)
- Duplicate complaints successfully fused into single incidents
- Multilingual accuracy across English / Tamil / Tanglish demo cases
- Dashboard reflects new complaints in real time (no manual refresh)

## 7. Assumptions & Constraints

- Twilio WhatsApp Sandbox used for demo; production note: migrate to WhatsApp Business Platform
- WhatsApp's 24-hour session window applies to free-form replies; outside it, template messages are required — noted as a production consideration, not a demo blocker
- Live phone call via Realtime API is the highest-risk component; a pre-recorded call fallback must exist for the demo
- OpenAI is the model provider for both NLP classification and Realtime voice

## 8. Out of Scope (for hackathon timeframe)

- Native mobile app for citizens
- Multi-tenant support for multiple government bodies
- Production-grade authentication/RBAC (basic role separation only)
- Payment or grievance-fee handling

## 9. Demo Narrative

1. Citizen files a complaint via WhatsApp in Tamil/Tanglish → AI extracts structured data in seconds
2. Officer dashboard updates live, complaint already prioritized and routed
3. A second, similar complaint arrives → automatically fused into the same incident
4. Admin dashboard shows the resulting hotspot on the heatmap and an SLA countdown
5. (Stretch, live if stable) A phone call comes in, AI converses in real time, creates a complaint via tool call, visible instantly on the same dashboard
