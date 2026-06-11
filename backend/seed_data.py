"""
seed_data.py - Add sample data for demo/testing
Run: python seed_data.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from datetime import datetime, timedelta
from src.database import init_database, add_subject, add_event, add_assignment

def seed():
    init_database()
    today = datetime.now().date()

    # Subjects
    subjects = [
        ("Data Structures & Algorithms", "CS301", "Dr. Sharma", 4, "#4F46E5"),
        ("Operating Systems", "CS302", "Dr. Patel", 4, "#7C3AED"),
        ("Database Management", "CS303", "Dr. Mehta", 3, "#0EA5E9"),
        ("Computer Networks", "CS304", "Dr. Singh", 3, "#10B981"),
        ("Software Engineering", "CS305", "Dr. Gupta", 3, "#F59E0B"),
    ]
    for s in subjects:
        add_subject(*s)
    print("✅ Subjects added")

    # Events - Weekly classes
    classes = [
        ("DSA Lecture",      "class", "09:00", "10:00", "Room 101", "Data Structures & Algorithms", "high"),
        ("OS Tutorial",      "class", "11:00", "12:00", "Room 205", "Operating Systems",            "medium"),
        ("DBMS Lab",         "class", "14:00", "16:00", "Lab B",    "Database Management",          "medium"),
        ("CN Lecture",       "class", "10:00", "11:00", "Room 301", "Computer Networks",             "medium"),
        ("SE Workshop",      "class", "15:00", "17:00", "Room 102", "Software Engineering",          "low"),
    ]

    for i, (title, etype, start_t, end_t, loc, subject, priority) in enumerate(classes):
        day_offset = i % 5  # Mon–Fri
        for week in range(4):  # 4 weeks of data
            date = today + timedelta(days=day_offset + week * 7 - today.weekday())
            start = f"{date}T{start_t}:00"
            end   = f"{date}T{end_t}:00"
            add_event(title, etype, start, end, loc, "", subject, priority)
    print("✅ Class events added")

    # Exam
    exam_date = today + timedelta(days=14)
    add_event("DSA Mid-Semester Exam", "exam",
              f"{exam_date}T09:00:00", f"{exam_date}T12:00:00",
              "Exam Hall A", "", "Data Structures & Algorithms", "high")
    print("✅ Exam event added")

    # Assignments
    assignments = [
        ("Binary Tree Implementation",     "Data Structures & Algorithms", today + timedelta(days=5),  "high",   8.0),
        ("Process Scheduling Simulation",  "Operating Systems",            today + timedelta(days=7),  "high",   6.0),
        ("ER Diagram – Library System",    "Database Management",          today + timedelta(days=10), "medium", 4.0),
        ("TCP/IP Protocol Analysis",       "Computer Networks",            today + timedelta(days=12), "medium", 3.0),
        ("UML Class Diagram Project",      "Software Engineering",         today + timedelta(days=15), "low",    5.0),
    ]
    for title, subject, deadline, priority, hours in assignments:
        add_assignment(title, subject, f"{deadline}T23:59:00", "", priority, hours)
    print("✅ Assignments added")

    print("\n🎉 Seed data ready! Start the backend and open the frontend.")

if __name__ == "__main__":
    seed()
