"""ORM models for car_* tables."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class CarAsesor(Base):
    __tablename__ = "car_asesor"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(Text)
    crm_user_id: Mapped[Optional[str]] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CarContacto(Base):
    __tablename__ = "car_contacto"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(Text)
    telefono_norm: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    notas: Mapped[Optional[str]] = mapped_column(Text)
    crm_contact_id: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CarAgencia(Base):
    __tablename__ = "car_agencia"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    nit: Mapped[Optional[str]] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CarCotizacion(Base):
    __tablename__ = "car_cotizacion"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    numero_car: Mapped[int] = mapped_column(Integer, nullable=False)
    numero_car_ref: Mapped[str] = mapped_column(Text, nullable=False)
    asesor_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("car_asesor.id"))
    asesor_nombre: Mapped[Optional[str]] = mapped_column(Text)
    agencia_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("car_agencia.id"))
    agencia_nombre: Mapped[Optional[str]] = mapped_column(Text)
    contacto_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("car_contacto.id"))
    contacto_nombre: Mapped[Optional[str]] = mapped_column(Text)
    contacto_telefono: Mapped[Optional[str]] = mapped_column(Text)
    oportunidad_crm_id: Mapped[Optional[str]] = mapped_column(Text)
    oportunidad_seq: Mapped[Optional[int]] = mapped_column(Integer)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    origen: Mapped[str] = mapped_column(Text, default="extension")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    asesor = relationship("CarAsesor")
    agencia = relationship("CarAgencia")
    contacto = relationship("CarContacto")


class CarApiToken(Base):
    __tablename__ = "car_api_token"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    scopes: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
