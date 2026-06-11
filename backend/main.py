"""
main.py - FastAPI Backend for Smart Timetable Assistant (Track B)
Handles all API routes, AI agent calls, conflict resolution, and notifications

NOTE: If FastAPI import fails, install dependencies:
  pip install fastapi pydantic uvicorn python-dotenv
"""

try:
    from fastapi import FastAPI, HTTPException, BackgroundTasks # pyright: ignore[reportMissingImports]
    from fastapi.middleware.cors import CORSMiddleware # pyright: ignore[reportMissingImports]
    from pydantic import BaseModel
except ImportError as e:
    raise ImportError(f"FastAPI not installed. Run: pip install fastapi pydantic uvicorn python-dotenv") from e
from typing import Optional, List
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Local imports
from src.database import (
    init_database, add_event, get_all_events, check_conflicts,
    delete_event, update_event, add_assignment, get_assignments,
    update_assignment_status, delete_assignment, get_free_slots,
    get_upcoming_deadlines, get_subjects, add_subject,
    get_analytics_data, add_study_block, get_study_blocks
)
from src.agent import run_agent, suggest_conflict_resolution
from src.notifications import send_deadline_reminder, send_daily_schedule
from src.google_calendar import (
    get_google_auth_url, exchange_code_for_token,
    sync_events_to_google, fetch_google_events
)
from src.scheduler import auto_schedule_study_sessions

# ─── App Setup ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Timetable Assistant API",
    description="Track B – AI-powered academic schedule manager",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware, # pyright: ignore[reportUndefinedVariable]
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],          # In prod, replace with your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init DB on startup
@app.on_event("startup")
async def startup_event():
    init_database()
    print("✅ Database ready")


# ─── Pydantic Models ─────────────────────────────────────────────────────────
class EventCreate(BaseModel):
    title: str
    event_type: str = "class"          # class | exam | personal | study
    start_datetime: str
    end_datetime: str
    location: Optional[str] = ""
    description: Optional[str] = ""
    subject: Optional[str] = ""
    priority: Optional[str] = "medium" # low | medium | high
    color: Optional[str] = "#4F46E5"
    recurrence: Optional[str] = ""     # RRULE string e.g. "FREQ=WEEKLY;COUNT=16"

class EventUpdate(BaseModel):
    title: Optional[str] = None
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    location: Optional[str] = None
    priority: Optional[str] = None
    color: Optional[str] = None

class AssignmentCreate(BaseModel):
    title: str
    subject: str
    deadline: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"
    estimated_hours: Optional[float] = 1.0

class SubjectCreate(BaseModel):
    name: str
    code: Optional[str] = ""
    teacher: Optional[str] = ""
    credits: Optional[int] = 3
    color: Optional[str] = "#4F46E5"

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = []

class NotificationRequest(BaseModel):
    email: str
    type: str = "deadline"   # deadline | daily | both
    days_ahead: int = 2

class StudyAutoSchedule(BaseModel):
    subject: str
    total_hours: float
    deadline: str
    preferred_slot: Optional[str] = "morning"  # morning | afternoon | evening

class GoogleAuthCode(BaseModel):
    code: str
    user_email: str


# ─── Health ──────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "Smart Timetable Assistant API v2.0 🚀"}

@app.get("/api/health")
def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ─── Events ──────────────────────────────────────────────────────────────────
@app.get("/api/events")
def get_events(from_date: Optional[str] = None, to_date: Optional[str] = None,
               event_type: Optional[str] = None):
    events = get_all_events(from_date=from_date, to_date=to_date, event_type=event_type)
    return {"events": events, "count": len(events)}


@app.post("/api/events")
def create_event(event: EventCreate):
    conflicts = check_conflicts(event.start_datetime, event.end_datetime)
    
    suggestions = []
    if conflicts:
        suggestions = suggest_conflict_resolution(
            event.start_datetime, event.end_datetime, conflicts
        )
    
    event_id, _ = add_event(
        title=event.title,
        event_type=event.event_type,
        start_dt=event.start_datetime,
        end_dt=event.end_datetime,
        location=event.location,
        description=event.description,
        subject=event.subject,
        priority=event.priority,
        color=event.color,
        recurrence=event.recurrence
    )
    return {
        "id": event_id,
        "conflicts": conflicts,
        "conflict_suggestions": suggestions,
        "message": "Event created successfully"
    }


@app.put("/api/events/{event_id}")
def update_event_route(event_id: int, data: EventUpdate):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_event(event_id, **update_data)
    return {"message": f"Event {event_id} updated"}


@app.delete("/api/events/{event_id}")
def delete_event_route(event_id: int):
    delete_event(event_id)
    return {"message": f"Event {event_id} deleted"}


