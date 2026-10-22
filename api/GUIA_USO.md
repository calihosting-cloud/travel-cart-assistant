# Guía de uso — Carrito GT API

**Para compartir con el equipo.** Versión API **0.2.1** · Schema SQL **0.1.0** · Python **3.10**

Esta guía explica cómo autenticarse, crear tokens, llamar los endpoints y qué hacer si algo falla.  
No hace falta conocer el código de la extensión Chrome: la API es un servicio aparte.

| Documento | Para quién |
|-----------|------------|
| **Esta guía** (`GUIA_USO.md`) | Quien consume o configura la API |
| [README.md](./README.md) | Resumen del proyecto |
| [DEPLOY.md](./DEPLOY.md) | Quien instala en el servidor |
| [SECURITY.md](./SECURITY.md) | Política de seguridad |
| [CHANGELOG.md](./CHANGELOG.md) | Historial de versiones / rollback |
| **Panel `/admin`** | Crear / revocar tokens con usuario y contraseña |
| Swagger `/docs` | Pruebas interactivas en el navegador |
| ReDoc `/redoc` | Referencia legible de esquemas |

---

## 1. Conceptos rápidos

- **Base URL** (ejemplo): `https://api.tudominio.com` o `http://127.0.0.1:8787` en local.
- **Prefijo de datos**: tablas Postgres `car_*` (no tocan el resto del Chat Center).
- **Autenticación**: casi todos los endpoints exigen un **token de API**.
- **Excepción pública**: `GET /health` (solo estado, sin datos sensibles).

### Recursos

| Recurso | Para qué sirve |
|---------|----------------|
| **Contactos** | Clientes con nombre, teléfono, email; búsqueda |
| **Asesores** | Quién cotizó (vínculo a seguimiento) |
| **Agencias** | Nombre de agencia en PDF / cotización |
| **Cotizaciones** | Nº CAR, JSON recuperable, fechas, vínculo a oportunidad CRM |

---

## 2. Cómo crear y usar tokens

### 2.0 Panel visual (recomendado)

1. Abre `https://chatcrm.grupostravel.com/car-api/admin` (o `https://HOST/car-api/admin`).
2. Entra con el usuario/contraseña de admin del servidor (`CAR_ADMIN_*` en el `.env`).
3. **Crear token** → cópialo **una sola vez** → pégalo en la extensión (popup → Carrito API).
4. **Revocar** invalida el token al instante (sin reiniciar el servicio).

### 2.1 Generar a mano (alternativa)

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
# o: python3 scripts/gen_token.py
```

### 2.2 Registrar en el `.env` (bootstrap)

Sigue válido para tokens “fijos” (p. ej. el primero del despliegue):

```env
CAR_API_TOKENS=token_de_persona_a,token_extension
```

Tras editar `.env`, reinicia: `systemctl restart carrito-gt-api`.  
Preferible usar el panel `/admin` para tokens nuevos.

### 2.3 Enviar el token en cada petición

**Opción A (recomendada):** header HTTP estándar

```http
Authorization: Bearer TU_TOKEN_AQUI
```

**Opción B:** header propio

```http
X-API-Token: TU_TOKEN_AQUI
```

### 2.4 Probar que el token funciona

```bash
curl -s -H "Authorization: Bearer TU_TOKEN" https://HOST/v1/me
```

Respuesta esperada:

```json
{"ok": true, "auth": "token"}
```

Si falla:

| Código | Significado |
|--------|-------------|
| `401` | Token faltante o incorrecto |
| `403` | HTTPS requerido, o IP fuera de allowlist |
| `429` | Demasiadas peticiones (rate limit) |

---

## 3. Documentación interactiva (Swagger)

Con la API en marcha, abre en el navegador:

```text
https://HOST/docs
```

1. Pulsa **Authorize**.
2. En *Value* escribe: `Bearer TU_TOKEN` (o solo el token si el UI lo indica; en Swagger OpenAPI 3 suele ir el token sin la palabra Bearer según el esquema — prueba `TU_TOKEN` en el campo Bearer).
3. Prueba los endpoints desde la UI.

También: `https://HOST/redoc`

---

## 4. Endpoints (referencia)

Sustituye `HOST` y `TOKEN`. Todas las respuestas son JSON.

### 4.1 Sistema

#### `GET /health` — sin token

```bash
curl -s https://HOST/health
```

```json
{"ok": true, "version": "0.1.0", "schema_version": "0.1.0"}
```

