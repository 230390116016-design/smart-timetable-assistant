"""
database.py - PostgreSQL version (Supabase)
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

def init_database():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            event_type TEXT DEFAULT 'class',
            start_datetime TEXT NOT NULL,
            end_datetime TEXT NOT NULL,
            location TEXT DEFAULT '',
            description TEXT DEFAULT '',
            subject TEXT DEFAULT '',
            priority TEXT DEFAULT 'medium',
            color TEXT DEFAULT '#4F46E5',
            recurrence TEXT DEFAULT '',
            google_event_id TEXT DEFAULT '',
            outlook_event_id TEXT DEFAULT '',
            reminder_sent INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assignments (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            subject TEXT NOT NULL,
            deadline TEXT NOT NULL,
            description TEXT DEFAULT '',
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            estimated_hours REAL DEFAULT 1.0,
            actual_hours REAL DEFAULT 0.0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subjects (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            code TEXT DEFAULT '',
            teacher TEXT DEFAULT '',
            credits INTEGER DEFAULT 3,
            color TEXT DEFAULT '#4F46E5'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS study_blocks (
            id SERIAL PRIMARY KEY,
            subject TEXT NOT NULL,
            start_datetime TEXT NOT NULL,
            end_datetime TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            assignment_id INTEGER,
            status TEXT DEFAULT 'planned',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_preferences (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS google_tokens (
            user_email TEXT PRIMARY KEY,
            token_data TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("✅ Track B database initialized")


def add_event(title, event_type, start_dt, end_dt, location="", description="",
              subject="", priority="medium", color="#4F46E5", recurrence=""):
    conn = get_connection()
    cursor = conn.cursor()
    conflicts = check_conflicts(start_dt, end_dt)
    cursor.execute("""
        INSERT INTO events (title, event_type, start_datetime, end_datetime,
            location, description, subject, priority, color, recurrence)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
    """, (title, event_type, start_dt, end_dt, location, description, subject,
          priority, color, recurrence))
    event_id = cursor.fetchone()["id"]
    conn.commit()
    conn.close()
    return event_id, conflicts


def get_all_events(from_date=None, to_date=None, event_type=None):
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM events WHERE 1=1"
    params = []
    if from_date:
        query += " AND start_datetime >= %s"
        params.append(from_date)
    if to_date:
        query += " AND start_datetime <= %s"
        params.append(to_date)
    if event_type:
        query += " AND event_type = %s"
        params.append(event_type)
    query += " ORDER BY start_datetime ASC"
    cursor.execute(query, params)
    events = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return events


def check_conflicts(start_dt, end_dt, exclude_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM events WHERE NOT (end_datetime <= %s OR start_datetime >= %s)"
    params = [start_dt, end_dt]
    if exclude_id:
        query += " AND id != %s"
        params.append(exclude_id)
    cursor.execute(query, params)
    conflicts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return conflicts


def delete_event(event_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE id = %s", (event_id,))
    conn.commit()
    conn.close()


def update_event(event_id, **kwargs):
    conn = get_connection()
    cursor = conn.cursor()
    set_clause = ", ".join([f"{k} = %s" for k in kwargs.keys()])
    values = list(kwargs.values()) + [event_id]
    cursor.execute(f"UPDATE events SET {set_clause} WHERE id = %s", values)
    conn.commit()
    conn.close()


def get_free_slots(date_str, duration_minutes=60):
    day_start = f"{date_str}T08:00:00"
    day_end = f"{date_str}T22:00:00"
    events = get_all_events(from_date=day_start, to_date=day_end)
    events.sort(key=lambda x: x['start_datetime'])
    free_slots = []
    current_time = datetime.fromisoformat(day_start)
    end_time = datetime.fromisoformat(day_end)
    for event in events:
        event_start = datetime.fromisoformat(event['start_datetime'])
        event_end = datetime.fromisoformat(event['end_datetime'])
        gap = (event_start - current_time).total_seconds() / 60
        if gap >= duration_minutes:
            free_slots.append({
                "start": current_time.strftime("%I:%M %p"),
                "end": event_start.strftime("%I:%M %p"),
                "start_iso": current_time.isoformat(),
                "end_iso": event_start.isoformat(),
                "duration_minutes": int(gap)
            })
        if event_end > current_time:
            current_time = event_end
    remaining = (end_time - current_time).total_seconds() / 60
    if remaining >= duration_minutes:
        free_slots.append({
            "start": current_time.strftime("%I:%M %p"),
            "end": end_time.strftime("%I:%M %p"),
            "start_iso": current_time.isoformat(),
            "end_iso": end_time.isoformat(),
            "duration_minutes": int(remaining)
        })
    return free_slots


def add_assignment(title, subject, deadline, description="", priority="medium", estimated_hours=1.0):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO assignments (title, subject, deadline, description, priority, estimated_hours)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
    """, (title, subject, deadline, description, priority, estimated_hours))
    assignment_id = cursor.fetchone()["id"]
    conn.commit()
    conn.close()
    return assignment_id


