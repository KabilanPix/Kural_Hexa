# Kural — UI/UX Document

## 1. Design Principles

1. **Trust and clarity** — this is a government tool; avoid playful/startup visual language. Clean, high-contrast, official but modern (think civic-tech, not consumer app).
2. **AI reasoning is always visible** — never show a decision (priority, department, duplicate match) without showing *why*. This is what makes the "technical execution" score-able live.
3. **Zero-friction citizen side** — the citizen never sees a UI at all beyond WhatsApp's native interface. All complexity lives on the government side.
4. **Real-time first** — dashboards should visibly update live (WebSocket push), not require refresh. This is a strong, cheap demo signal.

## 2. Design System

- **Colors:** Deep blue (#1E3A5F) primary (trust/government), white/light-grey backgrounds, amber (#F5A623) for medium priority, red (#E5484D) for high/critical, green (#2ECC71) for resolved/low.
- **Typography:** Inter or system sans-serif; bold weights for headers, generous line height for readability under demo lighting.
- **Components:** Card-based complaint entries, badge/chip components for category & priority, sidebar navigation for dashboards, toast notifications for new live events.
- **Iconography:** Simple line icons per category (💧 water, 🛣️ roads, ⚡ electricity, 🗑️ sanitation, 🚨 emergency) — used consistently across WhatsApp replies and dashboard.

## 3. Citizen Journey — WhatsApp

### 3.1 Entry / Menu
```
👋 Welcome to Kural.
How can I help you?

1️⃣ Register complaint
2️⃣ Track complaint
3️⃣ My complaints
4️⃣ Talk to AI
5️⃣ Emergency
```

### 3.2 Free-text complaint flow
```
Citizen: There is no water in my street since yesterday.

Kural: I understood that you're reporting a water supply
       problem since yesterday.
       📍 Please share your location.

Citizen: [shares WhatsApp location]

Kural: ✅ Complaint registered.
       ID: KR-2026-004821
       Department: Water Department
       Priority: High
       We'll notify you about updates here.
```

### 3.3 Photo complaint flow
```
Citizen: [sends photo of pothole]

Kural: 📷 Analyzing image...
       Detected: Road damage (pothole)
       Severity: High
       Shall I register this as a complaint? [Yes/No]
```

### 3.4 Voice note flow
Same as free-text, but preceded by:
```
Kural: 🎤 Transcribing your voice message...
       "எங்க area ல மூணு நாளா தண்ணி வரல."
       (No water supply in my area for 3 days)
```

### 3.5 Tracking flow
```
Citizen: TRACK KR-2026-004821

Kural: 📋 Complaint KR-2026-004821
       Status: In Progress
       Department: Water Department
       Filed: 2 days ago
       Last update: Field team assigned
```

## 4. Citizen Journey — Voice Call

- Call connects → AI greets in a neutral/auto-detected language: *"Hello, I am Kural. How can I help you today?"*
- Natural conversation; AI silently calls backend tools (`get_complaint_status`, `create_complaint`, etc.) without narrating the tool call to the citizen — only the conversational result.
- Emergency phrases trigger immediate escalation acknowledgement: *"I understand this is urgent. I'm escalating this now and connecting you to the emergency desk."*

## 5. Officer Dashboard

**Layout:** Left sidebar (nav: Live Feed / Incidents / Map / Search) + main content area + right-side detail panel.

### 5.1 Live Feed (default view)
- Vertically scrolling card list, newest on top, auto-inserts new complaints via WebSocket with a brief highlight animation.
- Each card shows: citizen phone (masked), category icon, priority badge (color-coded), department, one-line AI summary, timestamp, confidence %.
- Filter bar on top: by category, priority, status, department.

### 5.2 Complaint Detail Panel (click a card)
- Full AI reasoning block: category, confidence, sentiment, extracted entities, full transcript/message.
- Status dropdown: Open → In Progress → Resolved / Escalated.
- "Related complaints" section showing incident cluster if duplicate-matched.
- Map pin for the complaint location.

### 5.3 Live Call View (stretch)
- Split panel: left = live transcript scrolling in real time; right = live AI understanding panel (category, priority, department, sentiment) updating as the call progresses — this is the strongest "wow" visual for judges.
- "Create Complaint" action button appears once AI has enough structured data.

### 5.4 Map View
- Pins colored by priority, clustered by density; click pin → opens detail panel.

## 6. Admin Dashboard

- **Top row:** KPI tiles — total complaints today, avg resolution time, SLA compliance %, active incidents.
- **Trends panel:** line/bar chart of complaint volume by category over time.
- **Heatmap panel:** geographic density map (reuses officer dashboard map component with a heat layer).
- **Department breakdown:** table/bar chart of complaints per department with SLA status.
- **Recurring issues panel:** flagged wards/categories trending above baseline, with a short AI-generated note (e.g., *"Ward 18 water complaints up 3x this week — possible infrastructure issue"*).

## 7. Notifications

- Citizen-facing: WhatsApp message on status change (`In Progress`, `Resolved`).
- Officer-facing: toast/banner on new emergency-priority complaint; SLA breach warning banner on dashboard.

## 8. Screen Inventory (for build scoping)

| Screen | Priority |
|---|---|
| WhatsApp conversational flows (no custom UI, Twilio-native) | Core |
| Officer Dashboard — Live Feed | Core |
| Officer Dashboard — Complaint Detail Panel | Core |
| Officer Dashboard — Map View | Core |
| Officer Dashboard — Live Call View | Stretch |
| Admin Dashboard — KPI + Trends + Heatmap + SLA | Stretch |
