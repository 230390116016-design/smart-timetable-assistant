"""
agent.py - Smart Timetable AI Agent (Rule-based + Database)
No external API key required - works completely offline
"""

import os
import json
import re
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import (
    add_event, get_all_events, check_conflicts, delete_event, update_event,
    add_assignment, get_assignments, update_assignment_status,
    get_free_slots, get_upcoming_deadlines, get_subjects, add_subject,
    add_study_block
)


# ─── Helper ───────────────────────────────────────────────────────────────────

def get_current_datetime():
    return datetime.now()

def parse_date_from_text(text):
    """Extract date from natural language"""
    today = datetime.now().date()
    text_lower = text.lower()

    if "today" in text_lower or "aaj" in text_lower:
        return today
    elif "tomorrow" in text_lower or "kal" in text_lower:
        return today + timedelta(days=1)
    elif "monday" in text_lower or "mon" in text_lower:
        days_ahead = (0 - today.weekday()) % 7 or 7
        return today + timedelta(days=days_ahead)
    elif "tuesday" in text_lower or "tue" in text_lower:
        days_ahead = (1 - today.weekday()) % 7 or 7
        return today + timedelta(days=days_ahead)
    elif "wednesday" in text_lower or "wed" in text_lower:
        days_ahead = (2 - today.weekday()) % 7 or 7
        return today + timedelta(days=days_ahead)
    elif "thursday" in text_lower or "thu" in text_lower:
        days_ahead = (3 - today.weekday()) % 7 or 7
        return today + timedelta(days=days_ahead)
    elif "friday" in text_lower or "fri" in text_lower:
        days_ahead = (4 - today.weekday()) % 7 or 7
        return today + timedelta(days=days_ahead)
    elif "saturday" in text_lower or "sat" in text_lower:
        days_ahead = (5 - today.weekday()) % 7 or 7
        return today + timedelta(days=days_ahead)
    elif "sunday" in text_lower or "sun" in text_lower:
        days_ahead = (6 - today.weekday()) % 7 or 7
        return today + timedelta(days=days_ahead)
    elif "next week" in text_lower:
        return today + timedelta(days=7)

    # Try to find time pattern like "10 AM", "9:30"
    return today

def parse_time_from_text(text):
    """Extract time from text like '10 AM', '9:30', '14:00'"""
    patterns = [
        r'(\d{1,2}):(\d{2})\s*(am|pm)?',
        r'(\d{1,2})\s*(am|pm)',
        r'at\s+(\d{1,2})',
    ]
    text_lower = text.lower()
    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            groups = match.groups()
            hour = int(groups[0])
            minute = int(groups[1]) if len(groups) > 1 and groups[1] and groups[1].isdigit() else 0
            ampm = groups[-1] if groups[-1] in ['am', 'pm'] else None
            if ampm == 'pm' and hour != 12:
                hour += 12
            elif ampm == 'am' and hour == 12:
                hour = 0
            return hour, minute
    return 10, 0  # default 10 AM


# ─── Intent Detection ─────────────────────────────────────────────────────────

def detect_intent(text):
    text_lower = text.lower()

    # Deadlines / upcoming — check BEFORE greeting so "what are my deadlines" doesn't match "hi"
    if any(w in text_lower for w in ["deadline", "due", "upcoming", "pending", "baaki", "submit"]):
        return "deadlines"

    # Greetings — only short messages like "hi", "hello", not sentences containing those letters
    words = text_lower.split()
    if any(w in words for w in ["hello", "hi", "hey", "hii", "helo", "namaste", "namaskar"]) and len(words) <= 3:
        return "greeting"

    # Show assignments
    if any(w in text_lower for w in ["assignment", "homework", "task", "kaam"]):
        if any(w in text_lower for w in ["add", "create", "new", "banao", "daalo", "schedule"]):
            return "add_assignment"
        return "get_assignments"

    # Show events / schedule
    if any(w in text_lower for w in ["schedule", "timetable", "event", "class", "lecture", "what do i have", "kya hai"]):
        if any(w in text_lower for w in ["add", "create", "new", "schedule", "set", "daalo", "lagao"]):
            return "add_event"
        return "get_events"

    # Add exam
    if any(w in text_lower for w in ["exam", "test", "quiz", "paper"]):
        if any(w in text_lower for w in ["add", "schedule", "create", "set"]):
            return "add_event"
        return "get_events"

    # Free slots
    if any(w in text_lower for w in ["free", "available", "slot", "gap", "time", "khali"]):
        return "free_slots"

    # Delete
    if any(w in text_lower for w in ["delete", "remove", "cancel", "hatao"]):
        return "delete_event"

    # Subjects
    if any(w in text_lower for w in ["subject", "course", "subjects"]):
        return "get_subjects"

    # Study block
    if any(w in text_lower for w in ["study", "revise", "revision", "padhna", "padhai"]):
        return "study_block"

    # Help
    if any(w in text_lower for w in ["help", "what can", "kya kar", "features", "commands"]):
        return "help"

    return "general"


