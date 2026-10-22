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

- **Bind:** `0.0.0.0:8787` (alcanzable desde Docker `crm_nginx` vía `172.16.0.1`).
- **Servicio:** `systemctl status carrito-gt-api`
- **Logs:** `journalctl -u carrito-gt-api -f`
- **Health público:** `GET https://chatcrm.grupostravel.com/car-api/health` → `{"ok":true,...}`

## Token de API

El token de despliegue se guardó **solo en local** (gitignored):

- `api/.deployed_api_token.txt`

No se sube a GitHub. Para un nuevo token: `python3 scripts/gen_token.py` → añadir a `CAR_API_TOKENS` en el `.env` del servidor → `systemctl restart carrito-gt-api`.

## HTTPS / nginx (Docker CRM)

Chat Center usa **nginx en Docker** (`crm_nginx`), no el nginx del host. Conf:

- Host: `/opt/crm/nginx/conf.d/default.conf` (montado en el contenedor)
- `location /car-api/` → `proxy_pass http://172.16.0.1:8787/;` (antes del catch-all `/`)
- Backup: `default.conf.bak-carapi`
- Reload: `docker exec crm_nginx nginx -s reload`

```text
https://chatcrm.grupostravel.com/car-api/health
https://chatcrm.grupostravel.com/car-api/docs
```

Script de parche: `api/scripts/patch_crm_nginx_car_api.py`.

### Extensión (v1.1.60+)

1. Compilar / recargar extensión.
2. Popup → **Config → Carrito API**.
3. Base URL: `https://chatcrm.grupostravel.com/car-api`
4. Pegar token desde `api/.deployed_api_token.txt` → **Guardar** → **Probar conexión**.
5. En el carrito: Contacto busca en BD; Historial → **Servidor**; al copiar WhatsApp/PDF se guarda `car_cotizacion`.

## Rollback

```bash
# en el servidor
systemctl stop carrito-gt-api
sudo -u postgres psql -d chat_center_gt -f /opt/carrito-gt-api/sql/001_car_tables_rollback.sql
```

## Seguridad

- No commitear `.env`, `.deploy_secrets*`, `.deployed_api_token.txt`.
- Si un password SSH/DB apareció en logs locales, **rotar** esas credenciales.
