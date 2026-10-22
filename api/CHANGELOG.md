# Changelog — Carrito GT API

Más reciente arriba. Formato alineado con el carrito.

---

## 2026-10-21 — Guía de uso para el equipo

- **Docs**: `GUIA_USO.md` — cómo crear tokens, autenticarse, endpoints con `curl`, flujos típicos y checklist de acceso. Enlace destacado desde `README.md`.

## 2026-10-21 — API inicial FastAPI + tablas car_* (v0.1.0)

- **Added**: proyecto `api/` (FastAPI, Python 3.10) con auth Bearer / `X-API-Token`, rate limit, CORS, HTTPS check.
- **Added**: migración `sql/001_car_tables.sql` (+ rollback): `car_asesor`, `car_contacto`, `car_agencia`, `car_cotizacion`, `car_api_token`, `car_schema_meta`.
- **Added**: endpoints `/health`, `/v1/me`, `/v1/contactos`, `/v1/asesores`, `/v1/agencias`, `/v1/cotizaciones`.
- **Docs**: `README.md`, `DEPLOY.md`, `SECURITY.md`, `.env.example`.
- **Note**: la extensión Chrome **no** está conectada aún (cambio aparte).