# ─── Response Handlers ────────────────────────────────────────────────────────

def handle_greeting():
    now = datetime.now().hour
    if now < 12:
        time_greet = "Good morning! 🌅"
    elif now < 17:
        time_greet = "Good afternoon! ☀️"
    else:
        time_greet = "Good evening! 🌙"

    return f"""{time_greet} I'm your Smart Timetable AI Assistant! 🎓

Here's what I can do for you:
📅 **Schedule** classes, exams & study sessions
📝 **Track** assignments and deadlines
🔍 **Find** free time slots
📊 **Show** your upcoming schedule
🗑️ **Delete** events by ID

**Try asking:**
• "What are my deadlines this week?"
• "Show my events for today"
• "Find a free 2-hour slot tomorrow"
• "Add Physics exam next Friday at 10 AM"
• "How many pending assignments do I have?"
"""


def handle_get_events(text):
    today = datetime.now().date()
    text_lower = text.lower()

    if "today" in text_lower or "aaj" in text_lower:
        from_date = f"{today}T00:00:00"
        to_date = f"{today}T23:59:59"
        label = "today"
    elif "tomorrow" in text_lower or "kal" in text_lower:
        tomorrow = today + timedelta(days=1)
        from_date = f"{tomorrow}T00:00:00"
        to_date = f"{tomorrow}T23:59:59"
        label = "tomorrow"
    elif "week" in text_lower or "hafte" in text_lower:
        from_date = f"{today}T00:00:00"
        to_date = f"{(today + timedelta(days=7))}T23:59:59"
        label = "this week"
    else:
        from_date = f"{today}T00:00:00"
        to_date = f"{(today + timedelta(days=7))}T23:59:59"
        label = "this week"

    events = get_all_events(from_date=from_date, to_date=to_date)

    if not events:
        return f"📭 No events found for {label}.\n\nWant to add one? Just say:\n\"Add Physics class tomorrow at 9 AM\""

    result = f"📋 **Your events for {label}** ({len(events)} total):\n\n"
    for e in events:
        emoji = {"class": "📚", "exam": "📝", "study": "📖", "personal": "👤"}.get(e['event_type'], "📌")
        time_str = e['start_datetime'][11:16] if len(e['start_datetime']) > 11 else e['start_datetime']
        end_str = e['end_datetime'][11:16] if len(e['end_datetime']) > 11 else e['end_datetime']
        result += f"{emoji} **{e['title']}**\n"
        result += f"   ⏰ {time_str} – {end_str}"
        if e.get('location'):
            result += f" | 📍 {e['location']}"
        result += f"\n   🆔 ID: {e['id']}\n\n"

    return result


def handle_deadlines(text):
    text_lower = text.lower()
    days = 7
    if "month" in text_lower or "mahine" in text_lower:
        days = 30
    elif "today" in text_lower:
        days = 1
    elif "week" in text_lower:
        days = 7

    deadlines = get_upcoming_deadlines(days)
    assignments = get_assignments(status="pending")

    if not deadlines and not assignments:
        return f"✅ Great news! No pending deadlines in the next {days} days!\n\nYou're all caught up. 🎉"

    result = f"⚠️ **Upcoming Deadlines & Pending Work:**\n\n"

    if deadlines:
        result += f"📅 **Due in next {days} days:**\n"
        for d in deadlines:
            p_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(d['priority'], "⚪")
            deadline_date = d['deadline'][:10]
            result += f"{p_emoji} **{d['title']}**\n"
            result += f"   📖 {d['subject']} | Due: {deadline_date} | ~{d['estimated_hours']}h work\n\n"

    if assignments:
        pending = [a for a in assignments if a['status'] == 'pending']
        if pending:
            result += f"\n📝 **All Pending Assignments ({len(pending)}):**\n"
            for a in pending[:5]:
                p_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(a['priority'], "⚪")
                result += f"{p_emoji} {a['title']} ({a['subject']})\n"
            if len(pending) > 5:
                result += f"   ...and {len(pending)-5} more\n"

    result += "\n💡 Say \"mark assignment [ID] done\" to complete one!"
    return result


