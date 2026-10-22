# Carrito GT API (FastAPI)

API independiente para guardar/consultar datos del carrito en la **misma Postgres del Chat Center**, con tablas de prefijo `car_`.

- **No modifica** el código de la extensión Chrome.
- **Python 3.10** (servidor Chat Center: Ubuntu 22.04 / Python 3.10.12).
- Versión API: **0.1.0** · Schema SQL: **0.1.0**

## Para el equipo (compartir esto)

**Guía completa de uso, tokens y ejemplos curl:** → **[GUIA_USO.md](./GUIA_USO.md)**

También: [DEPLOY.md](./DEPLOY.md) (instalación servidor) · [SECURITY.md](./SECURITY.md) · [CHANGELOG.md](./CHANGELOG.md)

## Qué incluye

| Recurso | Tabla | Uso |
|---------|-------|-----|
| Contactos | `car_contacto` | Listado + búsqueda por nombre/teléfono |
| Asesores | `car_asesor` | Vincular cotizaciones |
| Agencias | `car_agencia` | Nombre PDF / cotización |
| Cotizaciones | `car_cotizacion` | Nº CAR, asesor, agencia, contacto, fecha, `payload_json` |

Autenticación: **Bearer token** (o header `X-API-Token`). Ver [SECURITY.md](./SECURITY.md).

## Documentación interactiva

Con la API en marcha:

- Swagger UI: `https://<host>/docs`
- ReDoc: `https://<host>/redoc`

## Arranque local (desarrollo)

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # editar host/user/pass/token
# Aplicar SQL (una vez):
psql "$CAR_DATABASE_URL" -f sql/001_car_tables.sql
uvicorn app.main:app --host 127.0.0.1 --port 8787
```

## Despliegue en el servidor Chat Center

Ver [DEPLOY.md](./DEPLOY.md).

## Rollback

```bash
psql ... -f sql/001_car_tables_rollback.sql
```

Historial de cambios de la API: [CHANGELOG.md](./CHANGELOG.md).

## Seguridad (resumen)

1. Tokens largos aleatorios en `CAR_API_TOKENS` (no commitear).
2. HTTPS obligatorio fuera de localhost (`CAR_REQUIRE_HTTPS=true`).
3. Rate limit por IP.
4. CORS restringido a orígenes conocidos.
5. IP allowlist opcional.
6. SQL parametrizado (SQLAlchemy).

**No es “imposible de hackear”** (nada lo es), pero está pensado para que sin token + sin red autorizada no haya acceso a datos.

## Integración futura con la extensión

La extensión (v1.1.x) aún **no llama** a esta API. Cuando se conecte, será un cambio versionado aparte (changelog del carrito).
