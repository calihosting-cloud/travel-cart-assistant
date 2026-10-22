# Despliegue en el servidor Chat Center

Servidor: Ubuntu 22.04 · **Python 3.10.12** (`/usr/bin/python3`).  
Puede faltar `pip`; el módulo `venv` suele estar disponible.

## 0. Preparar Python (una vez, como root)

```bash
apt update
apt install -y python3-pip python3-venv libpq-dev
```

## 1. Copiar el código

Desde tu PC (ejemplo):

```bash
# Solo la carpeta api/ — sin .env con secretos en git
rsync -avz --exclude '.venv' --exclude '.env' ./api/ root@SERVER:/opt/carrito-gt-api/
```

O clonar el repo y usar `api/`.

## 2. Entorno virtual + deps

```bash
cd /opt/carrito-gt-api
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 3. Configurar secretos

```bash
cp .env.example .env
nano .env
```

Rellenar:

- `CAR_DB_*` (host **127.0.0.1** si Postgres está en la misma máquina)
- `CAR_API_TOKENS` (token largo)
- `CAR_REQUIRE_HTTPS=true`
- `CAR_API_HOST=127.0.0.1` (nginx delante)

## 4. Migración SQL

```bash
sudo -u postgres psql -d chat_center_gt -f sql/001_car_tables.sql
# o con el usuario de la app si tiene CREATE:
# psql "postgresql://USER:PASS@127.0.0.1:5432/chat_center_gt" -f sql/001_car_tables.sql
```

**Rollback** (borra datos `car_*`):

```bash
psql ... -f sql/001_car_tables_rollback.sql
```

## 5. Probar

```bash
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8787
curl -s http://127.0.0.1:8787/health
curl -s -H "Authorization: Bearer TU_TOKEN" http://127.0.0.1:8787/v1/me
```

## 6. systemd (servicio)

`/etc/systemd/system/carrito-gt-api.service`:

```ini
[Unit]
Description=Carrito GT API
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/carrito-gt-api
EnvironmentFile=/opt/carrito-gt-api/.env
ExecStart=/opt/carrito-gt-api/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8787
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now carrito-gt-api
systemctl status carrito-gt-api
```

## 7. Nginx (TLS)

Proxy a `http://127.0.0.1:8787` con certificado HTTPS. No expongas el puerto 8787 al mundo.

## Versionado / volver atrás

| Qué | Dónde |
|-----|--------|
| Versión API Python | `api/app/__init__.py` → `__version__` |
| Cambios API | `api/CHANGELOG.md` |
| Schema DB | `car_schema_meta.version` + `api/sql/001_*.sql` |
| Extensión Chrome | `docs/CHANGELOG.md` / `public/manifest.json` (sin cambios en este entregable) |

Si algo falla tras una migración: ejecutar el `*_rollback.sql` correspondiente y redeploy de la versión anterior de `api/`.
