"""Small helpers."""

from __future__ import annotations

import re


def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D+", "", raw)
    return digits or None


def format_car_ref(n: int) -> str:
    return f"CAR{n:03d}"
