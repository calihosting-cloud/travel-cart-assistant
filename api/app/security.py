"""Bearer token auth (env + DB hashes) and admin session helpers."""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .db import get_db
from .models import CarApiToken

ADMIN_SESSION_KEY = "car_admin"


def _client_ip(request: Request) -> str:
    # Prefer direct peer; only trust X-Forwarded-For behind a known reverse proxy.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return ""


def _ip_allowed(ip: str, allowlist: list[str]) -> bool:
    if not allowlist:
        return True
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for entry in allowlist:
        try:
            if "/" in entry:
                if addr in ipaddress.ip_network(entry, strict=False):
                    return True
            elif addr == ipaddress.ip_address(entry):
                return True
        except ValueError:
            continue
    return False


def hash_api_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_api_token() -> str:
    return secrets.token_urlsafe(48)


def _env_token_ok(presented: str, allowed: list[str]) -> bool:
    if not presented or not allowed:
        return False
    for candidate in allowed:
        if hmac.compare_digest(presented, candidate):
            return True
    return False


def _db_token_ok(db: Session, presented: str) -> bool:
    if not presented:
        return False
    digest = hash_api_token(presented)
    row = (
        db.query(CarApiToken)
        .filter(CarApiToken.token_hash == digest, CarApiToken.activo.is_(True))
        .first()
    )
    if not row:
        return False
    now = datetime.now(timezone.utc)
    if row.expires_at is not None:
        exp = row.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now:
            return False
    row.last_used_at = now
    try:
        db.commit()
    except Exception:
        db.rollback()
    return True


def _enforce_transport(request: Request, settings: Settings) -> None:
    if not settings.car_require_https:
        return
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    if proto != "https" and request.client and request.client.host not in {
        "127.0.0.1",
        "::1",
        "localhost",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HTTPS required",
        )


def _enforce_ip(request: Request, settings: Settings) -> None:
    ip = _client_ip(request)
    if not _ip_allowed(ip, settings.ip_allowlist()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IP not allowed",
        )


def extract_bearer_token(
    authorization: Optional[str] = None,
    x_api_token: Optional[str] = None,
) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    if x_api_token:
        return x_api_token.strip()
    return ""


async def require_api_token(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_api_token: Optional[str] = Header(default=None, alias="X-API-Token"),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> str:
    """Require Authorization: Bearer <token> or X-API-Token (env list or car_api_token hash)."""
    _enforce_transport(request, settings)
    _enforce_ip(request, settings)

    token = extract_bearer_token(authorization, x_api_token)
    if _env_token_ok(token, settings.api_token_list()) or _db_token_ok(db, token):
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_admin_password(username: str, password: str, settings: Settings) -> bool:
    if not settings.admin_enabled():
        return False
    user_ok = hmac.compare_digest(username.strip(), settings.car_admin_user.strip())
    pass_ok = hmac.compare_digest(password, settings.car_admin_password)
    return user_ok and pass_ok


def admin_session_user(request: Request) -> Optional[str]:
    try:
        return request.session.get(ADMIN_SESSION_KEY)
    except AssertionError:
        return None


def set_admin_session(request: Request, username: str) -> None:
    request.session[ADMIN_SESSION_KEY] = username


def clear_admin_session(request: Request) -> None:
    request.session.pop(ADMIN_SESSION_KEY, None)


def is_admin_logged_in(request: Request) -> bool:
    return bool(admin_session_user(request))
