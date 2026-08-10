# Organizacion PostgreSQL

Actualizado: 2026-07-16.

PostgreSQL es la fuente principal del aplicativo. El detalle exacto de campos, tipos, claves y conteos se genera desde la base en `docs/POSTGRES_SCHEMA.md`.

## Convenciones

- Campos en ingles y `snake_case`.
- IDs de portal como texto cuando el proveedor no garantiza un tipo numerico estable.
- UUID para identidades internas.
- `NUMERIC`, nunca `float`, para valores monetarios.
- `TIMESTAMPTZ` para trazabilidad temporal.
- `JSONB` para evidencia cruda y estructuras variables.
- Tablas `*_snapshots` para historia; vistas `latest` para estado operativo.
- Toda entidad reservable conserva URL fuente o enlace de reserva cuando el portal lo expone.

## Capas

### Ingesta Y Salud

- `scrape_runs`: cabecera de las corridas de bloqueos.
- `raw_blocking_snapshots`: evidencia cruda por bloqueo.
- `blocking_tabs_status`: calidad por tab.
- `inventory_pipeline_runs`: estado de la cadena diaria completa.
- `inventory_load_schedules`: horarios visibles por la aplicacion.

### Bloqueos

- `blockings`: catalogo actual reconciliado.
- `blocking_departure_dates`: salidas/cupos actuales.
- `blocking_departure_snapshots`: historia de cupos.
- Las demas tablas `blocking_*` separan parametros, categorias, itinerario, politicas, tasas, edades, remarks, archivos y tarifas.

Lectura: `v_blocking_summary`, `v_available_departure_options`, `v_selector_destinations` y `v_selector_months`.

### Hoteles

- `priority_options`: nombres solicitados por destino y resolucion contra ISA/portal.
- `hotel_inventory_jobs`: cola estable por hotel, fecha y ocupacion.
- `hotel_search_snapshots`: cada consulta real.
- `hotel_search_results`: habitaciones, alimentacion, proveedor, moneda, valor y enlaces.
- `hotel_age_policies`: edades confirmadas por hotel/proveedor.
- `hotel_view_snapshots`, `hotel_rate_snapshots` y `hotel_media`: detalle ampliado del hotel.

Lectura vigente: `v_hotel_latest_search_snapshots`, `v_hotel_city_inventory` y `v_hotel_occupancy_rate_matrix`.

### Servicios

- `service_inventory_jobs`: cola de actividades y traslados.
- `service_search_snapshots`: cabecera historica de cada busqueda.
- `transfer_rate_snapshots`: modalidad, capacidad, equipaje, precio y URL.
- `activity_rate_snapshots`: precio por persona, descripcion, detalle y URL.
- `activity_media`: imagenes de actividades.

Lectura vigente: `v_service_latest_search_snapshots` y `v_service_inventory_selector`. La vista operativa solo expone Grupos Travel.

### Paquetes Y Precios

- `package_drafts` y `package_items`: paquete editable y sus componentes.
- `package_blocking_links` y `package_departures`: una o varias salidas seleccionadas.
- `package_status_history` y `package_revision_snapshots`: auditoria.
- `package_price_matrices`, filas y celdas: SGL/DBL/TPL/QDP/CHD/INF.
- `fee_rule_versions`: reglas versionadas de fees y asistencia.
- `package_publications`: publicacion comercial.
- `flyer_requests`: solicitudes de ficha/flyer.

El valor manual vive en la capa comercial. Nunca sobrescribe la tarifa neta capturada del portal.

### Cotizaciones Y Ventas

- `quotation_drafts`, `quotation_items` y `quotation_flight_components`: cotizacion y vuelo opcional/manual.
- `quotation_revision_snapshots`: versiones.
- `app_users`: usuarios y roles.
- `sales_leads` y `sales_lead_events`: solicitudes del publico y seguimiento del asesor.

## Historia Frente A Estado Actual

- Los snapshots se insertan por corrida y se conservan.
- Una vista `latest` selecciona la captura mas reciente de la misma consulta logica.
- Una salida eliminada por el portal desaparece de `blocking_departure_dates`, pero permanece en `blocking_departure_snapshots`.
- Un bloqueo ausente en una corrida completa queda inactivo; una corrida parcial nunca desactiva datos.
- Un trabajo que ya no corresponde a una salida vigente queda `skipped`.

## Operacion

```powershell
python scripts/run_daily_inventory_pipeline.py
python scripts/audit_inventory_load.py
python scripts/postgres_inventory_report.py
python scripts/generate_postgres_dictionary.py
```

La documentación detallada de bloqueos está en `docs/BLOCKINGS_REFERENCE.md`; el runbook operativo está en `docs/DATABASE_LOAD_RUNBOOK.md`.

