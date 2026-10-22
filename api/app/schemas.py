"""Pydantic schemas (request/response)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class HealthOut(BaseModel):
    ok: bool
    version: str
    schema_version: Optional[str] = None


class ContactoCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    telefono: Optional[str] = Field(default=None, max_length=40)
    email: Optional[str] = Field(default=None, max_length=200)
    notas: Optional[str] = None
    crm_contact_id: Optional[str] = None


class ContactoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    telefono: Optional[str] = None
    telefono_norm: Optional[str] = None
    email: Optional[str] = None
    notas: Optional[str] = None
    crm_contact_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ContactoListOut(BaseModel):
    items: List[ContactoOut]
    total: int


class AsesorCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    email: Optional[str] = None
    crm_user_id: Optional[str] = None
    activo: bool = True


class AsesorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: Optional[str] = None
    crm_user_id: Optional[str] = None
    activo: bool
    created_at: datetime
    updated_at: datetime


class AgenciaCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    nit: Optional[str] = None
    activo: bool = True


class AgenciaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    nit: Optional[str] = None
    activo: bool
    created_at: datetime
    updated_at: datetime


class CotizacionCreate(BaseModel):
    numero_car: int = Field(ge=1)
    numero_car_ref: Optional[str] = None
    asesor_id: Optional[int] = None
    asesor_nombre: Optional[str] = None
    agencia_id: Optional[int] = None
    agencia_nombre: Optional[str] = None
    contacto_id: Optional[int] = None
    contacto_nombre: Optional[str] = None
    contacto_telefono: Optional[str] = None
    oportunidad_crm_id: Optional[str] = None
    oportunidad_seq: Optional[int] = None
    payload_json: Dict[str, Any] = Field(default_factory=dict)
    origen: str = "extension"


class CotizacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero_car: int
    numero_car_ref: str
    asesor_id: Optional[int] = None
    asesor_nombre: Optional[str] = None
    agencia_id: Optional[int] = None
    agencia_nombre: Optional[str] = None
    contacto_id: Optional[int] = None
    contacto_nombre: Optional[str] = None
    contacto_telefono: Optional[str] = None
    oportunidad_crm_id: Optional[str] = None
    oportunidad_seq: Optional[int] = None
    payload_json: Dict[str, Any]
    origen: str
    created_at: datetime
    updated_at: datetime


class CotizacionListOut(BaseModel):
    items: List[CotizacionOut]
    total: int
