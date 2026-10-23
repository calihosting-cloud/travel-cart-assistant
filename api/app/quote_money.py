"""Extract display total from car_cotizacion.payload_json (only if acomodación)."""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple


def _as_dict(v: Any) -> Dict[str, Any]:
    return v if isinstance(v, dict) else {}


def has_accommodation(payload: Dict[str, Any] | None) -> bool:
    """True when the quote has a room mix / hotel occupancy basis for a total."""
    raw = payload or {}
    hist = _as_dict(raw.get("history")) or raw
    ctx = _as_dict(hist.get("searchContext"))
    room_plan = ctx.get("roomPlan")
    if isinstance(room_plan, list) and len(room_plan) > 0:
        return True
    groups = hist.get("hotelOptionGroups")
    if isinstance(groups, list) and len(groups) > 0:
        return True
    items = hist.get("items")
    if isinstance(items, list):
        for it in items:
            if not isinstance(it, dict):
                continue
            if it.get("type") != "hotel":
                continue
            rates = it.get("occupancyRates")
            if isinstance(rates, dict) and rates:
                return True
            occ = it.get("occupancy")
            if isinstance(occ, list) and len(occ) > 0:
                return True
    return False


def extract_quote_total(
    payload: Dict[str, Any] | None,
) -> Tuple[Optional[float], Optional[str], bool]:
    """
    Returns (amount, currency, has_accommodation).
    Amount is only set when acomodación exists and grandTotal > 0.
    """
    raw = payload or {}
    hist = _as_dict(raw.get("history")) or raw
    ok_acc = has_accommodation(raw)
    if not ok_acc:
        return None, None, False
    total = hist.get("grandTotal")
    try:
        amount = float(total) if total is not None else None
    except (TypeError, ValueError):
        amount = None
    if amount is None or amount <= 0:
        return None, None, True
    cur = hist.get("displayCurrency") or hist.get("primaryCurrency") or "COP"
    if not isinstance(cur, str) or not cur.strip():
        cur = "COP"
    return amount, cur.strip().upper(), True