@app.get("/api/events/conflicts/check")
def check_conflict_route(start: str, end: str, exclude_id: Optional[int] = None):
    conflicts = check_conflicts(start, end, exclude_id=exclude_id)
    suggestions = []
    if conflicts:
        suggestions = suggest_conflict_resolution(start, end, conflicts)
    return {"conflicts": conflicts, "suggestions": suggestions, "has_conflict": len(conflicts) > 0}


@app.get("/api/events/free-slots")
def free_slots(date: str, duration: int = 60):
    slots = get_free_slots(date, duration)
    return {"slots": slots, "date": date, "duration_minutes": duration}


# ─── Assignments ─────────────────────────────────────────────────────────────
@app.get("/api/assignments")
def get_assignments_route(status: Optional[str] = None, subject: Optional[str] = None):
    assignments = get_assignments(status=status, subject=subject)
    return {"assignments": assignments, "count": len(assignments)}


@app.post("/api/assignments")
def create_assignment(assignment: AssignmentCreate):
    assignment_id = add_assignment(
        title=assignment.title,
        subject=assignment.subject,
        deadline=assignment.deadline,
        description=assignment.description,
        priority=assignment.priority,
        estimated_hours=assignment.estimated_hours
    )
    return {"id": assignment_id, "message": "Assignment created"}


@app.put("/api/assignments/{assignment_id}/status")
def update_status(assignment_id: int, status: str):
    if status not in ["pending", "in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    update_assignment_status(assignment_id, status)
    return {"message": f"Assignment {assignment_id} status → {status}"}


@app.delete("/api/assignments/{assignment_id}")
def delete_assignment_route(assignment_id: int):
    delete_assignment(assignment_id)
    return {"message": f"Assignment {assignment_id} deleted"}


@app.get("/api/assignments/deadlines")
def upcoming_deadlines(days: int = 7):
    deadlines = get_upcoming_deadlines(days)
    return {"deadlines": deadlines, "days_ahead": days}


# ─── Subjects ────────────────────────────────────────────────────────────────
@app.get("/api/subjects")
def get_subjects_route():
    subjects = get_subjects()
    return {"subjects": subjects}


@app.post("/api/subjects")
def create_subject(subject: SubjectCreate):
    subject_id = add_subject(
        name=subject.name, code=subject.code,
        teacher=subject.teacher, credits=subject.credits, color=subject.color
    )
    return {"id": subject_id, "message": "Subject added"}


# ─── AI Chat Agent ───────────────────────────────────────────────────────────
@app.post("/api/chat")
def chat(msg: ChatMessage):
    history_tuples = []
    for i in range(0, len(msg.history) - 1, 2):
        h = msg.history[i].get("content", "")
        a = msg.history[i + 1].get("content", "") if i + 1 < len(msg.history) else ""
        history_tuples.append((h, a))
    try:
        response = run_agent(msg.message, chat_history=history_tuples)
        return {"response": response, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        # Return exception text for easier debugging
        return {"error": str(e)}


# ─── Smart Auto-Schedule ─────────────────────────────────────────────────────
@app.post("/api/auto-schedule")
def auto_schedule(req: StudyAutoSchedule):
    """Auto-schedule study sessions for a subject before its deadline"""
    sessions = auto_schedule_study_sessions(
        subject=req.subject,
        total_hours=req.total_hours,
        deadline=req.deadline,
        preferred_slot=req.preferred_slot
    )
    return {"sessions_created": sessions, "message": f"{len(sessions)} study sessions scheduled"}


# ─── Analytics ───────────────────────────────────────────────────────────────
@app.get("/api/analytics")
def get_analytics():
    data = get_analytics_data()
    return data


# ─── Notifications ───────────────────────────────────────────────────────────
@app.post("/api/notifications/send")
def send_notification(req: NotificationRequest, background_tasks: BackgroundTasks):
    if req.type in ["deadline", "both"]:
        background_tasks.add_task(send_deadline_reminder, req.email, req.days_ahead)
    if req.type in ["daily", "both"]:
        background_tasks.add_task(send_daily_schedule, req.email)
    return {"message": f"Notification queued for {req.email}"}


# ─── Google Calendar OAuth ───────────────────────────────────────────────────
@app.get("/api/google/auth-url")
def google_auth_url():
    url = get_google_auth_url()
    return {"auth_url": url}


@app.post("/api/google/callback")
def google_callback(data: GoogleAuthCode):
    token = exchange_code_for_token(data.code)
    if not token:
        raise HTTPException(status_code=400, detail="Google auth failed")
    return {"message": "Google Calendar connected!", "token": token}


@app.post("/api/google/sync")
def google_sync(user_email: str):
    synced = sync_events_to_google(user_email)
    return {"synced": synced, "message": f"{synced} events synced to Google Calendar"}


@app.get("/api/google/import")
def google_import(user_email: str):
    imported = fetch_google_events(user_email)
    return {"imported": imported, "message": f"{imported} events imported from Google Calendar"}
