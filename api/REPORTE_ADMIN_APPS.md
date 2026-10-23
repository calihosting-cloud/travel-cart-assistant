# Carrito GT API — Reporte para administradores y creadores de apps

**Fecha:** 2026-10-22  
**Versión API:** `0.2.4`  
**Extensión (cliente):** `1.1.65`  
**Schema SQL:** `0.1.0` (`car_schema_meta.version`)  
**Runtime:** Python 3.10 · FastAPI · Postgres (misma BD del Chat Center)  
**Base URL producción:** `https://chatcrm.grupostravel.com/car-api`  
**Health:** `GET https://chatcrm.grupostravel.com/car-api/health`

Este documento describe las tablas propias del carrito (`car_*`) y los endpoints HTTP actuales.  
No sustituye Swagger (`/docs`) ni ReDoc (`/redoc`); es una referencia para integraciones y operación.

| Recurso | URL |
|---------|-----|
| Swagger | `https://chatcrm.grupostravel.com/car-api/docs` |
| ReDoc | `https://chatcrm.grupostravel.com/car-api/redoc` |
| Panel tokens | `https://chatcrm.grupostravel.com/car-api/admin` |
| Guía operativa | `api/GUIA_USO.md` |
| Seguridad | `api/SECURITY.md` |
| Deploy | `api/DEPLOY.md` |

---

## 1. Alcance y principios

- Prefijo de tablas: **`car_`** — no modifica tablas del CRM/Chat Center.
- La API **sí lee** (solo lectura) `crm.contacts` en la búsqueda unificada de contactos.
- Autenticación API: token Bearer (o `X-API-Token`). Los tokens se hashean en `car_api_token`; el valor en claro solo se muestra una vez al crearlo.
- Panel `/admin`: login usuario/contraseña (`CAR_ADMIN_*`), **no** usa el token de API.
- Rate limit por IP (default 120/min). HTTPS requerido fuera de localhost.
- Extensión Chrome (Travel Cart Assistant) ya consume esta API para contactos, asesores y cotizaciones.

---

## 2. Modelo de datos (`car_*`)

Migración: `api/sql/001_car_tables.sql` · Rollback: `api/sql/001_car_tables_rollback.sql` (**borra datos `car_*`**).

```
car_asesor ──┐
             ├──► car_cotizacion ◄── car_contacto
car_agencia ─┘

car_api_token     (auth de apps)
car_schema_meta   (versión schema)
```

Lectura externa (no es tabla `car_*`):

| Origen | Uso |
|--------|-----|
| `crm.contacts` | Búsqueda de contactos de Conversaciones (nombre, teléfono, `company` → agencia) |

### 2.1 `car_schema_meta`

| Columna | Tipo | Notas |
|---------|------|--------|
| `key` | TEXT PK | p. ej. `version` |
| `value` | TEXT | p. ej. `0.1.0` |
| `updated_at` | TIMESTAMPTZ | |

### 2.2 `car_asesor`

Asesor que cotiza; vínculo opcional al usuario interno del CRM.

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | BIGSERIAL PK | |
| `nombre` | TEXT NOT NULL | |
| `email` | TEXT | UNIQUE (lower) si no null |
| `crm_user_id` | TEXT | UNIQUE si no null |
| `activo` | BOOLEAN | default true |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### 2.3 `car_contacto`

Contacto/cliente del carrito (puede enlazarse a un contacto CRM).

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | BIGSERIAL PK | |
| `nombre` | TEXT NOT NULL | index lower(nombre) |
| `telefono` | TEXT | |
| `telefono_norm` | TEXT | solo dígitos; index |
| `email` | TEXT | |
| `notas` | TEXT | |
| `crm_contact_id` | TEXT | UNIQUE si no null (= id en `crm.contacts`) |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### 2.4 `car_agencia`

