from datetime import datetime, timedelta
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
import hashlib
import secrets
import re
from typing import Dict, Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_LOGIN_ATTEMPTS = 5
LOCK_MINUTES = 15
VERIFY_TOKEN_HOURS = 24
RESET_TOKEN_MINUTES = 30
RESEND_COOLDOWN_SECONDS = 60

_users: Dict[str, dict] = {}
_verification_tokens: Dict[str, dict] = {}
_reset_tokens: Dict[str, dict] = {}
_sessions: Dict[str, dict] = {}


def _now() -> datetime:
    return datetime.utcnow()


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _validate_email(email: str) -> str:
    normalized = email.lower().strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", normalized):
        raise HTTPException(status_code=400, detail="Invalid email address")
    return normalized


def _validate_password_strength(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must include an uppercase letter")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must include a lowercase letter")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must include a number")
    if not re.search(r"[^\w\s]", password):
        raise HTTPException(status_code=400, detail="Password must include a special character")


def _create_token_record(minutes: int = 0, hours: int = 0) -> dict:
    token = secrets.token_urlsafe(24)
    expires_at = _now() + timedelta(minutes=minutes, hours=hours)
    return {"token": token, "expires_at": expires_at.isoformat()}


def _token_expired(record: Optional[dict]) -> bool:
    if not record:
        return True
    return _now() > datetime.fromisoformat(record["expires_at"])


def _parse_bearer(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    return authorization.split(" ", 1)[1].strip()


class SignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False


class VerifyEmailRequest(BaseModel):
    email: str
    token: str


class ResendVerificationRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/signup")
async def signup(request: SignupRequest):
    email = _validate_email(request.email)
    _validate_password_strength(request.password)

    if email in _users:
        raise HTTPException(status_code=400, detail="Account already exists")

    _users[email] = {
        "email": email,
        "full_name": request.full_name,
        "password_hash": _hash_password(request.password),
        "is_verified": False,
        "created_at": _now().isoformat(),
        "failed_attempts": 0,
        "locked_until": None,
    }

    token_record = _create_token_record(hours=VERIFY_TOKEN_HOURS)
    token_record["resend_available_at"] = (_now() + timedelta(seconds=RESEND_COOLDOWN_SECONDS)).isoformat()
    _verification_tokens[email] = token_record

    return {
        "message": "Signup successful. Please verify your email.",
        "email": email,
        "verification_token": token_record["token"],  # dev convenience
        "expires_at": token_record["expires_at"],
    }


@router.post("/resend-verification")
async def resend_verification(request: ResendVerificationRequest):
    email = _validate_email(request.email)
    if email not in _users:
        raise HTTPException(status_code=404, detail="Account not found")

    if _users[email].get("is_verified"):
        raise HTTPException(status_code=400, detail="Email is already verified")

    existing = _verification_tokens.get(email)
    if existing:
        available_at = datetime.fromisoformat(existing["resend_available_at"])
        if _now() < available_at:
            remaining = int((available_at - _now()).total_seconds())
            raise HTTPException(status_code=429, detail=f"Resend available in {remaining}s")

    token_record = _create_token_record(hours=VERIFY_TOKEN_HOURS)
    token_record["resend_available_at"] = (_now() + timedelta(seconds=RESEND_COOLDOWN_SECONDS)).isoformat()
    _verification_tokens[email] = token_record

    return {
        "message": "Verification email resent.",
        "verification_token": token_record["token"],  # dev convenience
        "expires_at": token_record["expires_at"],
    }


@router.post("/verify-email")
async def verify_email(request: VerifyEmailRequest):
    email = _validate_email(request.email)
    user = _users.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    token_record = _verification_tokens.get(email)
    if _token_expired(token_record):
        raise HTTPException(status_code=400, detail="Verification token expired")
    if request.token != token_record["token"]:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    user["is_verified"] = True
    _verification_tokens.pop(email, None)
    return {"message": "Email verified successfully"}


@router.post("/login")
async def login(request: LoginRequest):
    email = _validate_email(request.email)
    user = _users.get(email)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    locked_until = user.get("locked_until")
    if locked_until and _now() < datetime.fromisoformat(locked_until):
        remaining = int((datetime.fromisoformat(locked_until) - _now()).total_seconds() / 60)
        raise HTTPException(status_code=423, detail=f"Account locked. Try again in {max(1, remaining)} minutes")

    if user["password_hash"] != _hash_password(request.password):
        attempts = user.get("failed_attempts", 0) + 1
        user["failed_attempts"] = attempts
        if attempts >= MAX_LOGIN_ATTEMPTS:
            user["locked_until"] = (_now() + timedelta(minutes=LOCK_MINUTES)).isoformat()
            user["failed_attempts"] = 0
            raise HTTPException(status_code=423, detail="Account locked due to too many failed attempts")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Email not verified")

    user["failed_attempts"] = 0
    user["locked_until"] = None

    session_token = secrets.token_urlsafe(32)
    expiry_hours = 24 * 7 if request.remember_me else 8
    _sessions[session_token] = {
        "email": email,
        "created_at": _now().isoformat(),
        "expires_at": (_now() + timedelta(hours=expiry_hours)).isoformat(),
    }

    return {
        "message": "Login successful",
        "token": session_token,
        "expires_at": _sessions[session_token]["expires_at"],
        "user": {"email": user["email"], "full_name": user["full_name"]},
    }


@router.get("/me")
async def me(authorization: Optional[str] = Header(default=None)):
    token = _parse_bearer(authorization)
    session = _sessions.get(token)
    if not session or _token_expired(session):
        _sessions.pop(token, None)
        raise HTTPException(status_code=401, detail="Session expired")

    user = _users.get(session["email"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "email": user["email"],
        "full_name": user["full_name"],
        "is_verified": user["is_verified"],
        "session_expires_at": session["expires_at"],
    }


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(default=None)):
    token = _parse_bearer(authorization)
    _sessions.pop(token, None)
    return {"message": "Logged out"}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    email = _validate_email(request.email)

    if email in _users:
        token_record = _create_token_record(minutes=RESET_TOKEN_MINUTES)
        token_record["resend_available_at"] = (_now() + timedelta(seconds=RESEND_COOLDOWN_SECONDS)).isoformat()
        _reset_tokens[email] = token_record

    return {
        "message": "If the email exists, reset instructions have been sent.",
        "reset_token": _reset_tokens.get(email, {}).get("token", ""),  # dev convenience
        "expires_at": _reset_tokens.get(email, {}).get("expires_at"),
    }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    email = _validate_email(request.email)
    _validate_password_strength(request.new_password)

    user = _users.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    token_record = _reset_tokens.get(email)
    if _token_expired(token_record):
        raise HTTPException(status_code=400, detail="Reset token expired")
    if request.token != token_record["token"]:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user["password_hash"] = _hash_password(request.new_password)
    _reset_tokens.pop(email, None)
    return {"message": "Password reset successful"}
