"""Cotizaciones — guardar / listar / recuperar JSON del carrito."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import CarCotizacion
from ..schemas import CotizacionCreate, CotizacionListOut, CotizacionOut
from ..security import require_api_token
from ..util import format_car_ref

router = APIRouter(prefix="/v1/cotizaciones", tags=["cotizaciones"])


@router.get("", response_model=CotizacionListOut)
def list_cotizaciones(
    asesor_id: int | None = None,
    contacto_id: int | None = None,
    q: str = Query(default="", max_length=120),
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CotizacionListOut:
    query = db.query(CarCotizacion)
    if asesor_id is not None:
        query = query.filter(CarCotizacion.asesor_id == asesor_id)
    if contacto_id is not None:
        query = query.filter(CarCotizacion.contacto_id == contacto_id)
    term = (q or "").strip()
    if term:
        like = f"%{term}%"
        query = query.filter(
            (CarCotizacion.numero_car_ref.ilike(like))
            | (CarCotizacion.contacto_nombre.ilike(like))
            | (CarCotizacion.agencia_nombre.ilike(like))
            | (CarCotizacion.asesor_nombre.ilike(like))
        )
    total = query.count()
    rows = (
        query.order_by(CarCotizacion.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return CotizacionListOut(items=rows, total=total)


@router.get("/by-numero/{numero_car}", response_model=CotizacionOut)
def get_by_numero(
    numero_car: int,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarCotizacion:
    row = db.query(CarCotizacion).filter(CarCotizacion.numero_car == numero_car).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    return row


@router.get("/{cotizacion_id}", response_model=CotizacionOut)
def get_cotizacion(
    cotizacion_id: int,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarCotizacion:
    row = db.get(CarCotizacion, cotizacion_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    return row


@router.post("", response_model=CotizacionOut, status_code=status.HTTP_201_CREATED)
def upsert_cotizacion(
    body: CotizacionCreate,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarCotizacion:
    """Crea o actualiza por numero_car (idempotente para re-envíos del carrito)."""
    now = datetime.now(timezone.utc)
    ref = (body.numero_car_ref or format_car_ref(body.numero_car)).strip()
    existing = (
        db.query(CarCotizacion).filter(CarCotizacion.numero_car == body.numero_car).first()
    )
    if existing:
        existing.numero_car_ref = ref
        existing.asesor_id = body.asesor_id
        existing.asesor_nombre = body.asesor_nombre
        existing.agencia_id = body.agencia_id
        existing.agencia_nombre = body.agencia_nombre
        existing.contacto_id = body.contacto_id
        existing.contacto_nombre = body.contacto_nombre
        existing.contacto_telefono = body.contacto_telefono
        existing.oportunidad_crm_id = body.oportunidad_crm_id
        existing.oportunidad_seq = body.oportunidad_seq
        existing.payload_json = body.payload_json or {}
        existing.origen = body.origen or "extension"
        existing.updated_at = now
        db.commit()
        db.refresh(existing)
        return existing

    row = CarCotizacion(
        numero_car=body.numero_car,
        numero_car_ref=ref,
        asesor_id=body.asesor_id,
        asesor_nombre=body.asesor_nombre,
        agencia_id=body.agencia_id,
        agencia_nombre=body.agencia_nombre,
        contacto_id=body.contacto_id,
        contacto_nombre=body.contacto_nombre,
        contacto_telefono=body.contacto_telefono,
        oportunidad_crm_id=body.oportunidad_crm_id,
        oportunidad_seq=body.oportunidad_seq,
        payload_json=body.payload_json or {},
        origen=body.origen or "extension",
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