Agencia para PDF / cotización.

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | BIGSERIAL PK | |
| `nombre` | TEXT NOT NULL | UNIQUE lower(nombre) |
| `nit` | TEXT | |
| `activo` | BOOLEAN | default true |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### 2.5 `car_cotizacion`

Cotización / carrito persistido. Clave de negocio: `numero_car` (único).

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | BIGSERIAL PK | |
| `numero_car` | INTEGER NOT NULL | UNIQUE |
| `numero_car_ref` | TEXT NOT NULL | p. ej. `CAR042` |
| `asesor_id` | BIGINT FK → car_asesor | ON DELETE SET NULL |
| `asesor_nombre` | TEXT | denormalizado |
| `agencia_id` | BIGINT FK → car_agencia | ON DELETE SET NULL |
| `agencia_nombre` | TEXT | denormalizado |
| `contacto_id` | BIGINT FK → car_contacto | ON DELETE SET NULL |
| `contacto_nombre` | TEXT | denormalizado |
| `contacto_telefono` | TEXT | denormalizado |
| `oportunidad_crm_id` | TEXT | id oportunidad Chat Center |
| `oportunidad_seq` | INTEGER | # oportunidad |
| `payload_json` | JSONB | ítems, totales, etc. (default `{}`) |
| `origen` | TEXT | default `extension` |
| `created_at` / `updated_at` | TIMESTAMPTZ | index por `created_at DESC` |

### 2.6 `car_api_token`

Tokens de aplicación. **Nunca** se guarda el token en claro.

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | BIGSERIAL PK | |
| `name` | TEXT NOT NULL | etiqueta |
| `token_hash` | TEXT NOT NULL UNIQUE | |
| `scopes` | TEXT[] | default `{read,write}` |
| `activo` | BOOLEAN | |
| `last_used_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | opcional |

---

## 3. Autenticación

### API (apps / extensión)

```http
Authorization: Bearer <TOKEN>
```

Alternativa: `X-API-Token: <TOKEN>`

Creación recomendada: panel `/admin` → Crear token → copiar **una sola vez**.  
También pueden existir tokens bootstrap en `CAR_API_TOKENS` (`.env`).

Verificación:

```bash
curl -s -H "Authorization: Bearer TOKEN" \
  https://chatcrm.grupostravel.com/car-api/v1/me
# {"ok":true,"auth":"token"}
```

| Código | Significado |
|--------|-------------|
| 401 | Token faltante o inválido |
| 403 | HTTPS requerido o IP fuera de allowlist |
| 429 | Rate limit |

### Admin (solo humanos)

Login en `/admin` con `CAR_ADMIN_USER` / `CAR_ADMIN_PASSWORD`. Cookie de sesión.  
Endpoints admin **no** aparecen en el schema OpenAPI (`include_in_schema=False`).

---

## 4. Catálogo de endpoints

Todas las rutas de abajo asumen prefijo de despliegue `/car-api` en producción  
(ej. path completo = Base URL + ruta). En local sin nginx: `http://127.0.0.1:8787` + ruta.

### 4.1 Sistema

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness + `version` API + `schema_version` |
| GET | `/v1/me` | Token | Valida token |

**Ejemplo `/health`:**

```json
{"ok": true, "version": "0.2.3", "schema_version": "0.1.0"}
```

### 4.2 Contactos — `/v1/contactos`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/v1/contactos/search?q=&limit=` | Búsqueda **unificada**: `car_contacto` + `crm.contacts` |
| POST | `/v1/contactos/ensure` | Upsert en `car_contacto` (por `crm_contact_id` o teléfono) |
| GET | `/v1/contactos?q=&limit=&offset=` | Solo tabla `car_contacto` |
| POST | `/v1/contactos` | Crear en `car_contacto` |
| GET | `/v1/contactos/{id}` | Detalle |

**Search (`q` mínimo 2 caracteres).** Ítem:

