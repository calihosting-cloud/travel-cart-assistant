"""Oportunidades de venta (crm.deals) — lectura + vínculo con car_cotizacion."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..quote_money import extract_quote_total
from ..schemas import BoardQuoteLabel, BoardQuotesOut, OportunidadHit, OportunidadSearchOut
from ..security import require_api_token
from ..util import normalize_phone

router = APIRouter(prefix="/v1/oportunidades", tags=["oportunidades"])


def _quote_map(db: Session) -> dict[str, dict]:
    """Map deal_id / phone_norm → latest car_cotizacion money fields."""
    rows = db.execute(
        text(
            """
            SELECT id, numero_car, numero_car_ref, oportunidad_crm_id,
                   contacto_telefono, telefono_norm, payload_json, created_at
            FROM (
              SELECT
                c.id,
                c.numero_car,
                c.numero_car_ref,
                c.oportunidad_crm_id,
                c.contacto_telefono,
                regexp_replace(coalesce(c.contacto_telefono, ''), '\\D', '', 'g') AS telefono_norm,
                c.payload_json,
                c.created_at
              FROM car_cotizacion c
            ) s
            ORDER BY created_at DESC NULLS LAST
            """
        )
    ).fetchall()
    by_deal: dict[str, dict] = {}
    by_phone: dict[str, dict] = {}
    for r in rows:
        amount, currency, has_acc = extract_quote_total(r.payload_json or {})
        info = {
            "car_cotizacion_id": int(r.id),
            "numero_car": int(r.numero_car),
            "numero_car_ref": r.numero_car_ref,
            "quote_total": amount,
            "quote_currency": currency,
            "has_accommodation": has_acc,
        }
        oid = (r.oportunidad_crm_id or "").strip()
        if oid and oid not in by_deal:
            by_deal[oid] = info
        phone = (r.telefono_norm or "").strip()
        if phone and phone not in by_phone:
            by_phone[phone] = info
    return {"deal": by_deal, "phone": by_phone}


def _attach_quote(hit: OportunidadHit, qmap: dict[str, dict]) -> OportunidadHit:
    info = None
    if hit.id and hit.id in qmap["deal"]:
        info = qmap["deal"][hit.id]
    else:
        phone = normalize_phone(hit.contact_phone) or ""
        if phone and phone in qmap["phone"]:
            info = qmap["phone"][phone]
    if not info:
        return hit
    return hit.model_copy(
        update={
            "car_cotizacion_id": info["car_cotizacion_id"],
            "numero_car": info["numero_car"],
            "numero_car_ref": info["numero_car_ref"],
            "quote_total": info["quote_total"],
            "quote_currency": info["quote_currency"],
            "has_accommodation": bool(info["has_accommodation"]),
        }
    )


@router.get("/search", response_model=OportunidadSearchOut)
def search_oportunidades(
    phone: str = Query(default="", max_length=40),
    crm_contact_id: str = Query(default="", max_length=80),
    q: str = Query(default="", max_length=120),
    limit: int = Query(default=20, ge=1, le=50),
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> OportunidadSearchOut:
    """Deals for a contact phone / CRM contact id (Conversaciones)."""
    phone_digits = normalize_phone(phone) or normalize_phone(q) or ""
    contact_id = (crm_contact_id or "").strip()
    term = (q or "").strip()

    if len(phone_digits) < 7 and not contact_id and len(term) < 2:
        return OportunidadSearchOut(items=[], total=0)

    sql = text(
        """
        SELECT
          d.id::text AS id,
          qr.sequence_number,
          d.stage_code,
          coalesce(s.name, d.stage_code) AS stage_name,
          d.contact_name,
          d.contact_phone,
          d.created_at
        FROM crm.deals d
        LEFT JOIN crm.deals_quote_requests qr ON qr.id = d.quote_request_id
        LEFT JOIN crm.deal_stages s ON s.code = d.stage_code
        WHERE
          (
            :phone <> ''
            AND regexp_replace(coalesce(d.contact_phone, ''), '\\D', '', 'g') LIKE :phone_like
          )
          OR (
            :contact_id <> ''
            AND EXISTS (
              SELECT 1 FROM crm.contacts c
              WHERE c.id::text = :contact_id
                AND regexp_replace(coalesce(c.phone, ''), '\\D', '', 'g')
                    = regexp_replace(coalesce(d.contact_phone, ''), '\\D', '', 'g')
                AND regexp_replace(coalesce(d.contact_phone, ''), '\\D', '', 'g') <> ''
            )
          )
          OR (
            :term <> ''
            AND (
              d.contact_name ILIKE :like
              OR d.contact_phone ILIKE :like
            )
          )
        ORDER BY d.created_at DESC NULLS LAST
        LIMIT :lim
        """
    )
    try:
        rows = db.execute(
            sql,
            {
                "phone": phone_digits,
                "phone_like": f"%{phone_digits}%" if phone_digits else "%",
                "contact_id": contact_id,
                "term": term if not phone_digits and not contact_id else "",
                "like": f"%{term}%",
                "lim": limit,
            },
        ).fetchall()
    except Exception:
        return OportunidadSearchOut(items=[], total=0)

    qmap = _quote_map(db)
    items: list[OportunidadHit] = []
    for r in rows:
        hit = OportunidadHit(
            id=str(r.id),
            sequence_number=int(r.sequence_number) if r.sequence_number is not None else None,
            stage_code=r.stage_code,
            stage_name=r.stage_name,
            contact_name=r.contact_name,
            contact_phone=r.contact_phone,
            created_at=r.created_at,
        )
        items.append(_attach_quote(hit, qmap))
    return OportunidadSearchOut(items=items, total=len(items))


@router.get("/board", response_model=BoardQuotesOut)
def board_oportunidades(
    limit: int = Query(default=200, ge=1, le=500),
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> BoardQuotesOut:
    """All recent deals + linked CAR labels for the Oportunidades kanban."""
    sql = text(
        """
        SELECT
          d.id::text AS id,
          qr.sequence_number,
          d.stage_code,
          d.contact_phone
        FROM crm.deals d
        LEFT JOIN crm.deals_quote_requests qr ON qr.id = d.quote_request_id
        ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC NULLS LAST
        LIMIT :lim
        """
    )
    try:
        rows = db.execute(sql, {"lim": limit}).fetchall()
    except Exception:
        return BoardQuotesOut(items=[], total=0)

    qmap = _quote_map(db)
    items: list[BoardQuoteLabel] = []
    for r in rows:
        hit = OportunidadHit(
            id=str(r.id),
            sequence_number=int(r.sequence_number) if r.sequence_number is not None else None,
            stage_code=r.stage_code,
            contact_phone=r.contact_phone,
        )
        hit = _attach_quote(hit, qmap)
        items.append(
            BoardQuoteLabel(
                deal_id=hit.id,
                sequence_number=hit.sequence_number,
                contact_phone=hit.contact_phone,
                stage_code=hit.stage_code,
                numero_car=hit.numero_car,
                numero_car_ref=hit.numero_car_ref,
                quote_total=hit.quote_total if hit.has_accommodation else None,
                quote_currency=hit.quote_currency if hit.has_accommodation else None,
                has_accommodation=hit.has_accommodation,
            )
        )
    return BoardQuotesOut(items=items, total=len(items))