def handle_get_assignments(text):
    text_lower = text.lower()

    if "complete" in text_lower or "done" in text_lower or "finished" in text_lower:
        status = "completed"
    elif "progress" in text_lower or "working" in text_lower:
        status = "in_progress"
    else:
        status = "pending"

    assignments = get_assignments(status=status)
    all_assignments = get_assignments()

    total = len(all_assignments) if all_assignments else 0
    pending_count = len([a for a in all_assignments if a['status'] == 'pending']) if all_assignments else 0
    completed_count = len([a for a in all_assignments if a['status'] == 'completed']) if all_assignments else 0

    result = f"📊 **Assignment Summary:**\n"
    result += f"   Total: {total} | ⏳ Pending: {pending_count} | ✅ Done: {completed_count}\n\n"

    if not assignments:
        result += f"No {status} assignments found!\n"
        return result

    result += f"📝 **{status.capitalize()} Assignments ({len(assignments)}):**\n\n"
    for a in assignments:
        p = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(a['priority'], "⚪")
        s = {"pending": "⏳", "in_progress": "🔄", "completed": "✅"}.get(a['status'], "❓")
        deadline_date = a['deadline'][:10] if a.get('deadline') else "No deadline"
        result += f"{p} [{a['id']}] **{a['title']}**\n"
        result += f"   {s} {a['subject']} | Due: {deadline_date}\n\n"

    return result


def handle_add_event(text):
    text_lower = text.lower()
    today = datetime.now().date()

    # Detect event type
    if "exam" in text_lower or "test" in text_lower:
        event_type = "exam"
        default_duration = 3
    elif "study" in text_lower or "revision" in text_lower:
        event_type = "study"
        default_duration = 2
    elif "personal" in text_lower or "meeting" in text_lower:
        event_type = "personal"
        default_duration = 1
    else:
        event_type = "class"
        default_duration = 1

    # Parse date
    event_date = parse_date_from_text(text)

    # Parse time
    hour, minute = parse_time_from_text(text)

    # Extract title - look for subject words
    title = "New Event"
    subjects_keywords = ["physics", "math", "maths", "chemistry", "biology", "english",
                        "hindi", "history", "geography", "computer", "science", "cn",
                        "dbms", "os", "dsa", "algorithms", "networks", "java", "python"]
    for subj in subjects_keywords:
        if subj in text_lower:
            title = f"{subj.capitalize()} {event_type.capitalize()}"
            break

    # If title still default, extract from text
    if title == "New Event":
        words = text.split()
        for i, w in enumerate(words):
            if w.lower() in ["add", "schedule", "create", "set"]:
                remaining = " ".join(words[i+1:])
                # Clean up
                remaining = re.sub(r'\b(exam|class|test|on|at|next|this|for|a|an|the)\b', '', remaining, flags=re.IGNORECASE)
                remaining = re.sub(r'\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b', '', remaining, flags=re.IGNORECASE)
                remaining = re.sub(r'\d+\s*(am|pm|:)', '', remaining, flags=re.IGNORECASE)
                title = remaining.strip()
                if len(title) > 3:
                    title = title.split()[0].capitalize() + f" {event_type.capitalize()}" if title.split() else "New Event"
                break

    # Check recurrence
    recurrence = ""
    if "every week" in text_lower or "weekly" in text_lower or "every monday" in text_lower or \
       "every tuesday" in text_lower or "every wednesday" in text_lower or "semester" in text_lower:
        recurrence = "FREQ=WEEKLY;COUNT=16"

    start_dt = datetime.combine(event_date, datetime.min.time().replace(hour=hour, minute=minute))
    end_dt = start_dt + timedelta(hours=default_duration)

    start_str = start_dt.strftime("%Y-%m-%dT%H:%M:%S")
    end_str = end_dt.strftime("%Y-%m-%dT%H:%M:%S")

    # Check conflicts first
    conflicts = check_conflicts(start_str, end_str)
    if conflicts:
        conflict_names = ", ".join([c['title'] for c in conflicts[:2]])
        # Try to find next free slot
        slots = get_free_slots(event_date.isoformat(), default_duration * 60)
        suggestion = ""
        if slots:
            suggestion = f"\n\n💡 **Free slot available:** {slots[0]['start']} – {slots[0]['end']}"

        return f"⚠️ **Conflict detected!**\n\nThis time clashes with: **{conflict_names}**{suggestion}\n\nWant me to schedule at a different time? Tell me your preferred time!"

    try:
        event_id, _ = add_event(
            title=title,
            event_type=event_type,
            start_dt=start_str,
            end_dt=end_str,
            recurrence=recurrence
        )

        recurring_msg = "\n🔄 Scheduled for **16 weeks** (full semester)!" if recurrence else ""
        return f"✅ **Event Added Successfully!**\n\n📅 **{title}**\n⏰ {start_dt.strftime('%B %d, %Y')} at {start_dt.strftime('%I:%M %p')} – {end_dt.strftime('%I:%M %p')}\n📌 Type: {event_type.capitalize()}\n🆔 Event ID: {event_id}{recurring_msg}\n\n_Tip: Check your calendar to see it!_"
    except Exception as e:
        return f"❌ Could not add event: {str(e)}\n\nTry: \"Add Physics class tomorrow at 10 AM\""


