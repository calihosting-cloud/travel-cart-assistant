"""Contactos — búsqueda CRM (WhatsApp Contact) + car_contacto; ensure upsert."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import CarContacto
from ..schemas import (
    ContactEnsureIn,
    ContactoCreate,
    ContactoListOut,
    ContactoOut,
    ContactSearchHit,
    ContactSearchOut,
)
from ..security import require_api_token
from ..util import normalize_phone

router = APIRouter(prefix="/v1/contactos", tags=["contactos"])


def _search_crm_contacts(db: Session, term: str, limit: int) -> list[ContactSearchHit]:
    """Read-only search on Chat Center conversation contacts (crm.contacts)."""
    phone_digits = normalize_phone(term) or ""
    like = f"%{term}%"
    # Real CRM contacts from Conversaciones / Contactos (~thousands).
    # Distinct by normalized phone so the same WhatsApp number on several
    # lines/connections appears once (prefer most recently updated name).
    sql = text(
        """
        SELECT DISTINCT ON (dedupe_key)
          id::text AS id,
          coalesce(nullif(trim(full_name), ''), nullif(trim(phone), ''), 'Sin nombre') AS nombre,
          nullif(trim(phone), '') AS telefono,
          phone_norm,
          nullif(trim(company), '') AS agencia
        FROM (
          SELECT
            c.id,
            c.full_name,
            c.phone,
            c.company,
            c.updated_at,
            regexp_replace(coalesce(c.phone, ''), '\\D', '', 'g') AS phone_norm,
            coalesce(
              nullif(regexp_replace(coalesce(c.phone, ''), '\\D', '', 'g'), ''),
              c.id::text
            ) AS dedupe_key
          FROM crm.contacts c
          WHERE coalesce(c.is_blocked, false) = false
            AND (
              c.full_name ILIKE :like
              OR c.phone ILIKE :like
              OR c.email ILIKE :like
              OR c.company ILIKE :like
              OR (
                :phone <> ''
                AND regexp_replace(coalesce(c.phone, ''), '\\D', '', 'g') LIKE :phone_like
              )
            )
        ) s
        ORDER BY
          dedupe_key,
          (nullif(trim(company), '') IS NULL),
          updated_at DESC NULLS LAST
        LIMIT :lim
        """
    )
    try:
        rows = db.execute(
            sql,
            {
                "like": like,
                "phone": phone_digits,
                "phone_like": f"%{phone_digits}%" if phone_digits else "%",
                "lim": limit,
            },
        ).fetchall()
    except Exception:
        # Schema missing on local/dev
        return []

    hits: list[ContactSearchHit] = []
    for row in rows:
        cid, nombre, telefono, phone_norm, agencia = (
            row[0],
            row[1],
            row[2],
            row[3],
            row[4],
        )
        phone = phone_norm or normalize_phone(telefono) or telefono
        hits.append(
            ContactSearchHit(
                source="crm",
                crm_contact_id=str(cid) if cid is not None else None,
                car_contacto_id=None,
                nombre=(nombre or "Sin nombre").strip(),
                telefono=phone,
                telefono_norm=normalize_phone(phone) if phone else None,
                agencia=(agencia or None),
            )
        )
    return hits


def _merge_hits(
    carrito: list[ContactSearchHit], crm: list[ContactSearchHit], limit: int
) -> list[ContactSearchHit]:
    """Prefer car_contacto when same phone or crm_contact_id."""
    by_crm: dict[str, ContactSearchHit] = {}
    by_phone: dict[str, ContactSearchHit] = {}
    out: list[ContactSearchHit] = []

    def add(hit: ContactSearchHit) -> None:
        if hit.crm_contact_id and hit.crm_contact_id in by_crm:
            existing = by_crm[hit.crm_contact_id]
            if existing.source == "carrito" and hit.source == "crm":
                return
            if existing.source == "crm" and hit.source == "carrito":
                # replace crm with carrito
                try:
                    out.remove(existing)
                except ValueError:
                    pass
            else:
                return
        if hit.telefono_norm and hit.telefono_norm in by_phone:
            existing = by_phone[hit.telefono_norm]
            if existing.source == "carrito" and hit.source == "crm":
                return
            if existing.source == "crm" and hit.source == "carrito":
                try:
                    out.remove(existing)
                except ValueError:
                    pass
            else:
                return
        out.append(hit)
        if hit.crm_contact_id:
            by_crm[hit.crm_contact_id] = hit
        if hit.telefono_norm:
            by_phone[hit.telefono_norm] = hit

    for h in carrito:
        add(h)
    for h in crm:
        add(h)
    return out[:limit]


@router.get("/search", response_model=ContactSearchOut)
def search_contactos_merged(
    q: str = Query(default="", max_length=120),
    limit: int = Query(default=20, ge=1, le=50),
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> ContactSearchOut:
    term = (q or "").strip()
    if len(term) < 2:
        return ContactSearchOut(items=[], total=0)

    phone = normalize_phone(term)
    car_q = db.query(CarContacto)
    clauses = [func.lower(CarContacto.nombre).like(f"%{term.lower()}%")]
    if phone:
        clauses.append(CarContacto.telefono_norm.like(f"%{phone}%"))
        clauses.append(CarContacto.telefono.like(f"%{term}%"))
    car_rows = (
        car_q.filter(or_(*clauses))
        .order_by(CarContacto.nombre.asc())
        .limit(limit)
        .all()
    )
    carrito_hits = [
        ContactSearchHit(
            source="carrito",
            crm_contact_id=r.crm_contact_id,
            car_contacto_id=r.id,
            nombre=r.nombre,
            telefono=r.telefono or r.telefono_norm,
            telefono_norm=r.telefono_norm,
        )
        for r in car_rows
    ]
    crm_hits = _search_crm_contacts(db, term, limit)
    items = _merge_hits(carrito_hits, crm_hits, limit)
    return ContactSearchOut(items=items, total=len(items))


@router.post("/ensure", response_model=ContactoOut)
def ensure_contacto(
    body: ContactEnsureIn,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarContacto:
    """Create or update car_contacto from CRM pick or free-typed name+phone."""
    now = datetime.now(timezone.utc)
    nombre = body.nombre.strip()
    phone_norm = normalize_phone(body.telefono)
    row: CarContacto | None = None

    if body.crm_contact_id:
        row = (
            db.query(CarContacto)
            .filter(CarContacto.crm_contact_id == body.crm_contact_id)
            .first()
        )
    if row is None and phone_norm:
        row = (
            db.query(CarContacto)
            .filter(CarContacto.telefono_norm == phone_norm)
            .first()
        )
    if row is None:
        row = (
            db.query(CarContacto)
            .filter(func.lower(CarContacto.nombre) == nombre.lower())
            .first()
        )

    if row:
        row.nombre = nombre
        if body.telefono is not None:
            row.telefono = body.telefono.strip() or phone_norm
            row.telefono_norm = phone_norm
        if body.crm_contact_id:
            row.crm_contact_id = body.crm_contact_id
        if body.email is not None:
            row.email = body.email
        row.updated_at = now
        db.commit()
        db.refresh(row)
        return row

    row = CarContacto(
        nombre=nombre,
        telefono=(body.telefono or "").strip() or phone_norm,
        telefono_norm=phone_norm,
        email=body.email,
        crm_contact_id=body.crm_contact_id,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=ContactoListOut)
def list_contactos(
    q: str = Query(default="", max_length=120, description="Nombre o teléfono"),
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> ContactoListOut:
    query = db.query(CarContacto)
    term = (q or "").strip()
    if term:
        phone = normalize_phone(term)
        clauses = [func.lower(CarContacto.nombre).like(f"%{term.lower()}%")]
        if phone:
            clauses.append(CarContacto.telefono_norm.like(f"%{phone}%"))
            clauses.append(CarContacto.telefono.like(f"%{term}%"))
        query = query.filter(or_(*clauses))

    total = query.count()
    rows = (
        query.order_by(CarContacto.nombre.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return ContactoListOut(items=rows, total=total)


@router.post("", response_model=ContactoOut, status_code=status.HTTP_201_CREATED)
def create_contacto(
    body: ContactoCreate,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarContacto:
    now = datetime.now(timezone.utc)
    row = CarContacto(
        nombre=body.nombre.strip(),
        telefono=body.telefono,
        telefono_norm=normalize_phone(body.telefono),
        email=body.email,
        notas=body.notas,
        crm_contact_id=body.crm_contact_id,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{contacto_id}", response_model=ContactoOut)
def get_contacto(
    contacto_id: int,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarContacto:
    row = db.get(CarContacto, contacto_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contacto no encontrado")
    return row
