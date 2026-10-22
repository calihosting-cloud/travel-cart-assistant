# Estado de despliegue — Carrito GT API

**Última actualización:** 2026-10-21  
**Versión API:** 0.1.0 · **Schema:** 0.1.0

## Producción (Chat Center)

| Ítem | Estado |
|------|--------|
| Paquetes `python3-pip` / `python3-venv` / `libpq-dev` | OK |
| Código en `/opt/carrito-gt-api` | OK |
| Virtualenv + `requirements.txt` | OK |
| Archivo `.env` en servidor (permiso 600) | OK |
| Migración `sql/001_car_tables.sql` | OK (`SQL_OK`) |
| systemd `carrito-gt-api` | **active** |
| `GET /health` | `{"ok":true,"version":"0.1.0","schema_version":"0.1.0"}` |
| `GET /v1/me` con token | `{"ok":true,"auth":"token"}` |

- **Bind:** `127.0.0.1:8787` (solo localhost en el servidor).
- **Servicio:** `systemctl status carrito-gt-api`
- **Logs:** `journalctl -u carrito-gt-api -f`

## Token de API

El token de despliegue se guardó **solo en local** (gitignored):

- `api/.deployed_api_token.txt`

No se sube a GitHub. Para un nuevo token: `python3 scripts/gen_token.py` → añadir a `CAR_API_TOKENS` en el `.env` del servidor → `systemctl restart carrito-gt-api`.

## Exponer por HTTPS (pendiente opcional)

Hoy la API responde en loopback. Para uso externo hace falta nginx/Caddy con TLS apuntando a `127.0.0.1:8787` (ver `DEPLOY.md` §7). Hasta entonces, pruebas desde el propio servidor o túnel SSH:

```bash
ssh -L 8787:127.0.0.1:8787 root@SERVIDOR
curl -s http://127.0.0.1:8787/health
```

## Rollback

```bash
# en el servidor
systemctl stop carrito-gt-api
sudo -u postgres psql -d chat_center_gt -f /opt/carrito-gt-api/sql/001_car_tables_rollback.sql
```

## Seguridad

- No commitear `.env`, `.deploy_secrets*`, `.deployed_api_token.txt`.
- Si un password SSH/DB apareció en logs locales, **rotar** esas credenciales.
