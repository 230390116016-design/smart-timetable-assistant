"""
scheduler.py - Smart Auto-Scheduling Engine (Track B)
Automatically distributes study sessions before a deadline
"""

from datetime import datetime, timedelta
from src.database import get_free_slots, add_event, add_study_block


SLOT_PREFERENCES = {
    "morning":   (8, 12),   # 8 AM – 12 PM
    "afternoon": (13, 17),  # 1 PM – 5 PM
    "evening":   (18, 22),  # 6 PM – 10 PM
}

MAX_SESSION_HOURS = 2    # Never schedule more than 2h in one block
MIN_SESSION_HOURS = 0.5  # At least 30 min


def auto_schedule_study_sessions(subject: str, total_hours: float,
                                  deadline: str, preferred_slot: str = "morning") -> list:
    """
    Distribute total_hours of study across available slots before deadline.
    Returns list of created study block IDs.
    """
    deadline_dt = datetime.fromisoformat(deadline)
    today = datetime.now().date()
    days_until_deadline = (deadline_dt.date() - today).days

    if days_until_deadline <= 0:
        return []

    # How many sessions? Break total into 1-2h chunks
    session_hours = min(MAX_SESSION_HOURS, max(MIN_SESSION_HOURS, total_hours / max(days_until_deadline, 1)))
    session_minutes = int(session_hours * 60)
    sessions_needed = int(total_hours / session_hours)

    pref_start, pref_end = SLOT_PREFERENCES.get(preferred_slot, (8, 22))
    created_sessions = []

    for day_offset in range(days_until_deadline):
        if len(created_sessions) >= sessions_needed:
            break

        check_date = (datetime.now() + timedelta(days=day_offset)).date()
        date_str = check_date.isoformat()
        free_slots = get_free_slots(date_str, session_minutes)

        for slot in free_slots:
            if len(created_sessions) >= sessions_needed:
                break

            slot_start = datetime.fromisoformat(slot["start_iso"])
            if pref_start <= slot_start.hour < pref_end:
                slot_end_iso = (slot_start + timedelta(minutes=session_minutes)).isoformat()

                # Add as both an event and a study block
                event_id, _ = add_event(
                    title=f"Study: {subject}",
                    event_type="study",
                    start_dt=slot["start_iso"],
                    end_dt=slot_end_iso,
                    subject=subject,
                    priority="high",
                    color="#10B981",
                    description=f"Auto-scheduled study session. Deadline: {deadline}"
                )

                block_id = add_study_block(
                    subject=subject,
                    start_dt=slot["start_iso"],
                    end_dt=slot_end_iso,
                    duration_minutes=session_minutes
                )

                created_sessions.append({
                    "event_id": event_id,
                    "block_id": block_id,
                    "date": date_str,
                    "start": slot["start"],
                    "end": datetime.fromisoformat(slot_end_iso).strftime("%I:%M %p"),
                    "duration_minutes": session_minutes
                })
                break  # One session per day

    return created_sessions
