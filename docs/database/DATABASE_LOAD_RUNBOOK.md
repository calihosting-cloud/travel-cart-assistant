# Runbook De Carga A PostgreSQL

Actualizado: 2026-07-16

## Objetivo

Cargar a PostgreSQL las fuentes operativas ya preparadas:

- Bloqueos JETSMART/WINGO.
- Lista viva de hoteles/opciones priorizadas por destino.
- Servicios normalizados: tours y traslados.
- Migraciones nuevas para cotizaciones, vuelos y hoteles por ciudad.

## Estado Actual

La preparacion local funciona correctamente:

```powershell
python scripts/prepare_reference_inventory.py
```

Resultado actual:

- Lista viva: 66 filas fuente, 65 opciones normalizadas.
- Servicios Cartagena exploratorios: 2 snapshots, 9 traslados, 10 tours/actividades, 25 media.
- Validacion de servicios: `ok`.

PostgreSQL esta conectado y las migraciones `001` a `009` fueron aplicadas. La app local usa PostgreSQL como fuente principal y SQLite solo como respaldo.

## Programacion Diaria

Los horarios se guardan en `inventory_load_schedules`. El ciclo diario respeta este orden:

1. Bloqueos WINGO/JETSMART completos.
2. Normalizacion, validacion y reconciliacion de bloqueos/salidas.
3. Planificacion exacta de hoteles por destino, fechas y ocupacion.
4. Planificacion de actividades y traslados Grupos Travel.
5. Consumo continuo, secuencial y reanudable de las colas.

Mientras la semilla inicial tenga trabajos pendientes, el ciclo diario se omite para no reiniciar ni mezclar estados. Comando:

```powershell
python scripts/run_daily_inventory_pipeline.py
```

El ciclo de bloqueos se puede probar sin modificar inventario:

```powershell
python scripts/run_inventory_cycle.py --inventory-type blockings --dry-run --force
```

La tarea `BlockInventoryDailyRefresh` se programa en thor. Comparte el advisory lock `8071502` con `BlockInventorySeed`: nunca ejecuta bloqueos a la vez que hoteles o servicios sobre Chrome `9222`.

## Comando Completo Cuando Haya Acceso

```powershell
cd "G:\My Drive\GruposTravel\block_inventory"
python scripts/prepare_reference_inventory.py --load-postgres
```

Ese comando hace:

1. Descarga lista viva desde Google Sheets.
2. Cruza hoteles/opciones contra diccionario ISA.
3. Genera `.runtime_cache/priority_options/priority_options.json` y `.jsonl`.
4. Normaliza servicios/tours/traslados.
5. Valida JSONL de servicios.
6. Aplica schemas `001` a `009`.
7. Carga lista priorizada a `priority_option_lists` y `priority_options`.
8. Carga servicios a `service_search_snapshots`, `transfer_rate_snapshots`, `activity_rate_snapshots`, `activity_media`.

## Schemas Incluidos En apply_postgres_schema.py

- `001_initial_schema.sql`
- `002_hotel_inventory.sql`
- `003_service_inventory.sql`
- `004_package_price_matrix.sql`
- `005_package_registry.sql`
- `006_priority_options.sql`
- `007_quotation_flights.sql`
- `008_hotel_city_inventory.sql`
- `009_commercial_platform.sql`
- `010_occupancy_inventory.sql`
- `011_current_blocking_inventory.sql`
- `012_exact_hotel_jobs.sql`
- `013_service_inventory_jobs.sql`
- `014_daily_inventory_pipeline.sql`

El diccionario completo de las tablas reales se regenera con:

```powershell
python scripts/generate_postgres_dictionary.py
```

Resultado: `docs/POSTGRES_SCHEMA.md`.

Para aplicar una migracion puntual mientras el sistema esta activo:

```powershell
python scripts/apply_postgres_schema.py --only 014_daily_inventory_pipeline.sql
```

El aplicador usa `lock_timeout` para fallar de forma visible en vez de quedar esperando indefinidamente si una carga mantiene una tabla ocupada.

## Consideraciones De Servicios

La estructura de servicios ya esta clara:

- `service_search_snapshots`: busqueda, destino, fechas, pax, hotel solicitado, URL fuente y payload crudo.
- `transfer_rate_snapshots`: nombre, modalidad, proveedor, moneda, total, max pax/equipaje, pickup, booking URL, imagen y detalles.
- `activity_rate_snapshots`: nombre, proveedor, moneda, precio por persona, free/per person, texto, descripcion, detail URL, booking URL e imagen.
- `activity_media`: imagenes asociadas a tours/actividades.

Regla actual de negocio:

- La app debe presentar tours y traslados como servicios unificados.
- Para inventario definitivo deben ser proveedor `Grupos Travel`.
- `v_service_inventory_selector` aplica la misma restriccion en PostgreSQL, incluso sobre capturas exploratorias historicas.
- La captura Cartagena existente queda marcada como exploratoria porque contiene proveedores externos.

## Consideraciones De Hoteles Priorizados

La lista viva se carga como opciones priorizadas:

- `priority_option_lists`
- `priority_options`
- `v_priority_options_selector`

Cada opcion conserva:

- destino
- tipo (`hotel`, futuro `transfer`, `tour`, `activity`)
- nombre solicitado
- nombre canonico si ISA resuelve
- estado alias (`resolved`, `ambiguous`, `unresolved`)
- candidatos si es ambiguo
- payload fuente

Para hoteles devueltos por busqueda de ciudad, el destino tecnico es cargar todos los resultados en:

- `hotel_search_snapshots`
- `hotel_search_results`
- `v_hotel_city_inventory`

No se debe descartar hoteles por ciudad en la captura base; la seleccion comercial ocurre despues.
## Carga De Busquedas Hoteleras Por Ciudad

Cuando PostgreSQL este habilitado y ya exista una captura normalizada en `.runtime_cache/hotel_city_search/*/normalized`:

```powershell
python scripts\import_normalized_to_postgres.py --hotel-city
```

Para capturar y cargar en un solo paso:

```powershell
python scripts\scrape_hotel_city.py --destination "Punta Cana" --check-in 19/08/2026 --check-out 20/08/2026 --rooms 1 --adults 2 --children 0 --max-hotels 80 --load-postgres
```

Los proveedores se aplican durante la busqueda/normalizacion, antes de mostrar inventario: base `Grupos Travel`, `Omnibees`, `HyperGuest`; Punta Cana agrega `Catalonia`, `Ocean Hotels`, `RIU`.
