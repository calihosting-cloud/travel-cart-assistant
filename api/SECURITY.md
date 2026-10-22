# Seguridad — Carrito GT API

## Modelo de amenaza

La API expone datos de cotizaciones/contactos. El atacante típico es:

1. Alguien que descubra la URL pública.
2. Alguien con acceso a una red donde corre el servicio.
3. Filtración de un token de API.

Mitigamos (1)(2)(3) con capas; **no hay seguridad absoluta**.

## Controles implementados (v0.2.0)

| Control | Cómo |
|---------|------|
| Autenticación API | `Authorization: Bearer <token>` o `X-API-Token` |
| Origen de tokens | `CAR_API_TOKENS` (env) **o** hash SHA-256 activo en `car_api_token` |
| Comparación env | `hmac.compare_digest` (tiempo constante) |
| Panel admin | `/admin` — cookie de sesión firmada; `CAR_ADMIN_USER` / `CAR_ADMIN_PASSWORD` |
| HTTPS | `CAR_REQUIRE_HTTPS=true` (salvo localhost); cookie admin `Secure` |
| Rate limit | SlowAPI por IP (`CAR_RATE_LIMIT_PER_MINUTE`) |
| CORS | Solo orígenes listados en `CAR_CORS_ORIGINS` |
| IP allowlist | Opcional `CAR_IP_ALLOWLIST` |
| SQL | ORM / parámetros (sin concatenar SQL) |
| Secretos | Solo en `api/.env` (gitignored); tokens de BD nunca en claro |

## Generar un token fuerte

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Ponlo en `CAR_API_TOKENS` (varios separados por coma). **Rota** el token si se filtra.

## Despliegue recomendado

1. Escuchar solo en `127.0.0.1` y poner **nginx/Caddy** delante con TLS.
2. No abrir el puerto 8787 a internet sin proxy + firewall.
3. Usuario Postgres **sin** permisos de superuser; solo DML/DDL sobre `car_*` (ideal: un role `car_api` limitado).
4. No reutilizar la contraseña de `root` SSH ni del usuario admin del CRM para la API.
5. Preferir clave SSH; **rotar** cualquier password que haya estado en un `.env` en texto plano en el repo local.

## Tabla `car_api_token` + panel `/admin`

Desde v0.2.0 el panel web crea tokens: guarda solo el **hash**; el valor en claro se muestra **una vez**. Revocar pone `activo=false` (efecto inmediato, sin reiniciar).

Los tokens en `CAR_API_TOKENS` siguen válidos (bootstrap / extensión ya configurada).

Credenciales del panel: `CAR_ADMIN_USER`, `CAR_ADMIN_PASSWORD`, `CAR_ADMIN_SESSION_SECRET` en el `.env` del servidor.

## Reportar problemas

Si sospechas filtración: revoca tokens en `.env`, reinicia el servicio, revisa logs de nginx/uvicorn y accesos Postgres.
