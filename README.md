# 🎓 Smart Timetable Assistant
**AI-powered academic schedule manager | React/Next.js + FastAPI + Supabase**

> Capabl Track B Project — AgentForge Team

[![Live Demo](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://smart-timetable-assistant-weld.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Render-blue?logo=render)](https://smart-timetable-assistant.onrender.com)

---

## 👥 Team

**Team Name:** AgentForge  
**Author:** Heta Patel  
**Track:** Track B — Advanced  
**Program:** Capabl 8-Week AI Project  

---

## 🌟 Live URLs

| Service | URL |
|--------|-----|
| 🖥️ Frontend (Vercel) | https://smart-timetable-assistant-weld.vercel.app/ |
| ⚙️ Backend API (Render) | https://smart-timetable-assistant.onrender.com |
| 📖 API Docs (Swagger) | https://smart-timetable-assistant.onrender.com/docs |

---

## 📌 Project Overview

Smart Timetable Assistant is an AI-powered academic scheduling tool that helps students organize their timetable, track assignments, detect conflicts, and get intelligent scheduling suggestions — all through a conversational interface.

**Domain:** Productivity Technology & Academic Time Management  
**Core Skills:** Scheduling algorithms, conflict detection, rule-based AI agent, REST APIs, full-stack deployment

---

## 🏗️ Project Structure

```
track_b/
├── backend/                    ← FastAPI Python server
│   ├── main.py                 ← All API routes (15+ endpoints)
│   ├── src/
│   │   ├── agent.py            ← Rule-based AI scheduling agent
│   │   ├── database.py         ← Supabase/PostgreSQL + analytics
│   │   ├── auth.py             ← JWT authentication
│   │   ├── notifications.py    ← Email + WhatsApp (Twilio) alerts
│   │   ├── google_calendar.py  ← Google Calendar OAuth sync
│   │   └── scheduler.py        ← Smart auto-scheduling engine
│   ├── seed_data.py            ← Sample data for demo
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                   ← Next.js React app
    ├── src/
    │   ├── pages/
    │   │   ├── index.js        ← Main app (calendar + chat + analytics)
    │   │   └── login.js        ← Login/Signup page
    │   ├── lib/
    │   │   └── api.js          ← All API calls
    │   └── styles/
    │       └── globals.css
    ├── package.json
    ├── tailwind.config.js
    └── .env.example
```

---

## ✅ Track B Features Checklist

### Core
- [x] React/Next.js frontend with FullCalendar.js
- [x] FastAPI backend with 15+ API endpoints
- [x] Rule-based AI agent with 12 scheduling tools (offline, no API key needed)
- [x] Supabase/PostgreSQL database
- [x] JWT Authentication (Login/Signup)
- [x] Conflict detection + intelligent suggestions
- [x] Smart auto-scheduling study sessions
- [x] Recurring events (weekly classes for full semester)
- [x] Assignment tracking with priority + status

### Notifications
- [x] Email notifications (Gmail SMTP)
- [x] WhatsApp notifications (Twilio)
- [x] HTML email templates

### Google Calendar
- [x] OAuth 2.0 authentication flow
- [x] Push local events → Google Calendar
- [x] Pull Google events → local DB

### Analytics
- [x] Events by type breakdown
- [x] Assignment status distribution
- [x] Summary statistics dashboard

### Deployment
- [x] Vercel (frontend)
- [x] Render (backend)
- [x] Supabase (database)
- [x] Environment variable configuration
- [x] CORS configured for production

---

## 🚀 Local Setup Guide

### STEP 1 — Install Required Software

| Software | Download | Why |
|----------|----------|-----|
| Python 3.11+ | https://python.org/downloads | Backend server |
| Node.js 20+ | https://nodejs.org | Frontend (Next.js) |
| Git | https://git-scm.com | Version control |
| VS Code | https://code.visualstudio.com | Code editor |

Verify:
```bash
python --version    # Should say Python 3.11+
node --version      # Should say v20+
npm --version       # Should say 10+
```

### STEP 2 — Clone the Repository

```bash
git clone https://github.com/230390116016-design/smart-timetable-assistant.git
cd smart-timetable-assistant/track_b
```

### STEP 3 — Set Up the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

### STEP 4 — Configure Environment Variables (Backend)

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key

# JWT Auth
JWT_SECRET_KEY=your-secret-key-here

# Email Notifications (optional)
EMAIL_SENDER=youremail@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# WhatsApp (optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Google Calendar (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**How to get Gmail App Password:**
1. Go to myaccount.google.com → Security
2. Enable 2-Step Verification
3. Search "App Passwords" → Create one for "Mail"
4. Copy the 16-character password

### STEP 5 — Add Sample Data & Start Backend

```bash
python seed_data.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO: Uvicorn running on http://0.0.0.0:8000
INFO: ✅ Database ready
```

Test: http://localhost:8000 → `{"status":"ok"}`  
API Docs: http://localhost:8000/docs

### STEP 6 — Set Up the Frontend

```bash
# New terminal window
cd frontend
npm install
cp .env.example .env.local
```

`.env.local` should have:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open http://localhost:3000 🎉

---

## 🎯 AI Chat Examples (For Demo)

```
User: "What classes do I have this week?"
Agent: Shows all events for the week with times and locations

User: "Find a free 2-hour slot tomorrow"
Agent: Lists available time slots on tomorrow's schedule

User: "Add Physics exam next Friday at 10 AM"
Agent: Creates event, checks conflicts, confirms booking

User: "What are my upcoming deadlines?"
Agent: Shows pending assignments sorted by due date

User: "Schedule a 2-hour DSA study session tomorrow"
Agent: Finds free slot and auto-schedules study block
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User (Browser)                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────┐
│           Next.js Frontend (Vercel)                         │
│   FullCalendar.js | AI Chat Panel | Analytics Dashboard     │
│   Login/Signup (JWT Auth)                                   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│              FastAPI Backend (Render)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Events  │  │  Agent   │  │  Notif.  │  │  Google   │  │
│  │   API    │  │Rule-based│  │Email + WA│  │ Calendar  │  │
│  │          │  │  (Local) │  │ (Twilio) │  │  OAuth    │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                    │                                        │
│         ┌──────────▼──────────┐                            │
│         │  Supabase/PostgreSQL│                            │
│         │ users | events      │                            │
│         │ assignments | auth  │                            │
│         └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Viva Preparation

**Q: Why FastAPI over Flask?**  
A: FastAPI is async, faster, auto-generates Swagger docs, has type validation with Pydantic, and is production-grade.

**Q: How does conflict detection work?**  
A: SQL query checks: `WHERE NOT (end_datetime <= new_start OR start_datetime >= new_end)` — catches all overlapping events.

**Q: How does the AI agent work without an LLM?**  
A: It uses a rule-based intent detection system. The `detect_intent()` function matches keywords to intents (add_event, deadlines, free_slots, etc.) and routes to specific handlers. This makes it fast, free, and works offline.

**Q: How does auto-scheduling work?**  
A: Algorithm finds free slots day by day before the deadline, respects preferred time window, limits sessions to max 2h to avoid burnout.

**Q: Why Supabase over SQLite?**  
A: Supabase gives us PostgreSQL with built-in auth, real-time subscriptions, and a hosted cloud database — production-ready from day one.

**Q: How is authentication handled?**  
A: JWT tokens — user registers/logs in, server returns a signed JWT, frontend stores it and sends it in the `Authorization: Bearer <token>` header for all protected routes.

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError` | Make sure venv is activated: `venv\Scripts\activate` |
| `SUPABASE_URL` error | Check `.env` file has correct Supabase credentials |
| Frontend can't reach backend | Make sure backend is running on port 8000 |
| Calendar not showing | Run `python seed_data.py` first |
| `npm install` fails | Try `npm install --legacy-peer-deps` |
| Port 8000 in use | Use `--port 8001` in uvicorn command |

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React / Next.js + Tailwind CSS + FullCalendar.js |
| Backend | FastAPI (Python) |
| AI Agent | Rule-based intent detection (offline, no API key) |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (python-jose + passlib) |
| Notifications | Gmail SMTP + Twilio WhatsApp |
| Calendar Sync | Google Calendar OAuth 2.0 |
| Deployment | Vercel (frontend) + Render (backend) |

---

*Built for Capabl Track B — Smart Academic Timetable Assistant*  
*Team AgentForge | Heta Patel*