def handle_free_slots(text):
    event_date = parse_date_from_text(text)
    text_lower = text.lower()

    # Parse duration
    duration = 60
    duration_match = re.search(r'(\d+)\s*hour', text_lower)
    if duration_match:
        duration = int(duration_match.group(1)) * 60
    elif "30 min" in text_lower or "half hour" in text_lower:
        duration = 30
    elif "2 hour" in text_lower:
        duration = 120

    slots = get_free_slots(event_date.isoformat(), duration)
    date_label = "today" if event_date == datetime.now().date() else event_date.strftime("%B %d")

    if not slots:
        tomorrow = event_date + timedelta(days=1)
        slots_tomorrow = get_free_slots(tomorrow.isoformat(), duration)
        if slots_tomorrow:
            result = f"😔 No free {duration}-minute slots on {date_label}.\n\n"
            result += f"✅ **Available tomorrow ({tomorrow.strftime('%B %d')}):**\n"
            for i, s in enumerate(slots_tomorrow[:3], 1):
                result += f"  {i}. {s['start']} – {s['end']} ({s['duration_minutes']} min)\n"
            return result
        return f"😔 No free {duration}-minute slots found for {date_label}. Your schedule is packed!"

    result = f"🟢 **Free slots on {date_label}** (min {duration} min):\n\n"
    for i, s in enumerate(slots[:5], 1):
        result += f"  {i}. ⏰ {s['start']} – {s['end']} ({s['duration_minutes']} min available)\n"

    result += f"\n💡 Want to schedule something? Say:\n\"Add study session {date_label} at {slots[0]['start'][-5:]}\""
    return result


def handle_study_block(text):
    text_lower = text.lower()
    event_date = parse_date_from_text(text)

    # Extract subject
    subject = "General"
    subjects_keywords = ["physics", "math", "maths", "chemistry", "biology", "english",
                        "hindi", "history", "computer", "science", "cn", "dbms",
                        "os", "dsa", "algorithms", "networks", "java", "python"]
    for subj in subjects_keywords:
        if subj in text_lower:
            subject = subj.capitalize()
            break

    # Duration
    duration = 120
    duration_match = re.search(r'(\d+)\s*hour', text_lower)
    if duration_match:
        duration = int(duration_match.group(1)) * 60

    slots = get_free_slots(event_date.isoformat(), duration)
    if not slots:
        return f"😔 No free {duration//60}-hour slot found for {subject} study on {event_date}.\n\nTry a different day or shorter duration!"

    slot = slots[0]
    try:
        block_id = add_study_block(
            subject=subject,
            start_dt=slot["start_iso"],
            end_dt=slot["end_iso"],
            duration_minutes=duration
        )
        return f"📖 **Study Block Scheduled!**\n\n✅ {subject} study session\n⏰ {slot['start']} – {slot['end']}\n⏱️ Duration: {duration//60} hour(s)\n🆔 Block ID: {block_id}\n\n_Best of luck with your studies! 💪_"
    except Exception as e:
        return f"❌ Could not schedule study block: {str(e)}"


def handle_subjects():
    subjects = get_subjects()
    if not subjects:
        return "📭 No subjects registered yet.\n\nAdd subjects via the Subjects tab in the app!"

    result = f"📚 **Your Registered Subjects ({len(subjects)}):**\n\n"
    for s in subjects:
        result += f"  • **{s['name']}**"
        if s.get('code'):
            result += f" ({s['code']})"
        if s.get('teacher'):
            result += f" — {s['teacher']}"
        result += "\n"
    return result


