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


class ContactSearchHit(BaseModel):
    source: str  # "crm" | "carrito"
    crm_contact_id: Optional[str] = None
    car_contacto_id: Optional[int] = None
    nombre: str
    telefono: Optional[str] = None
    telefono_norm: Optional[str] = None
    agencia: Optional[str] = None
    email: Optional[str] = None


class ContactSearchOut(BaseModel):
    items: List[ContactSearchHit]
    total: int


class ContactEnsureIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    telefono: Optional[str] = Field(default=None, max_length=40)
    crm_contact_id: Optional[str] = None
    email: Optional[str] = Field(default=None, max_length=200)


class AsesorCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    email: Optional[str] = None
    crm_user_id: Optional[str] = None
    activo: bool = True


class AsesorEnsureIn(BaseModel):
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


class OportunidadHit(BaseModel):
    id: str
    sequence_number: Optional[int] = None
    stage_code: Optional[str] = None
    stage_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    created_at: Optional[datetime] = None
    # Linked carrito quote (if any)
    numero_car: Optional[int] = None
    numero_car_ref: Optional[str] = None
    car_cotizacion_id: Optional[int] = None
    quote_total: Optional[float] = None
    quote_currency: Optional[str] = None
    has_accommodation: bool = False


class OportunidadSearchOut(BaseModel):
    items: List[OportunidadHit]
    total: int


class BoardQuoteLabel(BaseModel):
    """Label to show on an opportunity card / column."""

    deal_id: str
    sequence_number: Optional[int] = None
    contact_phone: Optional[str] = None
    stage_code: Optional[str] = None
    numero_car: Optional[int] = None
    numero_car_ref: Optional[str] = None
    quote_total: Optional[float] = None
    quote_currency: Optional[str] = None
    has_accommodation: bool = False


class BoardQuotesOut(BaseModel):
    items: List[BoardQuoteLabel]
    total: int
