# Pipeline Real De Inventario

Actualizado: 2026-07-16

## Orden Obligatorio

1. Capturar WINGO y JETSMART por separado desde la lista activa del portal.
2. Normalizar, validar e importar cada operador.
3. Excluir de las vistas operativas los bloqueos no vistos en el ultimo lote completo.
4. Derivar noches desde el itinerario cuando no aparecen en el nombre (`ultimo dia - 1`).
5. Tomar exclusivamente salidas con `visible_availability=true` y `available>0`.
6. Construir check-in/check-out con la fecha real del bloqueo y sus noches.
7. Buscar cada hotel de la lista viva de forma especifica dentro del destino.
8. Consultar SGL, DBL, TPL, QDP, CHD e INF como busquedas independientes.
9. Buscar traslados por aeropuerto, hotel, fechas y pasajeros; conservar solo Grupos Travel.
10. Buscar actividades por destino, fechas y pasajeros; conservar solo Grupos Travel.

Las fechas `DD/MM/YYYY` se convierten a objetos `date` antes de PostgreSQL. Nunca se confia en el `DateStyle` del servidor.

## Estado Confirmado

- WINGO: run `daily_blockings_20260716_143053`, 20/20 bloqueos, cero errores.
- JETSMART: run `daily_blockings_jetsmart_20260716_1505`, 10/10 bloqueos, cero errores.
- Registros JETSMART historicos excluidos de vistas actuales: 7.
- Salidas vigentes con cupo: 183.
- Cola hotelera `full_hotel_20260716_v1`: 12.120 jobs.
- Cola de servicios `full_services_20260716_v1`: 2.145 jobs (125 actividades, 2.020 traslados).
- Prueba actividad: Santa Marta, 2 resultados Grupos Travel con detalle, fotos, precio y enlaces.
- Prueba traslado: PUJ - RIU Bambu, 1 resultado Grupos Travel, USD 26.24 y enlace de reserva.
- Prueba de desambiguacion: `DORADO` en San Andres busco `Hotel El Dorado San Andres` y devolvio exclusivamente `Hotel El Dorado`, 7 tarifas HyperGuest; no devolvio Arena Blanca by Dorado.

Panama tiene una salida disponible, pero no existe todavia lista priorizada de hoteles para ese destino. Se planifican actividades; los traslados quedan reportados como `missing_priority_hotels_for_transfer` hasta recibir la lista.

## Nombres De Hotel

- La identidad estable del job es `destino + nombre solicitado + fechas + ocupacion`.
- Un cambio de alias nunca crea un job duplicado.
- Alias resuelto: buscar el nombre canonico completo.
- Alias ambiguo o no resuelto: buscar el nombre solicitado y guardar todos los candidatos reales coincidentes.
- Una coincidencia real unica actualiza `priority_options` como `resolved_from_real_result`.
- Varias coincidencias actualizan `alias_candidates` sin bloquear la carga.
- Familias explicitas como `DECAMERON - Todos los disponibles` nunca se reducen a un solo hotel.

Ejemplos aprendidos en vivo:

- Cartagena / ALMIRANTE -> Hotel Almirante Cartagena - Colombia.
- Cartagena / AMERICAS -> Hotel Las Americas Torre del Mar.
- Santa Marta / IROTAMA -> tres candidatos reales; permanece ambiguo y se capturan todos.

## Proveedores

Hoteles nacionales:

- Grupos Travel
- Omnibees
- HyperGuest

Punta Cana agrega:

- Catalonia
- Ocean Hotels
- RIU

Traslados y actividades se almacenan solo cuando el proveedor normalizado es Grupos Travel.

## Comandos

```powershell
python scripts/plan_hotel_occupancy_refresh.py --date-from 2026-07-16 --load-postgres --batch-id full_hotel_20260716_v1
python scripts/execute_hotel_inventory_jobs.py --batch-id full_hotel_20260716_v1 --occupancy-code DBL --limit 10 --isa-root C:\isa
python scripts/audit_inventory_load.py --hotel-batch full_hotel_20260716_v1 --service-batch full_services_20260716_v1

python scripts/plan_service_inventory_refresh.py --date-from 2026-07-16 --load-postgres --batch-id full_services_20260716_v1
python scripts/execute_service_inventory_jobs.py --batch-id full_services_20260716_v1 --service-type activity --limit 10
python scripts/execute_service_inventory_jobs.py --batch-id full_services_20260716_v1 --service-type transfer --limit 10
```

Los ejecutores son reanudables, usan `FOR UPDATE SKIP LOCKED`, maximo tres intentos y no reclaman un job hasta comprobar una pagina autenticada en Chrome `9222`.

## Capacidad

La semilla completa no es una sola consulta: son 12.120 combinaciones hotel/fecha/ocupacion y 2.145 consultas de servicios. Debe procesarse por lotes reanudables y sin superponer hoteles con servicios en el mismo Chrome. Una captura parcial nunca debe presentarse como carga completa.

El auditor comprueba que cada trabajo conserve una referencia a una salida disponible, que `check_in` sea exactamente la fecha de salida del bloqueo, que `check_out = check_in + noches` y que el destino coincida. Tambien reporta avance por ocupacion, estados de alias y destinos sin lista priorizada.

## Semilla operativa en thor

- Tarea: `BlockInventorySeed`.
- Intervalo temporal de semilla: 5 minutos, con `MultipleInstances=IgnoreNew`.
- Orden dentro de cada ciclo: hoteles, actividades y traslados; nunca se superponen sobre Chrome `9222`.
- El proceso fuerza UTF-8 y limpia estrellas de categoria del nombre usado en el filtro. El nombre y la categoria capturados permanecen intactos en sus campos de inventario.
- El margen del lote es de 90 minutos por ejecutor y la tarea tiene limite de 4 horas, para no abandonar procesos hijos durante respuestas lentas del portal.
- Cuando termine la semilla inicial, este intervalo debe sustituirse por el ciclo diario de actualizacion definido por negocio.

## Ciclo diario posterior a la semilla

`scripts/run_daily_inventory_pipeline.py` ejecuta una cadena unica y trazable:

1. Adquiere el mismo advisory lock de la semilla.
2. Comprueba que la semilla inicial haya terminado.
3. Evita crear dos ciclos completos el mismo dia.
4. Captura WINGO y JETSMART sin limites.
5. Valida e importa bloqueos; desactiva productos ausentes y retira salidas desaparecidas del estado actual.
6. Reencola hoteles exactos y servicios para las salidas vigentes.
7. Marca trabajos pendientes que ya no tienen salida vigente como `skipped`.
8. Deja el ciclo en `queued`; `BlockInventorySeed` consume las colas y lo finaliza como `ok` o `partial`.

Las capturas historicas permanecen en las tablas de snapshots. Las vistas `v_hotel_latest_search_snapshots` y `v_service_latest_search_snapshots` impiden que el frontend mezcle tarifas antiguas con el estado actual.

`v_service_inventory_selector` restringe ademas la lectura operativa a `Grupos Travel`, aunque existan snapshots exploratorios antiguos de otros proveedores.

La cola se ordena por inventario nunca capturado y luego por la captura mas antigua. Esta regla evita que la actualizacion diaria de DBL impida completar SGL, TPL, QDP, CHD o INF.

La tarea programada espera el lock hasta 120 minutos. Una ejecucion manual no espera por defecto y devuelve `chrome_inventory_busy` inmediatamente si Chrome esta ocupado.
