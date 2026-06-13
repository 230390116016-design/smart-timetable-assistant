"""
auth.py - JWT Authentication for Smart Timetable Assistant
"""
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from src.database import get_connection

SECRET_KEY = os.getenv("SECRET_KEY", "smart-timetable-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def init_users_table():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def register_user(name: str, email: str, password: str) -> tuple:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        password_hash = hash_password(password)
        cursor.execute("""
            INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s) RETURNING id
        """, (name, email, password_hash))
        user_id = cursor.fetchone()["id"]
        conn.commit()
        token = create_access_token({"sub": email, "name": name, "id": user_id})
        return True, token, "Registration successful!"
    except Exception as e:
        conn.rollback()
        if "unique" in str(e).lower():
            return False, None, "Email already registered!"
        return False, None, f"Error: {str(e)}"
    finally:
        conn.close()


def login_user(email: str, password: str) -> tuple:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user:
            return False, None, "Email not found!"
        if not verify_password(password, user["password_hash"]):
            return False, None, "Wrong password!"
        token = create_access_token({"sub": email, "name": user["name"], "id": user["id"]})
        return True, token, "Login successful!"
    except Exception as e:
        return False, None, f"Error: {str(e)}"
    finally:
        conn.close()