#### `GET /v1/me` — con token

```bash
curl -s -H "Authorization: Bearer TOKEN" https://HOST/v1/me
```

---

### 4.2 Contactos (`/v1/contactos`)

**Búsqueda unificada (CRM WhatsApp + carrito):**

```bash
curl -s -H "Authorization: Bearer TOKEN" \
  "https://HOST/v1/contactos/search?q=sara&limit=20"
```

Cada ítem incluye `source` (`crm` | `carrito`), `nombre`, `telefono`, `crm_contact_id`, `car_contacto_id`.

**Asegurar contacto en carrito** (al elegir de la lista):

```bash
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"nombre":"Sara","telefono":"573157781866","crm_contact_id":"..."}' \
  https://HOST/v1/contactos/ensure
```

#### Listado solo `car_contacto`

#### Buscar / listar

```bash
curl -s -H "Authorization: Bearer TOKEN" \
  "https://HOST/v1/contactos?q=osorio&limit=20&offset=0"
```

| Parámetro | Descripción |
|-----------|-------------|
| `q` | Texto: busca en **nombre** y **teléfono** |
| `limit` | 1–100 (default 30) |
| `offset` | Paginación |

Respuesta:

```json
{
  "items": [
    {
      "id": 1,
      "nombre": "Juan Guillermo Osorio",
      "telefono": "573001112233",
      "telefono_norm": "573001112233",
      "email": null,
      "notas": null,
      "crm_contact_id": null,
      "created_at": "2026-10-21T20:00:00Z",
      "updated_at": "2026-10-21T20:00:00Z"
    }
  ],
  "total": 1
}
```

#### Ver detalle

```bash
curl -s -H "Authorization: Bearer TOKEN" https://HOST/v1/contactos/1
```

#### Crear

```bash
curl -s -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nombre\":\"Juan Guillermo Osorio\",\"telefono\":\"573001112233\"}" \
  https://HOST/v1/contactos
```

Cuerpo JSON admitido:

```json
{
  "nombre": "Obligatorio",
  "telefono": "opcional",
  "email": "opcional",
  "notas": "opcional",
  "crm_contact_id": "opcional — id del CRM si existe"
}
```

---

### 4.3 Asesores (`/v1/asesores`)

#### Listar

```bash
curl -s -H "Authorization: Bearer TOKEN" \
  "https://HOST/v1/asesores?activos=true"
```

#### Crear

```bash
curl -s -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nombre\":\"Rodrigo Blanco\",\"email\":\"rblanco@ejemplo.com\",\"crm_user_id\":null,\"activo\":true}" \
  https://HOST/v1/asesores
```

#### Detalle

```bash
curl -s -H "Authorization: Bearer TOKEN" https://HOST/v1/asesores/1
```

---

### 4.4 Agencias (`/v1/agencias`)

Igual patrón que asesores:

```bash
curl -s -H "Authorization: Bearer TOKEN" "https://HOST/v1/agencias?activos=true"

curl -s -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nombre\":\"Agencia Demo\",\"nit\":null,\"activo\":true}" \
  https://HOST/v1/agencias

curl -s -H "Authorization: Bearer TOKEN" https://HOST/v1/agencias/1
```

---

### 4.5 Cotizaciones (`/v1/cotizaciones`)

#### Listar (historial)

```bash
curl -s -H "Authorization: Bearer TOKEN" \
  "https://HOST/v1/cotizaciones?q=CAR&limit=30&offset=0"
```

Filtros opcionales: `asesor_id`, `contacto_id`, `q` (busca en ref CAR, contacto, agencia, asesor).

#### Por número CAR local

```bash
curl -s -H "Authorization: Bearer TOKEN" https://HOST/v1/cotizaciones/by-numero/42
```

#### Por id interno

```bash
curl -s -H "Authorization: Bearer TOKEN" https://HOST/v1/cotizaciones/10
```

#### Crear o actualizar (upsert por `numero_car`)

Si ya existe el mismo `numero_car`, **actualiza** (útil al reenviar desde el carrito).

```bash
curl -s -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"numero_car\": 42,
    \"numero_car_ref\": \"CAR042\",
    \"asesor_nombre\": \"Rodrigo Blanco\",
    \"agencia_nombre\": \"Agencia Demo\",
    \"contacto_nombre\": \"Juan Guillermo Osorio\",
    \"contacto_telefono\": \"573001112233\",
    \"oportunidad_seq\": 6,
    \"oportunidad_crm_id\": null,
    \"payload_json\": { \"items\": [], \"nota\": \"ejemplo\" },
    \"origen\": \"extension\"
  }" \
  https://HOST/v1/cotizaciones
```

