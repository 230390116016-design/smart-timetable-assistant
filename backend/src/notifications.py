"""
notifications.py - Email & WhatsApp Notifications (Track B)
Supports Gmail SMTP + Twilio WhatsApp
"""

import smtplib
import os
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

from src.database import get_upcoming_deadlines, get_all_events

EMAIL_SENDER   = os.getenv("EMAIL_SENDER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
SMTP_SERVER    = "smtp.gmail.com"
SMTP_PORT      = 587

# Twilio (WhatsApp)
TWILIO_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WA_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")


# ─── Email ────────────────────────────────────────────────────────────────────

def build_html_email(title: str, body_html: str) -> str:
    return f"""
    <html><body style="font-family: Inter, Arial, sans-serif; max-width:600px; margin:0 auto; color:#1e293b;">
      <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;">
        <h2 style="color:white;margin:0;font-size:20px;">📅 Smart Timetable Assistant</h2>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">{title}</p>
      </div>
      <div style="padding:24px;background:#f8fafc;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
        {body_html}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="color:#94a3b8;font-size:12px;">
          Sent by Smart Timetable Assistant · Study smart, not hard! 💪
        </p>
      </div>
    </body></html>
    """


def send_email(to_email: str, subject: str, body_text: str, body_html: str = None) -> tuple:
    if not EMAIL_SENDER or not EMAIL_PASSWORD:
        return False, "Email credentials not configured in .env"
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = EMAIL_SENDER
        msg['To']      = to_email
        msg.attach(MIMEText(body_text, 'plain'))
        if body_html:
            msg.attach(MIMEText(body_html, 'html'))
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
        return True, "✅ Email sent!"
    except smtplib.SMTPAuthenticationError:
        return False, "❌ Gmail auth failed. Use App Password (2FA required)."
    except Exception as e:
        return False, f"❌ Email error: {str(e)}"


def send_deadline_reminder(to_email: str, days_ahead: int = 2) -> tuple:
    deadlines = get_upcoming_deadlines(days_ahead)
    if not deadlines:
        return True, f"No deadlines in next {days_ahead} days."

    rows = ""
    plain = f"🚨 Upcoming deadlines (next {days_ahead} days):\n\n"
    for d in deadlines:
        color = {"high": "#EF4444", "medium": "#F59E0B", "low": "#10B981"}.get(d['priority'], "#6B7280")
        rows += f"""
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">{d['title']}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">{d['subject']}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">{d['deadline'][:16]}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">
            <span style="background:{color};color:white;padding:2px 8px;border-radius:9999px;font-size:12px;">
              {d['priority'].upper()}
            </span>
          </td>
        </tr>"""
        plain += f"• {d['title']} ({d['subject']}) – {d['deadline'][:16]} [{d['priority'].upper()}]\n"

    body_html = build_html_email(
        f"You have {len(deadlines)} upcoming deadline(s)",
        f"""<p>Here are your upcoming assignment deadlines:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#4F46E5;color:white;">
              <th style="padding:10px;text-align:left;">Assignment</th>
              <th style="padding:10px;text-align:left;">Subject</th>
              <th style="padding:10px;text-align:left;">Deadline</th>
              <th style="padding:10px;text-align:left;">Priority</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <p style="margin-top:16px;color:#64748b;">Start early – jaldi shuru karo! 😊</p>"""
    )

    return send_email(to_email, f"⚠️ {len(deadlines)} upcoming deadline(s) – Action required!", plain, body_html)


def send_daily_schedule(to_email: str) -> tuple:
    today = datetime.now().date().isoformat()
    events = get_all_events(from_date=f"{today}T00:00:00", to_date=f"{today}T23:59:59")

    plain = f"📅 Today's schedule ({today}):\n\n"
    rows = ""
    if not events:
        plain += "No events today. Free day! 🎉"
        rows = '<tr><td colspan="3" style="padding:20px;text-align:center;color:#64748b;">No events today 🎉</td></tr>'
    else:
        for e in events:
            emoji = {"class": "📚", "exam": "📝", "study": "📖", "personal": "👤"}.get(e['event_type'], "📌")
            s = datetime.fromisoformat(e['start_datetime']).strftime("%I:%M %p")
            en = datetime.fromisoformat(e['end_datetime']).strftime("%I:%M %p")
            rows += f"""
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">{emoji} {e['title']}</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">{s} – {en}</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">{e.get('location','') or '–'}</td>
            </tr>"""
            plain += f"• {e['title']} | {s} – {en}\n"

    body_html = build_html_email(
        f"Your schedule for {today}",
        f"""<table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#4F46E5;color:white;">
              <th style="padding:10px;text-align:left;">Event</th>
              <th style="padding:10px;text-align:left;">Time</th>
              <th style="padding:10px;text-align:left;">Location</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>"""
    )

    return send_email(to_email, f"📅 Today's schedule – {today}", plain, body_html)


# ─── WhatsApp via Twilio ──────────────────────────────────────────────────────

def send_whatsapp(to_number: str, message: str) -> tuple:
    """
    Send WhatsApp message via Twilio sandbox.
    to_number format: '+919876543210'
    """
    if not TWILIO_SID or not TWILIO_TOKEN:
        return False, "Twilio credentials not configured in .env"
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
        data = {
            "From": TWILIO_WA_FROM,
            "To":   f"whatsapp:{to_number}",
            "Body": message
        }
        resp = requests.post(url, data=data, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=10)
        if resp.status_code == 201:
            return True, "✅ WhatsApp message sent!"
        return False, f"❌ Twilio error: {resp.text}"
    except Exception as e:
        return False, f"❌ WhatsApp error: {str(e)}"


def send_whatsapp_deadline_reminder(to_number: str, days_ahead: int = 1) -> tuple:
    deadlines = get_upcoming_deadlines(days_ahead)
    if not deadlines:
        return True, "No urgent deadlines."
    msg = f"🚨 *Smart Timetable – Deadline Reminder*\n\n"
    for d in deadlines:
        p = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(d['priority'], "⚪")
        msg += f"{p} *{d['title']}*\n   📖 {d['subject']}\n   ⏰ {d['deadline'][:16]}\n\n"
    msg += "Don't forget! Good luck 💪"
    return send_whatsapp(to_number, msg)
