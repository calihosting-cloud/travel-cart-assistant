"""Bearer token auth — constant-time compare; optional IP allowlist."""

from __future__ import annotations

import hmac
import ipaddress
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request, status

from .config import Settings, get_settings


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


def _token_ok(presented: str, allowed: list[str]) -> bool:
    if not presented or not allowed:
        return False
    for candidate in allowed:
        if hmac.compare_digest(presented, candidate):
            return True
    return False


async def require_api_token(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_api_token: Optional[str] = Header(default=None, alias="X-API-Token"),
    settings: Settings = Depends(get_settings),
) -> str:
    """Require Authorization: Bearer <token> or X-API-Token header."""
    if settings.car_require_https:
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

    ip = _client_ip(request)
    if not _ip_allowed(ip, settings.ip_allowlist()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IP not allowed",
        )

    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif x_api_token:
        token = x_api_token.strip()

    if not _token_ok(token, settings.api_token_list()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token
