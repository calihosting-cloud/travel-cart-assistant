"""Small helpers."""

from __future__ import annotations

import re


def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D+", "", raw)
    return digits or None


def phone_from_whatsapp_jid(remote_jid: str | None) -> str | None:
    """Extract digits from WhatsApp JID (e.g. 57300…@s.whatsapp.net). Skip groups/LID."""
    if not remote_jid:
        return None
    jid = remote_jid.strip()
    if "@g.us" in jid or "@lid" in jid.lower():
        return None
    local = jid.split("@", 1)[0]
    # Ignore pure LID-style numeric ids that are not phone-like (too long without country sense)
    digits = re.sub(r"\D+", "", local)
    if len(digits) < 8 or len(digits) > 15:
        return None
    return digits


def format_car_ref(n: int) -> str:
    return f"CAR{n:03d}"
