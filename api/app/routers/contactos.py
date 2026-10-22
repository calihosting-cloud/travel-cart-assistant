"""Contactos / clientes — búsqueda por nombre o teléfono."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import CarContacto
from ..schemas import ContactoCreate, ContactoListOut, ContactoOut
from ..security import require_api_token
from ..util import normalize_phone

router = APIRouter(prefix="/v1/contactos", tags=["contactos"])


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