def handle_help():
    return """🤖 **Smart Timetable AI Assistant — Help**

**📅 Schedule Events:**
• "Add Physics class tomorrow at 9 AM"
• "Schedule Math exam next Friday at 10 AM"
• "Add CN lecture every Monday at 11 AM for 16 weeks"

**📝 Assignments:**
• "How many pending assignments do I have?"
• "Show all assignments"
• "What are my deadlines this week?"

**🔍 Free Slots:**
• "Find a free 2-hour slot tomorrow"
• "Am I free on Friday afternoon?"

**📊 View Schedule:**
• "What do I have today?"
• "Show this week's events"

**📚 Subjects:**
• "List all subjects"

**💡 Tips:**
• Say day names: Monday, Tuesday, Friday, etc.
• Mention AM/PM for time: "at 10 AM", "at 2 PM"
• I can detect: class, exam, study, personal events
"""


def handle_general(text):
    today = datetime.now().date()
    events_today = get_all_events(
        from_date=f"{today}T00:00:00",
        to_date=f"{today}T23:59:59"
    )
    pending = get_assignments(status="pending")
    deadlines = get_upcoming_deadlines(3)

    response = f"🤔 I'm not sure what you mean, but here's your quick summary:\n\n"

    response += f"📅 **Today ({today.strftime('%B %d')}):** {len(events_today) if events_today else 0} event(s)\n"
    response += f"📝 **Pending assignments:** {len(pending) if pending else 0}\n"
    response += f"⚠️ **Deadlines in 3 days:** {len(deadlines) if deadlines else 0}\n\n"

    response += "Try asking:\n"
    response += "• \"Show today's schedule\"\n"
    response += "• \"What are my deadlines?\"\n"
    response += "• \"Find free slot tomorrow\"\n"
    response += "• \"Help\" for all commands"

    return response


# ─── Main Agent Runner ────────────────────────────────────────────────────────

def run_agent(user_input: str, chat_history: list = None) -> str:
    """Main agent - detects intent and gives smart responses"""
    try:
        text = user_input.strip()
        if not text:
            return handle_greeting()

        intent = detect_intent(text)

        if intent == "greeting":
            return handle_greeting()
        elif intent == "deadlines":
            return handle_deadlines(text)
        elif intent == "get_assignments":
            return handle_get_assignments(text)
        elif intent == "add_assignment":
            return f"📝 To add an assignment, please use the **Assignments tab** in the app, or tell me:\n\"Add [title] for [subject] due [date]\"\n\nExample: \"Add DSA project for Computer Science due Friday\""
        elif intent == "get_events":
            return handle_get_events(text)
        elif intent == "add_event":
            return handle_add_event(text)
        elif intent == "free_slots":
            return handle_free_slots(text)
        elif intent == "delete_event":
            # Try to find ID in text
            id_match = re.search(r'\b(\d+)\b', text)
            if id_match:
                event_id = int(id_match.group(1))
                try:
                    delete_event(event_id)
                    return f"✅ Event #{event_id} deleted successfully!"
                except:
                    return f"❌ Could not find event #{event_id}. Check the ID and try again."
            return "Please provide the event ID to delete.\nExample: \"Delete event 5\"\n\nCheck event IDs by saying \"Show today's events\""
        elif intent == "get_subjects":
            return handle_subjects()
        elif intent == "study_block":
            return handle_study_block(text)
        elif intent == "help":
            return handle_help()
        else:
            return handle_general(text)

    except Exception as e:
        return f"⚠️ Something went wrong: {str(e)}\n\nTry asking: \"Show my schedule\" or \"What are my deadlines?\""


def suggest_conflict_resolution(start_dt: str, end_dt: str, conflicts: list) -> list:
    suggestions = []
    start = datetime.fromisoformat(start_dt)
    end = datetime.fromisoformat(end_dt)
    duration = int((end - start).total_seconds() / 60)

    date_str = start.date().isoformat()
    free = get_free_slots(date_str, duration)
    for slot in free[:2]:
        suggestions.append({
            "type": "same_day",
            "start": slot["start_iso"],
            "end": slot["end_iso"],
            "label": f"Today: {slot['start']} – {slot['end']}"
        })

    if len(suggestions) < 3:
        next_day = (start + timedelta(days=1)).date().isoformat()
        free_next = get_free_slots(next_day, duration)
        for slot in free_next[:1]:
            suggestions.append({
                "type": "next_day",
                "start": slot["start_iso"],
                "end": slot["end_iso"],
                "label": f"Tomorrow: {slot['start']} – {slot['end']}"
            })

    return suggestions
