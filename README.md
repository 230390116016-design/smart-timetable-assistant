# 🎓 Smart Timetable Assistant – Track B

**AI-powered academic schedule manager | React/Next.js + FastAPI + LangChain**

---

## 🏗️ Project Structure

```
track_b/
├── backend/               ← FastAPI Python server
│   ├── main.py            ← All API routes
│   ├── src/
│   │   ├── agent.py       ← LangChain AI agent (GPT-4o-mini)
│   │   ├── database.py    ← SQLite database + analytics
│   │   ├── notifications.py ← Email + WhatsApp alerts
│   │   ├── google_calendar.py ← Google Calendar OAuth sync
│   │   └── scheduler.py   ← Smart auto-scheduling engine
│   ├── seed_data.py       ← Sample data for demo
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/              ← Next.js React app
    ├── src/
    │   ├── pages/
    │   │   └── index.js   ← Main app (calendar + chat + analytics)
    │   ├── lib/
    │   │   └── api.js     ← All API calls
    │   └── styles/
    │       └── globals.css
    ├── package.json
    ├── tailwind.config.js
    └── .env.example
```

---

## 🚀 STEP-BY-STEP SETUP GUIDE

### STEP 1 — Install Required Software

Install these on your computer (all free):

| Software | Download Link | Why needed |
|----------|--------------|------------|
| **Python 3.11+** | https://python.org/downloads | Backend server |
| **Node.js 20+** | https://nodejs.org | Frontend (Next.js) |
| **Git** | https://git-scm.com | Version control |
| **VS Code** | https://code.visualstudio.com | Code editor |

Verify installation by opening a terminal and typing:
```bash
python --version    # Should say Python 3.11+
node --version      # Should say v20+
npm --version       # Should say 10+
```

---

### STEP 2 — Get Your OpenAI API Key

1. Go to https://platform.openai.com/signup and create a free account
2. Click your profile → **API Keys** → **Create new secret key**
3. Copy the key (starts with `sk-...`)
4. **Add $5 credit** (minimum) at https://platform.openai.com/settings/billing
5. Keep this key safe – you'll use it in Step 4

---

### STEP 3 — Set Up the Backend

Open a terminal/command prompt:

```bash
# 1. Navigate to backend folder
cd track_b/backend

# 2. Create a Python virtual environment (keeps dependencies clean)
python -m venv venv

# 3. Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 4. Install all Python packages
pip install -r requirements.txt

# You should see "Successfully installed..." messages
```

---

### STEP 4 — Configure Environment Variables (Backend)

```bash
# In the backend/ folder, copy the example file
cp .env.example .env

# Now open .env in VS Code and fill in your values:
code .env
```

**Minimum required** (just for basic demo):
```env
OPENAI_API_KEY=sk-your-actual-key-here
DATABASE_PATH=data/timetable.db
```

**For email notifications** (optional but good for marks):
```
EMAIL_SENDER=youremail@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```
> How to get Gmail App Password:
> 1. Go to myaccount.google.com → Security
> 2. Enable 2-Step Verification
> 3. Search "App Passwords" → Create one for "Mail"
> 4. Copy the 16-character password

---

### STEP 5 — Add Sample Data and Start Backend

```bash
# Still in backend/ with venv active:

# Add demo data (classes, assignments, exams)
python seed_data.py

# Start the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     ✅ Database ready
```

Test it works: Open http://localhost:8000 in your browser → should show `{"status":"ok"}`

View all API routes: http://localhost:8000/docs (Swagger UI — great for your viva!)

---

### STEP 6 — Set Up the Frontend

Open a **new terminal window** (keep backend running):

```bash
# Navigate to frontend folder
cd track_b/frontend

# Install Node.js packages (takes 2-3 minutes)
npm install

# Copy environment file
cp .env.example .env.local
# .env.local already has: NEXT_PUBLIC_API_URL=http://localhost:8000
# No changes needed for local development

# Start the frontend
npm run dev
```

You should see:
```
▲ Next.js 14.2.3
- Local: http://localhost:3000
```

Open http://localhost:3000 → Your app is running! 🎉

---

### STEP 7 — Test the App

Try these features:

**Calendar:**
- Click any date to add an event
- See your seeded classes in the weekly view
- Switch between Month / Week / Day views

**AI Chat (click "AI Chat" button):**
```
"What classes do I have this week?"
"Add a Physics exam on Friday at 10 AM"
"Find me a free 2-hour slot tomorrow for DSA study"
"What are my upcoming deadlines?"
"Schedule study sessions for Operating Systems before the exam"
```

**Assignments tab:**
- View all pending assignments
- Click "Done ✓" to mark complete

