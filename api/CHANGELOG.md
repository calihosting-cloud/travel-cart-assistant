# Changelog — Carrito GT API

Más reciente arriba. Formato alineado con el carrito.

---

## 2026-10-23 — Oportunidades CRM + totales con acomodación (v0.2.4)

- **Added**: `GET /v1/oportunidades/search` y `GET /v1/oportunidades/board` (crm.deals + vínculo car_cotizacion).
- **Added**: total monetario solo si el payload tiene acomodación (`quote_money.py`).
- **Added**: email en hits de `/v1/contactos/search`.

## 2026-10-22 — Docs: carga remota / claves duales (extensión 1.1.64)

- **Docs**: `REPORTE_ADMIN_APPS.md` — historial local vs servidor, `serverId` + `numero_car`, payload `history`.

## 2026-10-22 — Reporte para admin / apps

- **Docs**: `REPORTE_ADMIN_APPS.md` — tablas `car_*` + catálogo de endpoints (API 0.2.3) para administradores y creadores de apps.

## 2026-10-22 — Agencia en búsqueda de contactos (v0.2.3)

- **Added**: `/v1/contactos/search` incluye `agencia` desde `crm.contacts.company` (si existe).

## 2026-10-22 — Búsqueda en crm.contacts (conversaciones) (v0.2.2)

- **Fixed**: `/v1/contactos/search` lee `crm.contacts` (contactos de Conversaciones Chat Center, miles de filas), no la tabla Evolution `"Contact"` (~22).

## 2026-10-21 — Búsqueda CRM Contact + ensure (v0.2.1)

- **Added**: `GET /v1/contactos/search` — une CRM + `car_contacto` (dedupe por teléfono / crm id).
- **Added**: `POST /v1/contactos/ensure` — crea/actualiza `car_contacto` al elegir un hit.
- **Added**: `POST /v1/asesores/ensure` — upsert por `crm_user_id` o email.

## 2026-10-21 — Panel admin de tokens (v0.2.0)

- **Added**: `GET /admin` — login con `CAR_ADMIN_USER` / `CAR_ADMIN_PASSWORD`; crear, listar, revocar y reactivar tokens en `car_api_token` (hash SHA-256; el secreto se muestra una sola vez).
- **Changed**: Bearer acepta tokens del `.env` **o** hashes activos en BD.
- **Docs**: `.env.example`, `GUIA_USO.md`, `SECURITY.md`; script `scripts/deploy_admin_update.py`.

## 2026-10-21 — Extensión conectada + proxy /car-api

- **Fixed**: proxy en Docker `crm_nginx` (`/opt/crm/nginx/conf.d/default.conf` → `172.16.0.1:8787`); script `scripts/patch_crm_nginx_car_api.py`.
- **Changed**: uvicorn bind `0.0.0.0:8787` (antes solo localhost).
- **Changed**: la extensión v1.1.60 consume la API (token en popup). Health público OK.

## 2026-10-21 — Despliegue en servidor Chat Center

- **Added**: API instalada en `/opt/carrito-gt-api`, systemd `carrito-gt-api` **active**, migración SQL OK, `/health` + `/v1/me` OK.
- **Docs**: `DEPLOY_STATUS.md`. Script `scripts/remote_deploy.py` deja de imprimir `-pw` en claro.
- **Note**: token solo en local gitignored.

## 2026-10-21 — Guía de uso para el equipo

- **Docs**: `GUIA_USO.md` — cómo crear tokens, autenticarse, endpoints con `curl`, flujos típicos y checklist de acceso. Enlace destacado desde `README.md`.

## 2026-10-21 — API inicial FastAPI + tablas car_* (v0.1.0)

- **Added**: proyecto `api/` (FastAPI, Python 3.10) con auth Bearer / `X-API-Token`, rate limit, CORS, HTTPS check.
- **Added**: migración `sql/001_car_tables.sql` (+ rollback): `car_asesor`, `car_contacto`, `car_agencia`, `car_cotizacion`, `car_api_token`, `car_schema_meta`.
- **Added**: endpoints `/health`, `/v1/me`, `/v1/contactos`, `/v1/asesores`, `/v1/agencias`, `/v1/cotizaciones`.
- **Docs**: `README.md`, `DEPLOY.md`, `SECURITY.md`, `.env.example`.
- **Note**: la extensión Chrome **no** está conectada aún (cambio aparte).