```json
{
  "source": "crm",
  "crm_contact_id": "123",
  "car_contacto_id": null,
  "nombre": "David Muñoz",
  "telefono": "573001112233",
  "telefono_norm": "573001112233",
  "agencia": "Agencia Ejemplo"
}
```

- `source`: `crm` | `carrito`
- `agencia`: viene de `crm.contacts.company` cuando existe (puede ser null)

**Ensure — body:**

```json
{
  "nombre": "David Muñoz",
  "telefono": "573001112233",
  "crm_contact_id": "123",
  "email": null
}
```

**Create — body:** `nombre` (obligatorio), `telefono`, `email`, `notas`, `crm_contact_id` (opcionales).

### 4.3 Asesores — `/v1/asesores`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/v1/asesores?activos=true` | Listado |
| POST | `/v1/asesores/ensure` | Upsert por `crm_user_id` → luego `email` |
| POST | `/v1/asesores` | Crear |
| GET | `/v1/asesores/{id}` | Detalle |

**Ensure / Create — body:**

```json
{
  "nombre": "Rodrigo Blanco",
  "email": "rblanco@ejemplo.com",
  "crm_user_id": "opcional",
  "activo": true
}
```

### 4.4 Agencias — `/v1/agencias`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/v1/agencias?activos=true` | Listado |
| POST | `/v1/agencias` | Crear |
| GET | `/v1/agencias/{id}` | Detalle |

**Create — body:** `{ "nombre": "...", "nit": null, "activo": true }`

### 4.5 Oportunidades — `/v1/oportunidades` (v0.2.4)

Lectura de `crm.deals` (+ `deals_quote_requests` / `deal_stages`), con vínculo opcional a `car_cotizacion`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/v1/oportunidades/search?phone=&crm_contact_id=&q=&limit=` | Oportunidades del contacto |
| GET | `/v1/oportunidades/board?limit=` | Tablero kanban: deals + labels CAR/total |

`quote_total` / `quote_currency` solo si el payload de la cotización tiene **acomodación** (room plan / occupancy / opciones hotel).

### 4.6 Cotizaciones — `/v1/cotizaciones`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/v1/cotizaciones?q=&asesor_id=&contacto_id=&limit=&offset=` | Historial |
| GET | `/v1/cotizaciones/by-numero/{numero_car}` | Por nº CAR |
| GET | `/v1/cotizaciones/{id}` | Por id interno |
| POST | `/v1/cotizaciones` | **Upsert** por `numero_car` (crea o actualiza) |

**Upsert — body principal:**

```json
{
  "numero_car": 42,
  "numero_car_ref": "CAR042",
  "asesor_id": null,
  "asesor_nombre": "Rodrigo Blanco",
  "agencia_id": null,
  "agencia_nombre": "Agencia Demo",
  "contacto_id": null,
  "contacto_nombre": "Juan Guillermo Osorio",
  "contacto_telefono": "573001112233",
  "oportunidad_crm_id": null,
  "oportunidad_seq": 6,
  "payload_json": { "items": [], "nota": "ejemplo" },
  "origen": "extension"
}
```

Si `numero_car` ya existe, se actualizan campos y `payload_json` (idempotente para reenvíos del carrito).

### 4.7 Admin (HTML, no OpenAPI)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin` | Panel (requiere sesión) |
| GET/POST | `/admin/login` | Login |
| POST | `/admin/logout` | Logout |
| POST | `/admin/tokens` | Crear token |
| POST | `/admin/tokens/{id}/revoke` | Revocar |
| POST | `/admin/tokens/{id}/activate` | Reactivar |

---

## 5. Flujos recomendados para nuevas apps

### A) Buscar cliente y asegurar en carrito

1. `GET /v1/contactos/search?q=...`
2. Usuario elige → `POST /v1/contactos/ensure` con nombre, teléfono y `crm_contact_id` si aplica.
3. Usar el `id` de `car_contacto` en cotizaciones.

