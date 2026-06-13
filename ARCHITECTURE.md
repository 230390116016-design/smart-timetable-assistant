# 🏗️ Architecture Documentation
## Smart Timetable Assistant — Track B

**Team:** AgentForge | **Team Members:** Heta Patel, Dhruvi Patel, Janvi Dodiya, Tanisha Parmar  
**Program:** Capabl 8-Week AI Project

---

## 1. System Overview

Smart Timetable Assistant is a full-stack AI-powered academic scheduling platform. It allows students to manage their timetable, track assignments, detect scheduling conflicts, and receive intelligent suggestions — all through a conversational interface.

```
┌─────────────────────────────────────────────────────────────┐
│                     User (Browser)                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────┐
│           Next.js Frontend (Vercel)                         │
│   FullCalendar.js | AI Chat Panel | Analytics Dashboard     │
│   Login / Signup (JWT Auth)                                 │
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

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js + Tailwind CSS + FullCalendar.js | UI, Calendar view, Chat panel |
| Backend | FastAPI (Python) | REST API, Business logic |
| AI Agent | Rule-based intent detection | Scheduling intelligence (offline) |
| Database | Supabase (PostgreSQL) | Data storage, Auth |
| Auth | JWT (python-jose + passlib) | User authentication |
| Notifications | Gmail SMTP + Twilio WhatsApp | Email + WhatsApp alerts |
| Calendar Sync | Google Calendar OAuth 2.0 | External calendar integration |
| Deployment | Vercel + Render | Frontend + Backend hosting |

---

## 3. Frontend Architecture

**Framework:** Next.js (React)  
**Deployment:** Vercel  
**Live URL:** https://smart-timetable-assistant-weld.vercel.app/

### Key Components

```
frontend/src/
├── pages/
│   ├── index.js      ← Main app (Calendar + Chat + Analytics + Assignments)
│   └── login.js      ← Authentication (Login / Signup)
├── lib/
│   └── api.js        ← All API calls to backend
└── styles/
    └── globals.css   ← Global styles + Tailwind
```

### Frontend Flow

```
User Opens App
      │
      ▼
Login/Signup Page
      │ JWT Token received
      ▼
Main Dashboard (index.js)
      ├── Calendar Tab    → FullCalendar.js (Month/Week/Day view)
      ├── Assignments Tab → CRUD for assignments
      ├── AI Chat Tab     → Sends message to /api/chat
      └── Analytics Tab   → Charts (event breakdown, completion rate)
```

### Key Libraries
- **FullCalendar.js** — Interactive calendar with drag-drop, recurring events
- **Tailwind CSS** — Utility-first styling
- **lucide-react** — Icons

---

## 4. Backend Architecture

**Framework:** FastAPI (Python)  
**Deployment:** Render  
**Live URL:** https://smart-timetable-assistant.onrender.com  
**API Docs:** https://smart-timetable-assistant.onrender.com/docs

### File Structure

```
backend/
├── main.py              ← All API routes (15+ endpoints)
├── src/
│   ├── agent.py         ← Rule-based AI scheduling agent
│   ├── database.py      ← Supabase DB operations
│   ├── auth.py          ← JWT register/login/verify
│   ├── notifications.py ← Email + WhatsApp
│   ├── google_calendar.py ← Google Calendar OAuth
│   └── scheduler.py     ← Auto-scheduling engine
└── seed_data.py         ← Demo data seeder
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/events` | Fetch all events |
| POST | `/api/events` | Create new event |
| DELETE | `/api/events/{id}` | Delete event |
| GET | `/api/assignments` | Fetch assignments |
| POST | `/api/assignments` | Create assignment |
| PATCH | `/api/assignments/{id}` | Update status |
| POST | `/api/chat` | AI agent chat |
| GET | `/api/free-slots` | Find free time slots |
| POST | `/api/auto-schedule` | Auto-schedule study blocks |
| GET | `/api/analytics` | Get analytics data |
| GET | `/api/google/auth` | Google Calendar OAuth |
| POST | `/api/notify` | Send notification |

---

## 5. AI Agent — Scheduling Algorithm

The AI agent (`agent.py`) is a **rule-based intent detection system** — it works completely offline with no external API key required.

### How It Works

```
User Message (text)
        │
        ▼
  detect_intent()
  ├── Keyword matching
  ├── Pattern recognition
  └── Returns intent type
        │
        ▼
  Route to Handler
  ├── "add_event"      → handle_add_event()
  ├── "get_events"     → handle_get_events()
  ├── "deadlines"      → handle_deadlines()
  ├── "free_slots"     → handle_free_slots()
  ├── "study_block"    → handle_study_block()
  ├── "get_assignments"→ handle_get_assignments()
  └── "general"        → handle_general()
        │
        ▼
  Query Supabase DB
        │
        ▼
  Return Formatted Response
