"""Agencias."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import CarAgencia
from ..schemas import AgenciaCreate, AgenciaOut
from ..security import require_api_token

router = APIRouter(prefix="/v1/agencias", tags=["agencias"])


@router.get("", response_model=list[AgenciaOut])
def list_agencias(
    activos: bool = Query(default=True),
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> list[CarAgencia]:
    query = db.query(CarAgencia)
    if activos:
        query = query.filter(CarAgencia.activo.is_(True))
    return query.order_by(func.lower(CarAgencia.nombre)).all()


@router.post("", response_model=AgenciaOut, status_code=status.HTTP_201_CREATED)
def create_agencia(
    body: AgenciaCreate,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarAgencia:
    now = datetime.now(timezone.utc)
    row = CarAgencia(
        nombre=body.nombre.strip(),
        nit=body.nit,
        activo=body.activo,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{agencia_id}", response_model=AgenciaOut)
def get_agencia(
    agencia_id: int,
    _token: str = Depends(require_api_token),
    db: Session = Depends(get_db),
) -> CarAgencia:
    row = db.get(CarAgencia, agencia_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agencia no encontrada")
    return row
