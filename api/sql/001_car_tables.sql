-- ============================================================================
-- Carrito GT — migración 001 (FORWARD)
-- Versión schema: car_schema_v0.1.0
-- Fecha: 2026-10-21
-- Rollback: sql/001_car_tables_rollback.sql
--
-- Prefijo car_ para no chocar con tablas del Chat Center.
-- Ejecutar como usuario con CREATE TABLE en la BD chat_center_gt.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS car_schema_meta (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO car_schema_meta (key, value)
VALUES ('version', '0.1.0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Asesores (vínculo opcional a usuario interno del CRM)
CREATE TABLE IF NOT EXISTS car_asesor (
  id              BIGSERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  email           TEXT,
  crm_user_id     TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS car_asesor_email_uidx
  ON car_asesor (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS car_asesor_crm_user_uidx
  ON car_asesor (crm_user_id) WHERE crm_user_id IS NOT NULL;

-- Contactos / clientes (buscable por nombre o teléfono)
CREATE TABLE IF NOT EXISTS car_contacto (
  id              BIGSERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  telefono        TEXT,
  telefono_norm   TEXT,
  email           TEXT,
  notas           TEXT,
  crm_contact_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS car_contacto_nombre_idx
  ON car_contacto (lower(nombre));
CREATE INDEX IF NOT EXISTS car_contacto_telefono_norm_idx
  ON car_contacto (telefono_norm);
CREATE UNIQUE INDEX IF NOT EXISTS car_contacto_crm_uidx
  ON car_contacto (crm_contact_id) WHERE crm_contact_id IS NOT NULL;

-- Agencias (nombre en PDF / cotización)
CREATE TABLE IF NOT EXISTS car_agencia (
  id              BIGSERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  nit             TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS car_agencia_nombre_uidx
  ON car_agencia (lower(nombre));

-- Cotizaciones del carrito (seguimiento + JSON recuperable)
CREATE TABLE IF NOT EXISTS car_cotizacion (
  id                    BIGSERIAL PRIMARY KEY,
  numero_car            INTEGER NOT NULL,
  numero_car_ref        TEXT NOT NULL,
  asesor_id             BIGINT REFERENCES car_asesor (id) ON DELETE SET NULL,
  asesor_nombre         TEXT,
  agencia_id            BIGINT REFERENCES car_agencia (id) ON DELETE SET NULL,
  agencia_nombre        TEXT,
  contacto_id           BIGINT REFERENCES car_contacto (id) ON DELETE SET NULL,
  contacto_nombre       TEXT,
  contacto_telefono     TEXT,
  oportunidad_crm_id    TEXT,
  oportunidad_seq       INTEGER,
  payload_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
  origen                TEXT NOT NULL DEFAULT 'extension',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS car_cotizacion_numero_car_uidx
  ON car_cotizacion (numero_car);
CREATE INDEX IF NOT EXISTS car_cotizacion_asesor_idx
  ON car_cotizacion (asesor_id);
CREATE INDEX IF NOT EXISTS car_cotizacion_contacto_idx
  ON car_cotizacion (contacto_id);
CREATE INDEX IF NOT EXISTS car_cotizacion_created_idx
  ON car_cotizacion (created_at DESC);
CREATE INDEX IF NOT EXISTS car_cotizacion_oportunidad_idx
  ON car_cotizacion (oportunidad_crm_id);

-- Tokens de API (hashes; nunca guardar el token en claro)
CREATE TABLE IF NOT EXISTS car_api_token (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  token_hash      TEXT NOT NULL UNIQUE,
  scopes          TEXT[] NOT NULL DEFAULT ARRAY['read','write']::TEXT[],
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

COMMIT;
