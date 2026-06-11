"""
google_calendar.py - Google Calendar OAuth2 Integration (Track B)
Full sync: import events FROM Google, export events TO Google
"""

import os
import json
from datetime import datetime, timedelta, timezone

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from src.database import (
    get_all_events, update_event, add_event,
    save_google_token, get_google_token
)

SCOPES = ["https://www.googleapis.com/auth/calendar"]
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/google/callback")

CLIENT_CONFIG = {
    "web": {
        "client_id":     os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "auth_uri":      "https://accounts.google.com/o/oauth2/auth",
        "token_uri":     "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI]
    }
}


def get_google_auth_url() -> str:
    if not CLIENT_CONFIG["web"]["client_id"]:
        return "GOOGLE_CLIENT_ID not configured. Add it to .env"
    flow = Flow.from_client_config(CLIENT_CONFIG, scopes=SCOPES, redirect_uri=REDIRECT_URI)
    auth_url, _ = flow.authorization_url(access_type='offline', include_granted_scopes='true')
    return auth_url


def exchange_code_for_token(code: str) -> dict:
    try:
        flow = Flow.from_client_config(CLIENT_CONFIG, scopes=SCOPES, redirect_uri=REDIRECT_URI)
        flow.fetch_token(code=code)
        creds = flow.credentials
        token_data = {
            "token":         creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri":     creds.token_uri,
            "client_id":     creds.client_id,
            "client_secret": creds.client_secret,
            "scopes":        list(creds.scopes) if creds.scopes else []
        }
        return token_data
    except Exception as e:
        print(f"Google token exchange error: {e}")
        return None


def _get_service(user_email: str):
    """Build authenticated Google Calendar service"""
    token_json = get_google_token(user_email)
    if not token_json:
        return None
    token_data = json.loads(token_json)
    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri"),
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        scopes=token_data.get("scopes")
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_data["token"] = creds.token
        save_google_token(user_email, json.dumps(token_data))
    return build("calendar", "v3", credentials=creds)


def sync_events_to_google(user_email: str) -> int:
    """Push local events (without google_event_id) to Google Calendar"""
    service = _get_service(user_email)
    if not service:
        return 0

    events = get_all_events()
    synced = 0
    for e in events:
        if e.get("google_event_id"):
            continue  # Already synced
        try:
            gcal_event = {
                "summary": e["title"],
                "location": e.get("location", ""),
                "description": e.get("description", ""),
                "start": {"dateTime": e["start_datetime"], "timeZone": "Asia/Kolkata"},
                "end":   {"dateTime": e["end_datetime"],   "timeZone": "Asia/Kolkata"},
                "colorId": _priority_to_color_id(e.get("priority", "medium"))
            }
            created = service.events().insert(calendarId="primary", body=gcal_event).execute()
            update_event(e["id"], google_event_id=created["id"])
            synced += 1
        except HttpError as err:
            print(f"Google sync error for event {e['id']}: {err}")
    return synced


def fetch_google_events(user_email: str) -> int:
    """Pull upcoming events from Google Calendar into local DB"""
    service = _get_service(user_email)
    if not service:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    try:
        result = service.events().list(
            calendarId="primary",
            timeMin=now,
            maxResults=50,
            singleEvents=True,
            orderBy="startTime"
        ).execute()

        items = result.get("items", [])
        imported = 0
        for item in items:
            start = item["start"].get("dateTime", item["start"].get("date"))
            end   = item["end"].get("dateTime",   item["end"].get("date"))
            if not start or not end:
                continue
            # Normalize to no timezone offset for SQLite storage
            start = start[:19]
            end   = end[:19]
            _, conflicts = add_event(
                title=item.get("summary", "Imported Event"),
                event_type="class",
                start_dt=start,
                end_dt=end,
                location=item.get("location", ""),
                description=item.get("description", ""),
            )
            imported += 1
        return imported
    except HttpError as err:
        print(f"Google fetch error: {err}")
        return 0


def _priority_to_color_id(priority: str) -> str:
    return {"high": "11", "medium": "5", "low": "2"}.get(priority, "1")