### B) Identificar asesor

1. `POST /v1/asesores/ensure` con `crm_user_id` y/o `email` + nombre.
2. Guardar `id` en la cotización.

### C) Persistir cotización

1. `POST /v1/cotizaciones` con `numero_car`, nombres denormalizados y `payload_json`.
2. Recuperar: `GET /v1/cotizaciones/by-numero/{n}` o listado filtrado.

### D) Extensión: historial local vs servidor (v1.1.64)

- **Sin token / sin red:** solo historial local (Chrome storage). Sigue funcionando.
- **Con API:** pestaña Historial lista `GET /v1/cotizaciones` y permite **Cargar** (`GET /v1/cotizaciones/{id}`).
- **Claves duales** en el cliente:
  - `quoteNumber` — número CAR **local** (secuencia del navegador; no se pisa si ya hay otra entrada).
  - `serverId` — `car_cotizacion.id` (índice en BD).
  - `serverNumeroCar` — `numero_car` en BD (puede coincidir o no con el local).
- Si al cargar del servidor el `numero_car` ya existe en local con otro contenido, se asigna un **nuevo** `quoteNumber` local y se conserva el vínculo `serverId` / `serverNumeroCar`.
- Re-guardados posteriores hacen upsert por `serverNumeroCar` (misma fila BD), no por el número local remapeado.
- `payload_json` recomendado (extensión): `{ version: 1, history: {…HistoryEntry}, items, fees, … }`.

### D) Alta de integrador

1. Admin crea token en `/admin` y lo entrega por canal privado.
2. Integrador prueba `GET /v1/me`.
3. Usar Swagger `/docs` para explorar esquemas.

---

## 6. Variables de entorno relevantes

| Variable | Uso |
|----------|-----|
| `CAR_DATABASE_URL` / `CAR_DB_*` | Postgres Chat Center |
| `CAR_API_TOKENS` | Tokens bootstrap (opcional) |
| `CAR_ADMIN_USER` / `CAR_ADMIN_PASSWORD` | Panel `/admin` |
| `CAR_ADMIN_SESSION_SECRET` | Cookie de sesión |
| `CAR_ROOT_PATH` | Prefijo nginx (`/car-api`) |
| `CAR_REQUIRE_HTTPS` | `true` en prod |
| `CAR_CORS_ORIGINS` | Orígenes permitidos |
| `CAR_IP_ALLOWLIST` | Opcional |
| `CAR_RATE_LIMIT_PER_MINUTE` | Default 120 |
| `CAR_API_HOST` / `CAR_API_PORT` | Bind local (p. ej. `127.0.0.1:8787`) |

---

## 7. Notas para el administrador de BD

1. Las tablas `car_*` viven en la misma instancia/BD del Chat Center; el prefijo evita colisiones de nombre.
2. FK con `ON DELETE SET NULL`: borrar asesor/agencia/contacto no borra la cotización; quedan nombres denormalizados.
3. `payload_json` puede crecer: monitorear tamaño y backups de Postgres como el resto del CRM.
4. Rollback `001_car_tables_rollback.sql` es **destructivo** para todo `car_*`.
5. La búsqueda CRM depende de `crm.contacts` (schema `crm`). Si esa tabla no existe en un entorno, search CRM devuelve vacío y sigue funcionando `car_contacto`.

---

## 8. Checklist de entrega al creador de apps

- [ ] Base URL HTTPS (`…/car-api`)
- [ ] Token personal (canal privado)
- [ ] Probó `GET /v1/me` → `ok`
- [ ] Conoce `/docs` y este reporte
- [ ] Sabe rotar/revocar token vía `/admin` si se filtra
- [ ] Entiende que `search` mezcla CRM + carrito y que `ensure` escribe solo en `car_contacto`

---

*Generado desde el código y schema del repo Travel Cart Assistant (`api/`), versión API 0.2.3.*