**Analytics tab:**
- See event breakdown by type
- Assignment completion status

---

## ☁️ DEPLOYMENT (For Submission)

### Deploy Backend to Railway

1. Go to https://railway.app → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository, choose the `backend/` folder
4. Railway auto-detects Python/FastAPI
5. Add environment variables:
   - Click your service → **Variables** tab
   - Add all keys from your `.env` file
6. Railway gives you a URL like: `https://your-app.railway.app`

**Add a `Procfile`** in backend/ folder:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Deploy Frontend to Vercel

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project** → Import your repository
3. Set **Root Directory** to `frontend/`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-app.railway.app` (your Railway URL)
5. Click **Deploy** → Done!

Your live URL will be: `https://your-app.vercel.app`

---

## 🌟 TRACK B FEATURES CHECKLIST

### Core (must have)
- [x] React/Next.js frontend with FullCalendar.js
- [x] FastAPI backend with 15+ API endpoints
- [x] LangChain AI agent with 12 scheduling tools
- [x] SQLite database (easy upgrade to PostgreSQL)
- [x] Conflict detection + intelligent suggestions
- [x] Smart auto-scheduling study sessions
- [x] Recurring events (weekly classes for semester)
- [x] Assignment tracking with priority + status

### Notifications
- [x] Email notifications (Gmail SMTP)
- [x] WhatsApp notifications (Twilio)
- [x] HTML email templates with tables

### Google Calendar
- [x] OAuth 2.0 authentication flow
- [x] Push local events → Google Calendar
- [x] Pull Google events → local DB

### Analytics
- [x] Events by type breakdown
- [x] Assignment status distribution
- [x] Summary statistics dashboard

### Deployment
- [x] Vercel (frontend) + Railway (backend)
- [x] Environment variable configuration
- [x] CORS configured for production

---

## 🎯 AI Chat Examples (For Demo Video)

```
User: "Schedule my DSA lecture every Monday 9-10 AM for the whole semester"
Agent: [Creates 16 recurring weekly events]

User: "I have a conflict at 2 PM tomorrow. Find alternatives."
Agent: [Checks conflicts, suggests 3 alternative slots]

User: "I have 8 hours of DSA to study before my exam on [date]. Auto-schedule it."
Agent: [Creates daily study blocks in free slots before the exam]

User: "What's my workload this week?"
Agent: [Lists all events + deadlines for the week]

User: "Mark my OS assignment as done"
Agent: [Updates status to completed]
```

---

## 📝 VIVA PREPARATION TOPICS

**Q: Why FastAPI over Flask?**
A: FastAPI is async, faster, auto-generates Swagger docs, has type validation with Pydantic, and is production-grade.

**Q: How does conflict detection work?**
A: SQL query: `WHERE NOT (end_datetime <= new_start OR start_datetime >= new_end)` — this catches all overlapping events.

**Q: How does auto-scheduling work?**
A: Algorithm finds free slots day by day before the deadline, respects preferred time window (morning/afternoon/evening), limits sessions to max 2h to avoid burnout.

**Q: Why SQLite and not PostgreSQL?**
A: SQLite is zero-config for development. The database.py functions work identically with PostgreSQL — just change the connection string.

**Q: How is the AI agent different from Track A?**
A: Track B agent has 12 tools vs 9, uses GPT-4o-mini (smarter), has smart_reschedule tool for conflict resolution, supports recurring events with RRULE, and auto-schedules study blocks.

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|---------|
| `ModuleNotFoundError` | Make sure venv is activated: `source venv/bin/activate` |
| `OPENAI_API_KEY` error | Check .env file has correct key, no extra spaces |
| Frontend can't reach backend | Make sure backend is running on port 8000 |
| Calendar not showing | Run `python seed_data.py` first |
| `npm install` fails | Try `npm install --legacy-peer-deps` |
| Port 8000 in use | Kill with `lsof -ti:8000 \| xargs kill` or use port 8001 |

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User (Browser)                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────────┐
│              Next.js Frontend (Vercel)                       │
│   FullCalendar.js | AI Chat Panel | Analytics Dashboard     │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│              FastAPI Backend (Railway)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Events  │  │  Agent   │  │  Notif.  │  │  Google   │  │
│  │  API     │  │ LangChain│  │  Email/  │  │  Calendar │  │
│  │          │  │  GPT-4   │  │  WA      │  │  OAuth    │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                         │                                   │
│              ┌──────────▼──────────┐                       │
│              │   SQLite Database   │                        │
│              │ events | assignments│                        │
│              │ subjects | analytics│                        │
│              └─────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

*Built for Capabl Track B – Smart Academic Timetable Assistant*