Campos principales:

| Campo | Descripción |
|-------|-------------|
| `numero_car` | Entero único del carrito (obligatorio) |
| `numero_car_ref` | Texto tipo `CAR042` (si no viene, se genera) |
| `asesor_id` / `asesor_nombre` | Vínculo y/o nombre denormalizado |
| `agencia_id` / `agencia_nombre` | Igual |
| `contacto_id` / `contacto_nombre` / `contacto_telefono` | Igual |
| `oportunidad_crm_id` / `oportunidad_seq` | Id / # de oportunidad Chat Center |
| `payload_json` | JSON completo recuperable (ítems, totales, etc.) |
| `origen` | Default `extension` |

---

## 5. Flujos típicos para el equipo

### A) Alta de un contacto y búsqueda por teléfono

1. `POST /v1/contactos` con nombre + teléfono.  
2. Más tarde: `GET /v1/contactos?q=3001112233`.

### B) Guardar una cotización del asesor

1. (Opcional) asegurar asesor/agencia/contacto con sus `POST`.  
2. `POST /v1/cotizaciones` con `numero_car`, nombres y `payload_json`.  
3. Recuperar: `GET /v1/cotizaciones/by-numero/{n}`.

### C) Nuevo integrante del equipo

1. Admin genera token con `scripts/gen_token.py`.  
2. Lo añade a `CAR_API_TOKENS` en el servidor.  
3. Reinicia el servicio.  
4. Entrega el token **por canal privado** (no email masivo / no chat abierto).  
5. Le pasa esta guía + la Base URL.

---

## 6. Errores comunes

| Situación | Qué revisar |
|-----------|-------------|
| `401 Invalid or missing API token` | Header mal escrito; token no está en `.env`; servicio no reiniciado |
| `403 HTTPS required` | Llamar por `https://` o probar solo en localhost |
| `403 IP not allowed` | Tu IP no está en `CAR_IP_ALLOWLIST` |
| `404` | Id incorrecto o aún no migraron las tablas |
| `429` | Bajar frecuencia o subir `CAR_RATE_LIMIT_PER_MINUTE` |
| `/health` sin `schema_version` | Falta ejecutar `sql/001_car_tables.sql` |

---

## 7. Variables de entorno (resumen)

Ver plantilla completa: [`.env.example`](./.env.example).

| Variable | Uso |
|----------|-----|
| `CAR_DB_*` / `CAR_DATABASE_URL` | Conexión Postgres |
| `CAR_API_TOKENS` | Tokens válidos (coma-separados; bootstrap) |
| `CAR_ADMIN_USER` / `CAR_ADMIN_PASSWORD` | Login del panel `/admin` |
| `CAR_ADMIN_SESSION_SECRET` | Firma de la cookie de sesión |
| `CAR_ROOT_PATH` | Prefijo nginx (`/car-api` en Chat Center) |
| `CAR_REQUIRE_HTTPS` | `true` en producción |
| `CAR_CORS_ORIGINS` | Orígenes permitidos (p. ej. extensión) |
| `CAR_IP_ALLOWLIST` | Opcional |
| `CAR_RATE_LIMIT_PER_MINUTE` | Default 120 |
| `CAR_API_HOST` / `CAR_API_PORT` | Bind local (p. ej. `127.0.0.1:8787`) |

---

## 8. Versionado y volver atrás

- Cambios de API: `api/CHANGELOG.md` (versión `0.1.0`, …).  
- Schema: `car_schema_meta.version` + archivos `sql/001_*.sql`.  
- Rollback de tablas: `sql/001_car_tables_rollback.sql` (**borra datos `car_*`**).  
- Extensión Chrome: changelog en `docs/CHANGELOG.md` (independiente; aún no consume esta API).

---

## 9. Checklist para quien recibe acceso

- [ ] Me dieron la **Base URL** (HTTPS).  
- [ ] Me dieron un **token personal** por canal privado.  
- [ ] Probé `GET /v1/me` y responde `ok`.  
- [ ] Sé dónde está Swagger (`/docs`).  
- [ ] No guardé el token en el repo ni en chats públicos.  
- [ ] Sé a quién avisar si el token se filtra (para rotarlo).

---

*Carrito GT API · documento orientado a humanos · 2026-10-21*
