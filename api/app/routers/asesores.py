"""Asesores — listado y upsert por crm_user_id / email (no solo por nombre)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import CarAsesor
from ..schemas import AsesorCreate, AsesorEnsureIn, AsesorOut
from ..security import require_api_token

router = APIRouter(prefix="/v1/asesores", tags=["asesores"])


@router.get("", response_model=list[AsesorOut])
def list_asesores(
    activos: bool = Query(default=True),
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> list[CarAsesor]:
    query = db.query(CarAsesor)
    if activos:
        query = query.filter(CarAsesor.activo.is_(True))
    return query.order_by(func.lower(CarAsesor.nombre)).all()


@router.post("/ensure", response_model=AsesorOut)
def ensure_asesor(
    body: AsesorEnsureIn,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarAsesor:
    """Upsert by crm_user_id first, then email; name is only a label."""
    now = datetime.now(timezone.utc)
    nombre = body.nombre.strip()
    email = (body.email or "").strip() or None
    crm_id = (body.crm_user_id or "").strip() or None
    row: CarAsesor | None = None

    if crm_id:
        row = db.query(CarAsesor).filter(CarAsesor.crm_user_id == crm_id).first()
    if row is None and email:
        row = (
            db.query(CarAsesor)
            .filter(func.lower(CarAsesor.email) == email.lower())
            .first()
        )

    if row:
        row.nombre = nombre
        if email:
            row.email = email
        if crm_id:
            row.crm_user_id = crm_id
        row.activo = body.activo
        row.updated_at = now
        db.commit()
        db.refresh(row)
        return row

    row = CarAsesor(
        nombre=nombre,
        email=email,
        crm_user_id=crm_id,
        activo=body.activo,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("", response_model=AsesorOut, status_code=status.HTTP_201_CREATED)
def create_asesor(
    body: AsesorCreate,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarAsesor:
    now = datetime.now(timezone.utc)
    row = CarAsesor(
        nombre=body.nombre.strip(),
        email=body.email,
        crm_user_id=body.crm_user_id,
        activo=body.activo,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{asesor_id}", response_model=AsesorOut)
def get_asesor(
    asesor_id: int,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarAsesor:
    row = db.get(CarAsesor, asesor_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asesor no encontrado")
    return row