def get_assignments(status=None, subject=None):
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM assignments WHERE 1=1"
    params = []
    if status:
        query += " AND status = %s"
        params.append(status)
    if subject:
        query += " AND subject LIKE %s"
        params.append(f"%{subject}%")
    query += " ORDER BY deadline ASC"
    cursor.execute(query, params)
    assignments = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return assignments


def update_assignment_status(assignment_id, status):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE assignments SET status = %s WHERE id = %s", (status, assignment_id))
    conn.commit()
    conn.close()


def delete_assignment(assignment_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assignments WHERE id = %s", (assignment_id,))
    conn.commit()
    conn.close()


def get_upcoming_deadlines(days=7):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    future = (datetime.now() + timedelta(days=days)).isoformat()
    cursor.execute("""
        SELECT * FROM assignments
        WHERE deadline BETWEEN %s AND %s AND status != 'completed'
        ORDER BY deadline ASC
    """, (now, future))
    deadlines = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return deadlines


def add_subject(name, code="", teacher="", credits=3, color="#4F46E5"):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO subjects (name, code, teacher, credits, color)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (name, code, teacher, credits, color))
        subject_id = cursor.fetchone()["id"]
        conn.commit()
    except Exception:
        subject_id = None
        conn.rollback()
    conn.close()
    return subject_id


def get_subjects():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM subjects ORDER BY name")
    subjects = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return subjects


def add_study_block(subject, start_dt, end_dt, duration_minutes, assignment_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO study_blocks (subject, start_datetime, end_datetime, duration_minutes, assignment_id)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
    """, (subject, start_dt, end_dt, duration_minutes, assignment_id))
    block_id = cursor.fetchone()["id"]
    conn.commit()
    conn.close()
    return block_id


def get_study_blocks(subject=None, status=None):
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM study_blocks WHERE 1=1"
    params = []
    if subject:
        query += " AND subject = %s"
        params.append(subject)
    if status:
        query += " AND status = %s"
        params.append(status)
    query += " ORDER BY start_datetime ASC"
    cursor.execute(query, params)
    blocks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return blocks


def get_analytics_data():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type")
    events_by_type = [dict(row) for row in cursor.fetchall()]
    cursor.execute("SELECT status, COUNT(*) as count FROM assignments GROUP BY status")
    assignments_by_status = [dict(row) for row in cursor.fetchall()]
    cursor.execute("SELECT subject, COUNT(*) as count FROM assignments GROUP BY subject ORDER BY count DESC LIMIT 5")
    assignments_by_subject = [dict(row) for row in cursor.fetchall()]
    cursor.execute("SELECT COUNT(*) as total FROM events")
    total_events = cursor.fetchone()["total"]
    cursor.execute("SELECT COUNT(*) as total FROM assignments WHERE status != 'completed'")
    pending_assignments = cursor.fetchone()["total"]
    cursor.execute("SELECT COUNT(*) as total FROM subjects")
    total_subjects = cursor.fetchone()["total"]
    conn.close()
    return {
        "events_by_type": events_by_type,
        "assignments_by_status": assignments_by_status,
        "assignments_by_subject": assignments_by_subject,
        "summary": {
            "total_events": total_events,
            "pending_assignments": pending_assignments,
            "total_subjects": total_subjects
        }
    }


def save_google_token(user_email, token_data):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO google_tokens (user_email, token_data, updated_at)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_email) DO UPDATE SET token_data = %s, updated_at = %s
    """, (user_email, token_data, datetime.now().isoformat(),
          token_data, datetime.now().isoformat()))
    conn.commit()
    conn.close()


def get_google_token(user_email):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT token_data FROM google_tokens WHERE user_email = %s", (user_email,))
    row = cursor.fetchone()
    conn.close()
    return row["token_data"] if row else None