```

### Intent Detection Logic

```python
def detect_intent(text):
    # Checks keywords in order of priority:
    # 1. Deadlines → "deadline", "due", "pending"
    # 2. Greetings → "hi", "hello" (short messages only)
    # 3. Assignments → "assignment", "homework"
    # 4. Events → "schedule", "class", "lecture"
    # 5. Free slots → "free", "available", "gap"
    # 6. Study blocks → "study", "revise"
    # 7. Help → "help", "what can"
    # Default → "general"
```

### Conflict Detection Algorithm

```python
# SQL-based conflict detection
# Checks if new event overlaps with any existing event:
WHERE NOT (
    end_datetime <= new_start_datetime
    OR
    start_datetime >= new_end_datetime
)
# This catches ALL overlap scenarios:
# - Complete overlap
# - Partial overlap (start or end inside existing)
# - New event containing existing event
```

### Auto-Scheduling Algorithm

```python
def auto_schedule_study_blocks(subject, total_hours, deadline):
    # 1. Start from today, iterate day by day until deadline
    # 2. For each day, get free slots from DB
    # 3. Pick first available slot that fits session duration
    # 4. Max 2 hours per session (avoid burnout)
    # 5. Respect preferred time window (morning/afternoon/evening)
    # 6. Create study block event in DB
    # 7. Continue until total_hours scheduled
```

### Recurring Events

```python
# Uses RRULE standard for recurring events
recurrence = "FREQ=WEEKLY;COUNT=16"
# Automatically creates 16 weekly events
# (full semester coverage)
```

---

## 6. Database Schema (Supabase/PostgreSQL)

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Events Table
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    event_type TEXT,           -- class, exam, study, personal
    start_datetime TEXT,
    end_datetime TEXT,
    location TEXT,
    recurrence TEXT,           -- RRULE string
    google_event_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Assignments Table
```sql
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT,
    deadline TEXT,
    priority TEXT,             -- high, medium, low
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed
    estimated_hours REAL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Subjects Table
```sql
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    teacher TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Authentication Flow (JWT)

```
User Submits Email + Password
            │
            ▼
    POST /api/auth/register  OR  /api/auth/login
            │
            ▼
    auth.py processes request:
    ├── Register: hash password (bcrypt) → save to Supabase
    └── Login: verify password hash → generate JWT token
            │
            ▼
    JWT Token returned to Frontend
            │
            ▼
    Frontend stores token
            │
            ▼
    All API calls send:
    Authorization: Bearer <token>
            │
            ▼
    Backend verifies token on protected routes
```

---

## 8. Google Calendar Integration Flow

```
User clicks "Connect Google Calendar"
            │
            ▼
    GET /api/google/auth
    → Redirects to Google OAuth consent screen
            │
            ▼
    User grants permission
            │
            ▼
    Google returns auth code
            │
            ▼
    Backend exchanges code for access token
            │
            ▼
    Sync Options:
    ├── Push → Local events sent to Google Calendar
    └── Pull → Google events imported to local DB
```

---

## 9. Notification Flow

```
Event Created / Deadline Approaching
            │
            ▼
    notifications.py triggered
            │
    ┌───────┴────────┐
    ▼                ▼
Email (Gmail SMTP)  WhatsApp (Twilio)
    │                │
    ▼                ▼
HTML email template  WhatsApp message
sent to user         sent to user's number
```

---

## 10. Deployment Architecture

```
GitHub Repository
      │
      ├──── Frontend (Next.js)
      │     └── Vercel (auto-deploy on push to main)
      │         URL: smart-timetable-assistant-weld.vercel.app
      │
      └──── Backend (FastAPI)
            └── Render (auto-deploy on push to main)
                URL: smart-timetable-assistant.onrender.com
                     │
                     └── Supabase (PostgreSQL)
                         Hosted cloud database
```

### Environment Variables

**Backend (Render):**
```
SUPABASE_URL, SUPABASE_KEY
JWT_SECRET_KEY
EMAIL_SENDER, EMAIL_PASSWORD
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

**Frontend (Vercel):**
```
NEXT_PUBLIC_API_URL = https://smart-timetable-assistant.onrender.com
```

---

## 11. Security Practices

- Passwords hashed using **bcrypt** (passlib)
- JWT tokens signed with secret key (HS256 algorithm)
- Environment variables used for all secrets (never hardcoded)
- CORS configured to allow only frontend domain
- Supabase Row Level Security (RLS) enabled
- `.env` files in `.gitignore` — never pushed to GitHub

---

*Built for Capabl Track B — Smart Academic Timetable Assistant*  
*Team AgentForge — Heta Patel, Dhruvi Patel, Janvi Dodiya, Tanisha Parmar*
