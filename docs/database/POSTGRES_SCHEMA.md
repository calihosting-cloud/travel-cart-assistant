# Esquema PostgreSQL Real

Generado desde `information_schema` el 2026-07-16 16:51 (America/Bogota).

Convencion: nombres en ingles y `snake_case`. Las tablas de snapshots conservan historia; las vistas `latest` y operativas exponen el estado vigente.

## Resumen

- Tablas: 52
- Vistas: 20
- Fuente de verdad: PostgreSQL; SQLite es solo respaldo local de demostracion.

## Bloqueos

### `blocking_age_ranges`

Filas actuales: **193**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `id` | `uuid` | no | PK | `gen_random_uuid()` |
| `run_id` | `text` | no | FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no |  | `` |
| `name` | `text` | si |  | `` |
| `age_type` | `text` | si |  | `` |
| `min_age` | `integer` | si |  | `` |
| `max_age` | `integer` | si |  | `` |

Restricciones:
- `blocking_age_ranges_id_not_null`: `id IS NOT NULL`
- `blocking_age_ranges_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_age_ranges_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_categories`

Filas actuales: **117**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `category_id` | `text` | no | PK | `` |
| `label` | `text` | si |  | `` |
| `source_tab` | `text` | no | PK | `` |

Restricciones:
- `blocking_categories_category_id_not_null`: `category_id IS NOT NULL`
- `blocking_categories_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_categories_source_tab_not_null`: `source_tab IS NOT NULL`
- `blocking_categories_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_departure_dates`

Filas actuales: **19077**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `tour_id` | `text` | no | PK | `` |
| `category_id` | `text` | no | PK | `` |
| `category_label` | `text` | si |  | `` |
| `departure_date` | `date` | no | PK | `` |
| `available` | `integer` | si |  | `` |
| `total` | `integer` | si |  | `` |
| `raw_text` | `text` | si |  | `` |
| `visible_availability` | `boolean` | no |  | `false` |
| `latest_run_id` | `text` | no | FK -> `scrape_runs.run_id` | `` |
| `source_url` | `text` | si |  | `` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `blocking_departure_dates_category_id_not_null`: `category_id IS NOT NULL`
- `blocking_departure_dates_departure_date_not_null`: `departure_date IS NOT NULL`
- `blocking_departure_dates_latest_run_id_not_null`: `latest_run_id IS NOT NULL`
- `blocking_departure_dates_tour_id_not_null`: `tour_id IS NOT NULL`
- `blocking_departure_dates_updated_at_not_null`: `updated_at IS NOT NULL`
- `blocking_departure_dates_visible_availability_not_null`: `visible_availability IS NOT NULL`

### `blocking_departure_snapshots`

Filas actuales: **33904**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `category_id` | `text` | no | PK | `` |
| `category_label` | `text` | si |  | `` |
| `departure_date` | `date` | no | PK | `` |
| `available` | `integer` | si |  | `` |
| `total` | `integer` | si |  | `` |
| `raw_text` | `text` | si |  | `` |
| `visible_availability` | `boolean` | no |  | `false` |
| `source_url` | `text` | si |  | `` |
| `captured_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `blocking_departure_snapshots_captured_at_not_null`: `captured_at IS NOT NULL`
- `blocking_departure_snapshots_category_id_not_null`: `category_id IS NOT NULL`
- `blocking_departure_snapshots_departure_date_not_null`: `departure_date IS NOT NULL`
- `blocking_departure_snapshots_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_departure_snapshots_tour_id_not_null`: `tour_id IS NOT NULL`
- `blocking_departure_snapshots_visible_availability_not_null`: `visible_availability IS NOT NULL`

### `blocking_files`

Filas actuales: **402**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `locale` | `text` | no | PK | `` |
| `file_type` | `text` | no | PK | `` |
| `field_name` | `text` | no | PK | `` |
| `has_value` | `boolean` | no |  | `false` |

Restricciones:
- `blocking_files_field_name_not_null`: `field_name IS NOT NULL`
- `blocking_files_file_type_not_null`: `file_type IS NOT NULL`
- `blocking_files_has_value_not_null`: `has_value IS NOT NULL`
- `blocking_files_locale_not_null`: `locale IS NOT NULL`
- `blocking_files_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_files_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_itinerary_days`

Filas actuales: **319**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `row_number` | `integer` | no | PK | `` |
| `day_number` | `integer` | si |  | `` |
| `title` | `text` | si |  | `` |
| `cities` | `text` | si |  | `` |
| `description` | `text` | si |  | `` |

Restricciones:
- `blocking_itinerary_days_row_number_not_null`: `row_number IS NOT NULL`
- `blocking_itinerary_days_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_itinerary_days_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_parameters`

Filas actuales: **67**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `room_ids` | `text[]` | no |  | `'{}'::text[]` |
| `category_ids` | `text[]` | no |  | `'{}'::text[]` |
| `included` | `jsonb` | no |  | `'{}'::jsonb` |
| `not_included` | `jsonb` | no |  | `'{}'::jsonb` |

Restricciones:
- `blocking_parameters_category_ids_not_null`: `category_ids IS NOT NULL`
- `blocking_parameters_included_not_null`: `included IS NOT NULL`
- `blocking_parameters_not_included_not_null`: `not_included IS NOT NULL`
- `blocking_parameters_room_ids_not_null`: `room_ids IS NOT NULL`
- `blocking_parameters_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_parameters_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_policies`

Filas actuales: **79**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `row_number` | `integer` | no | PK | `` |
| `name` | `text` | si |  | `` |
| `days` | `integer` | si |  | `` |
| `policy_type` | `text` | si |  | `` |
| `value` | `numeric` | si |  | `` |

Restricciones:
- `blocking_policies_row_number_not_null`: `row_number IS NOT NULL`
- `blocking_policies_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_policies_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_price_departure_days`

Filas actuales: **18896**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `departure_date` | `date` | no | PK | `` |
| `season` | `text` | si |  | `` |
| `price` | `numeric` | si |  | `` |
| `tax` | `numeric` | si |  | `` |
| `raw_value` | `text` | si |  | `` |

Restricciones:
- `blocking_price_departure_days_departure_date_not_null`: `departure_date IS NOT NULL`
- `blocking_price_departure_days_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_price_departure_days_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_rate_plans`

Filas actuales: **67**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `rate_plan_id` | `text` | si |  | `` |
| `calculation_type` | `text` | si |  | `` |
| `calculation_type_value` | `text` | si |  | `` |
| `currency` | `text` | si |  | `` |
| `currency_label` | `text` | si |  | `` |
| `code` | `text` | si |  | `` |
| `name` | `text` | si |  | `` |
| `initial_string` | `text` | si |  | `` |
| `final_string` | `text` | si |  | `` |
| `min_pax` | `integer` | si |  | `` |
| `max_pax` | `integer` | si |  | `` |
| `release_days` | `integer` | si |  | `` |
| `hierarchy` | `integer` | si |  | `` |
| `status` | `text` | si |  | `` |
| `raw_headings` | `jsonb` | no |  | `'[]'::jsonb` |

Restricciones:
- `blocking_rate_plans_raw_headings_not_null`: `raw_headings IS NOT NULL`
- `blocking_rate_plans_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_rate_plans_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_remarks`

Filas actuales: **139**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `id` | `uuid` | no | PK | `gen_random_uuid()` |
| `run_id` | `text` | no | FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no |  | `` |
| `name` | `text` | si |  | `` |
| `description` | `text` | si |  | `` |

Restricciones:
- `blocking_remarks_id_not_null`: `id IS NOT NULL`
- `blocking_remarks_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_remarks_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_source_links`

Filas actuales: **871**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `tab_name` | `text` | no | PK | `` |
| `source_url` | `text` | no |  | `` |

Restricciones:
- `blocking_source_links_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_source_links_source_url_not_null`: `source_url IS NOT NULL`
- `blocking_source_links_tab_name_not_null`: `tab_name IS NOT NULL`
- `blocking_source_links_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_tabs_status`

Filas actuales: **871**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `tab_name` | `text` | no | PK | `` |
| `status` | `text` | no |  | `` |
| `error` | `text` | si |  | `` |
| `source_url` | `text` | si |  | `` |

Restricciones:
- `blocking_tabs_status_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_tabs_status_status_check`: `(status = ANY (ARRAY['ok'::text, 'error'::text]))`
- `blocking_tabs_status_status_not_null`: `status IS NOT NULL`
- `blocking_tabs_status_tab_name_not_null`: `tab_name IS NOT NULL`
- `blocking_tabs_status_tour_id_not_null`: `tour_id IS NOT NULL`

### `blocking_taxes`

Filas actuales: **124**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK; FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no | PK | `` |
| `row_number` | `integer` | no | PK | `` |
| `name` | `text` | si |  | `` |
| `value_type` | `text` | si |  | `` |
| `value` | `numeric` | si |  | `` |
| `multiplier` | `text` | si |  | `` |

Restricciones:
- `blocking_taxes_row_number_not_null`: `row_number IS NOT NULL`
- `blocking_taxes_run_id_not_null`: `run_id IS NOT NULL`
- `blocking_taxes_tour_id_not_null`: `tour_id IS NOT NULL`

### `blockings`

Filas actuales: **37**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `tour_id` | `text` | no | PK | `` |
| `operator_name` | `text` | si |  | `` |
| `operator_id` | `text` | si |  | `` |
| `name` | `text` | no |  | `` |
| `origin_city` | `text` | si |  | `` |
| `origin_city_key` | `text` | si |  | `` |
| `destination_city` | `text` | si |  | `` |
| `destination_city_key` | `text` | si |  | `` |
| `nights` | `integer` | si |  | `` |
| `route_text` | `text` | si |  | `` |
| `type` | `text` | si |  | `` |
| `catalog` | `text` | si |  | `` |
| `currency` | `text` | si |  | `` |
| `start_month` | `text` | si |  | `` |
| `end_month` | `text` | si |  | `` |
| `portal_last_update` | `text` | si |  | `` |
| `active` | `text` | si |  | `` |
| `latest_run_id` | `text` | si | FK -> `scrape_runs.run_id` | `` |
| `latest_status` | `text` | no |  | `'ok'::text` |
| `first_seen_at` | `timestamp with time zone` | no |  | `now()` |
| `last_seen_at` | `timestamp with time zone` | no |  | `now()` |
| `source_view_url` | `text` | si |  | `` |
| `source_departures_url` | `text` | si |  | `` |
| `source_rate_plan_url` | `text` | si |  | `` |

Restricciones:
- `blockings_first_seen_at_not_null`: `first_seen_at IS NOT NULL`
- `blockings_last_seen_at_not_null`: `last_seen_at IS NOT NULL`
- `blockings_latest_status_check`: `(latest_status = ANY (ARRAY['ok'::text, 'partial'::text, 'error'::text]))`
- `blockings_latest_status_not_null`: `latest_status IS NOT NULL`
- `blockings_name_not_null`: `name IS NOT NULL`
- `blockings_tour_id_not_null`: `tour_id IS NOT NULL`

### `raw_blocking_snapshots`

Filas actuales: **67**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `id` | `uuid` | no | PK | `gen_random_uuid()` |
| `run_id` | `text` | no | FK -> `scrape_runs.run_id` | `` |
| `tour_id` | `text` | no |  | `` |
| `operator_name` | `text` | si |  | `` |
| `status` | `text` | no |  | `` |
| `tab_error_count` | `integer` | no |  | `0` |
| `scraped_at` | `timestamp with time zone` | si |  | `` |
| `payload` | `jsonb` | no |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `raw_blocking_snapshots_created_at_not_null`: `created_at IS NOT NULL`
- `raw_blocking_snapshots_id_not_null`: `id IS NOT NULL`
- `raw_blocking_snapshots_payload_not_null`: `payload IS NOT NULL`
- `raw_blocking_snapshots_run_id_not_null`: `run_id IS NOT NULL`
- `raw_blocking_snapshots_status_check`: `(status = ANY (ARRAY['ok'::text, 'partial'::text, 'error'::text]))`
- `raw_blocking_snapshots_status_not_null`: `status IS NOT NULL`
- `raw_blocking_snapshots_tab_error_count_not_null`: `tab_error_count IS NOT NULL`
- `raw_blocking_snapshots_tour_id_not_null`: `tour_id IS NOT NULL`

### `scrape_runs`

Filas actuales: **4**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `run_id` | `text` | no | PK | `` |
| `started_at` | `timestamp with time zone` | si |  | `` |
| `finished_at` | `timestamp with time zone` | si |  | `` |
| `status` | `text` | no |  | `` |
| `operators` | `text[]` | no |  | `'{}'::text[]` |
| `total_items` | `integer` | no |  | `0` |
| `ok_items` | `integer` | no |  | `0` |
| `partial_items` | `integer` | no |  | `0` |
| `error_items` | `integer` | no |  | `0` |
| `metadata` | `jsonb` | no |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `scrape_runs_created_at_not_null`: `created_at IS NOT NULL`
- `scrape_runs_error_items_not_null`: `error_items IS NOT NULL`
- `scrape_runs_metadata_not_null`: `metadata IS NOT NULL`
- `scrape_runs_ok_items_not_null`: `ok_items IS NOT NULL`
- `scrape_runs_operators_not_null`: `operators IS NOT NULL`
- `scrape_runs_partial_items_not_null`: `partial_items IS NOT NULL`
- `scrape_runs_run_id_not_null`: `run_id IS NOT NULL`
- `scrape_runs_status_check`: `(status = ANY (ARRAY['ok'::text, 'partial'::text, 'error'::text]))`
- `scrape_runs_status_not_null`: `status IS NOT NULL`
- `scrape_runs_total_items_not_null`: `total_items IS NOT NULL`

## Hoteles

### `hotel_age_policies`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `hotel_age_policy_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `hotel_name` | `text` | no |  | `` |
| `canonical_name` | `text` | si |  | `` |
| `destination_key` | `text` | no |  | `` |
| `provider` | `text` | si |  | `` |
| `infant_age_from` | `integer` | no |  | `0` |
| `infant_age_to` | `integer` | no |  | `1` |
| `child_age_from` | `integer` | no |  | `2` |
| `child_age_to` | `integer` | no |  | `11` |
| `adult_age_from` | `integer` | no |  | `12` |
| `source_type` | `text` | no |  | `` |
| `source_url` | `text` | si |  | `` |
| `confidence` | `numeric` | si |  | `` |
| `raw_evidence` | `jsonb` | no |  | `'{}'::jsonb` |
| `active` | `boolean` | no |  | `true` |
| `captured_at` | `timestamp with time zone` | no |  | `now()` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `hotel_age_policies_active_not_null`: `active IS NOT NULL`
- `hotel_age_policies_adult_age_from_not_null`: `adult_age_from IS NOT NULL`
- `hotel_age_policies_captured_at_not_null`: `captured_at IS NOT NULL`
- `hotel_age_policies_check`: `(infant_age_to < child_age_from)`
- `hotel_age_policies_check1`: `(child_age_to < adult_age_from)`
- `hotel_age_policies_child_age_from_not_null`: `child_age_from IS NOT NULL`
- `hotel_age_policies_child_age_to_not_null`: `child_age_to IS NOT NULL`
- `hotel_age_policies_created_at_not_null`: `created_at IS NOT NULL`
- `hotel_age_policies_destination_key_not_null`: `destination_key IS NOT NULL`
- `hotel_age_policies_hotel_age_policy_id_not_null`: `hotel_age_policy_id IS NOT NULL`
- `hotel_age_policies_hotel_name_not_null`: `hotel_name IS NOT NULL`
- `hotel_age_policies_infant_age_from_check`: `(infant_age_from >= 0)`
- `hotel_age_policies_infant_age_from_not_null`: `infant_age_from IS NOT NULL`
- `hotel_age_policies_infant_age_to_not_null`: `infant_age_to IS NOT NULL`
- `hotel_age_policies_raw_evidence_not_null`: `raw_evidence IS NOT NULL`
- `hotel_age_policies_source_type_check`: `(source_type = ANY (ARRAY['portal_explicit'::text, 'portal_probe'::text, 'manual'::text, 'default'::text]))`
- `hotel_age_policies_source_type_not_null`: `source_type IS NOT NULL`

### `hotel_inventory_jobs`

Filas actuales: **12120**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `job_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `job_key` | `text` | no |  | `` |
| `batch_id` | `text` | no |  | `` |
| `destination_city` | `text` | no |  | `` |
| `destination_key` | `text` | no |  | `` |
| `requested_hotel_name` | `text` | no |  | `` |
| `canonical_hotel_name` | `text` | si |  | `` |
| `check_in` | `date` | no |  | `` |
| `check_out` | `date` | no |  | `` |
| `nights` | `integer` | no |  | `` |
| `occupancy_code` | `text` | no |  | `` |
| `rooms` | `integer` | no |  | `1` |
| `adults` | `integer` | no |  | `` |
| `children` | `integer` | no |  | `0` |
| `child_ages` | `int4[]` | no |  | `'{}'::integer[]` |
| `allowed_providers` | `text[]` | no |  | `'{}'::text[]` |
| `blocking_references` | `jsonb` | no |  | `'[]'::jsonb` |
| `status` | `text` | no |  | `'pending'::text` |
| `attempt_count` | `integer` | no |  | `0` |
| `last_error` | `text` | si |  | `` |
| `output_path` | `text` | si |  | `` |
| `started_at` | `timestamp with time zone` | si |  | `` |
| `finished_at` | `timestamp with time zone` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |
| `search_hotel_name` | `text` | si |  | `` |
| `alias_status` | `text` | si |  | `` |

Restricciones:
- `hotel_inventory_jobs_adults_not_null`: `adults IS NOT NULL`
- `hotel_inventory_jobs_allowed_providers_not_null`: `allowed_providers IS NOT NULL`
- `hotel_inventory_jobs_attempt_count_not_null`: `attempt_count IS NOT NULL`
- `hotel_inventory_jobs_batch_id_not_null`: `batch_id IS NOT NULL`
- `hotel_inventory_jobs_blocking_references_not_null`: `blocking_references IS NOT NULL`
- `hotel_inventory_jobs_check_in_not_null`: `check_in IS NOT NULL`
- `hotel_inventory_jobs_check_out_not_null`: `check_out IS NOT NULL`
- `hotel_inventory_jobs_child_ages_not_null`: `child_ages IS NOT NULL`
- `hotel_inventory_jobs_children_not_null`: `children IS NOT NULL`
- `hotel_inventory_jobs_created_at_not_null`: `created_at IS NOT NULL`
- `hotel_inventory_jobs_destination_city_not_null`: `destination_city IS NOT NULL`
- `hotel_inventory_jobs_destination_key_not_null`: `destination_key IS NOT NULL`
- `hotel_inventory_jobs_job_id_not_null`: `job_id IS NOT NULL`
- `hotel_inventory_jobs_job_key_not_null`: `job_key IS NOT NULL`
- `hotel_inventory_jobs_nights_not_null`: `nights IS NOT NULL`
- `hotel_inventory_jobs_occupancy_code_check`: `(occupancy_code = ANY (ARRAY['SGL'::text, 'DBL'::text, 'TPL'::text, 'QDP'::text, 'CHD'::text, 'INF'::text]))`
- `hotel_inventory_jobs_occupancy_code_not_null`: `occupancy_code IS NOT NULL`
- `hotel_inventory_jobs_requested_hotel_name_not_null`: `requested_hotel_name IS NOT NULL`
- `hotel_inventory_jobs_rooms_not_null`: `rooms IS NOT NULL`
- `hotel_inventory_jobs_status_check`: `(status = ANY (ARRAY['pending'::text, 'running'::text, 'ok'::text, 'no_results'::text, 'error'::text, 'skipped'::text]))`
- `hotel_inventory_jobs_status_not_null`: `status IS NOT NULL`
- `hotel_inventory_jobs_updated_at_not_null`: `updated_at IS NOT NULL`

### `hotel_media`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `media_id` | `bigint` | no | PK | `nextval('hotel_media_media_id_seq'::regclass)` |
| `snapshot_id` | `text` | no | FK -> `hotel_view_snapshots.snapshot_id` | `` |
| `media_url` | `text` | no |  | `` |
| `alt_text` | `text` | si |  | `` |
| `title` | `text` | si |  | `` |
| `width` | `integer` | si |  | `` |
| `height` | `integer` | si |  | `` |
| `class_name` | `text` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `hotel_media_created_at_not_null`: `created_at IS NOT NULL`
- `hotel_media_media_id_not_null`: `media_id IS NOT NULL`
- `hotel_media_media_url_not_null`: `media_url IS NOT NULL`
- `hotel_media_snapshot_id_not_null`: `snapshot_id IS NOT NULL`

### `hotel_rate_snapshots`

Filas actuales: **40**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `rate_snapshot_id` | `bigint` | no | PK | `nextval('hotel_rate_snapshots_rate_snapshot_id_seq'::regclass)` |
| `snapshot_id` | `text` | no | FK -> `hotel_view_snapshots.snapshot_id` | `` |
| `source_row_index` | `integer` | no |  | `` |
| `occupancy_code` | `text` | no |  | `` |
| `room_quantity` | `integer` | si |  | `` |
| `room_name` | `text` | no |  | `` |
| `adults` | `integer` | si |  | `` |
| `children` | `integer` | si |  | `` |
| `child_ages` | `int4[]` | si |  | `'{}'::integer[]` |
| `availability_status` | `text` | si |  | `` |
| `meal_plan_raw` | `text` | si |  | `` |
| `meal_plan` | `text` | si |  | `` |
| `refundable` | `boolean` | si |  | `` |
| `refundability_label` | `text` | si |  | `` |
| `discount_percent` | `numeric` | si |  | `` |
| `currency` | `text` | no |  | `` |
| `base_total` | `numeric` | si |  | `` |
| `base_nightly` | `numeric` | si |  | `` |
| `supplier` | `text` | si |  | `` |
| `raw_room` | `text` | si |  | `` |
| `raw_options` | `text` | si |  | `` |
| `raw_price` | `text` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `hotel_rate_snapshots_created_at_not_null`: `created_at IS NOT NULL`
- `hotel_rate_snapshots_currency_not_null`: `currency IS NOT NULL`
- `hotel_rate_snapshots_occupancy_code_not_null`: `occupancy_code IS NOT NULL`
- `hotel_rate_snapshots_rate_snapshot_id_not_null`: `rate_snapshot_id IS NOT NULL`
- `hotel_rate_snapshots_room_name_not_null`: `room_name IS NOT NULL`
- `hotel_rate_snapshots_snapshot_id_not_null`: `snapshot_id IS NOT NULL`
- `hotel_rate_snapshots_source_row_index_not_null`: `source_row_index IS NOT NULL`

### `hotel_search_results`

Filas actuales: **561**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `hotel_search_result_id` | `bigint` | no | PK | `nextval('hotel_search_results_hotel_search_result_id_seq'::regclass)` |
| `hotel_search_snapshot_id` | `uuid` | no | FK -> `hotel_search_snapshots.hotel_search_snapshot_id` | `` |
| `result_index` | `integer` | no |  | `` |
| `hotel_product_id` | `text` | si |  | `` |
| `hotel_name` | `text` | no |  | `` |
| `canonical_name` | `text` | si |  | `` |
| `alias_status` | `text` | si |  | `` |
| `provider` | `text` | si |  | `` |
| `stars` | `numeric` | si |  | `` |
| `destination_label` | `text` | si |  | `` |
| `location_text` | `text` | si |  | `` |
| `min_currency` | `text` | si |  | `` |
| `min_total_amount` | `numeric` | si |  | `` |
| `min_nightly_amount` | `numeric` | si |  | `` |
| `meal_summary` | `text` | si |  | `` |
| `room_summary` | `text` | si |  | `` |
| `refundable_summary` | `text` | si |  | `` |
| `image_url` | `text` | si |  | `` |
| `detail_url` | `text` | si |  | `` |
| `booking_url` | `text` | si |  | `` |
| `raw_payload` | `jsonb` | no |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `rate_fingerprint` | `text` | si |  | `` |

Restricciones:
- `hotel_search_results_created_at_not_null`: `created_at IS NOT NULL`
- `hotel_search_results_hotel_name_not_null`: `hotel_name IS NOT NULL`
- `hotel_search_results_hotel_search_result_id_not_null`: `hotel_search_result_id IS NOT NULL`
- `hotel_search_results_hotel_search_snapshot_id_not_null`: `hotel_search_snapshot_id IS NOT NULL`
- `hotel_search_results_raw_payload_not_null`: `raw_payload IS NOT NULL`
- `hotel_search_results_result_index_not_null`: `result_index IS NOT NULL`

### `hotel_search_snapshots`

Filas actuales: **55**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `hotel_search_snapshot_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `run_id` | `text` | si |  | `` |
| `captured_at` | `timestamp with time zone` | no |  | `now()` |
| `destination_city` | `text` | no |  | `` |
| `destination_key` | `text` | no |  | `` |
| `check_in` | `date` | si |  | `` |
| `check_out` | `date` | si |  | `` |
| `nights` | `integer` | si |  | `` |
| `rooms` | `integer` | si |  | `` |
| `adults` | `integer` | si |  | `` |
| `children` | `integer` | si |  | `` |
| `child_ages` | `int4[]` | si |  | `'{}'::integer[]` |
| `source_url` | `text` | si |  | `` |
| `total_found` | `integer` | si |  | `` |
| `filters_payload` | `jsonb` | no |  | `'{}'::jsonb` |
| `raw_payload` | `jsonb` | no |  | `'{}'::jsonb` |
| `occupancy_code` | `text` | si |  | `` |
| `reference_age` | `integer` | si |  | `` |
| `job_id` | `uuid` | si |  | `` |

Restricciones:
- `hotel_search_snapshots_captured_at_not_null`: `captured_at IS NOT NULL`
- `hotel_search_snapshots_destination_city_not_null`: `destination_city IS NOT NULL`
- `hotel_search_snapshots_destination_key_not_null`: `destination_key IS NOT NULL`
- `hotel_search_snapshots_filters_payload_not_null`: `filters_payload IS NOT NULL`
- `hotel_search_snapshots_hotel_search_snapshot_id_not_null`: `hotel_search_snapshot_id IS NOT NULL`
- `hotel_search_snapshots_raw_payload_not_null`: `raw_payload IS NOT NULL`

### `hotel_view_snapshots`

Filas actuales: **1**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `snapshot_id` | `text` | no | PK | `` |
| `captured_at` | `timestamp with time zone` | no |  | `now()` |
| `source_url` | `text` | no |  | `` |
| `final_url` | `text` | si |  | `` |
| `hotel_product_id` | `text` | si |  | `` |
| `hotel_name` | `text` | no |  | `` |
| `destination_label` | `text` | si |  | `` |
| `destination_id` | `text` | si |  | `` |
| `check_in` | `date` | si |  | `` |
| `check_out` | `date` | si |  | `` |
| `nights` | `integer` | si |  | `` |
| `rooms` | `integer` | si |  | `` |
| `adults` | `integer` | si |  | `` |
| `children` | `integer` | si |  | `` |
| `child_ages` | `int4[]` | si |  | `'{}'::integer[]` |
| `occupancy_code` | `text` | si |  | `` |
| `title` | `text` | si |  | `` |
| `description_text` | `text` | si |  | `` |
| `raw_payload` | `jsonb` | no |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `hotel_view_snapshots_captured_at_not_null`: `captured_at IS NOT NULL`
- `hotel_view_snapshots_created_at_not_null`: `created_at IS NOT NULL`
- `hotel_view_snapshots_hotel_name_not_null`: `hotel_name IS NOT NULL`
- `hotel_view_snapshots_raw_payload_not_null`: `raw_payload IS NOT NULL`
- `hotel_view_snapshots_snapshot_id_not_null`: `snapshot_id IS NOT NULL`
- `hotel_view_snapshots_source_url_not_null`: `source_url IS NOT NULL`

## Servicios

### `activity_media`

Filas actuales: **35**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `media_id` | `bigint` | no | PK | `nextval('activity_media_media_id_seq'::regclass)` |
| `activity_row_id` | `text` | no | FK -> `activity_rate_snapshots.activity_row_id` | `` |
| `media_url` | `text` | no |  | `` |
| `alt_text` | `text` | si |  | `` |
| `title` | `text` | si |  | `` |
| `width` | `integer` | si |  | `` |
| `height` | `integer` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `activity_media_activity_row_id_not_null`: `activity_row_id IS NOT NULL`
- `activity_media_created_at_not_null`: `created_at IS NOT NULL`
- `activity_media_media_id_not_null`: `media_id IS NOT NULL`
- `activity_media_media_url_not_null`: `media_url IS NOT NULL`

### `activity_rate_snapshots`

Filas actuales: **17**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `activity_rate_id` | `bigint` | no | PK | `nextval('activity_rate_snapshots_activity_rate_id_seq'::regclass)` |
| `activity_row_id` | `text` | si |  | `` |
| `snapshot_id` | `text` | no | FK -> `service_search_snapshots.snapshot_id` | `` |
| `activity_id` | `text` | si |  | `` |
| `name` | `text` | no |  | `` |
| `provider` | `text` | si |  | `` |
| `currency` | `text` | si |  | `` |
| `base_price_per_person` | `numeric` | si |  | `` |
| `price_cop` | `numeric` | si |  | `` |
| `price_usd` | `numeric` | si |  | `` |
| `is_free` | `boolean` | no |  | `false` |
| `per_person` | `boolean` | no |  | `true` |
| `price_text` | `text` | si |  | `` |
| `description` | `text` | si |  | `` |
| `detail_text` | `text` | si |  | `` |
| `detail_url` | `text` | si |  | `` |
| `booking_url` | `text` | si |  | `` |
| `image_url` | `text` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `activity_rate_snapshots_activity_rate_id_not_null`: `activity_rate_id IS NOT NULL`
- `activity_rate_snapshots_created_at_not_null`: `created_at IS NOT NULL`
- `activity_rate_snapshots_is_free_not_null`: `is_free IS NOT NULL`
- `activity_rate_snapshots_name_not_null`: `name IS NOT NULL`
- `activity_rate_snapshots_per_person_not_null`: `per_person IS NOT NULL`
- `activity_rate_snapshots_snapshot_id_not_null`: `snapshot_id IS NOT NULL`

### `service_inventory_jobs`

Filas actuales: **2145**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `job_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `job_key` | `text` | no |  | `` |
| `batch_id` | `text` | no |  | `` |
| `service_type` | `text` | no |  | `` |
| `destination_city` | `text` | no |  | `` |
| `destination_key` | `text` | no |  | `` |
| `airport_code` | `text` | si |  | `` |
| `requested_hotel_name` | `text` | si |  | `` |
| `search_hotel_name` | `text` | si |  | `` |
| `alias_status` | `text` | si |  | `` |
| `check_in` | `date` | no |  | `` |
| `check_out` | `date` | no |  | `` |
| `nights` | `integer` | no |  | `` |
| `adults` | `integer` | no |  | `2` |
| `children` | `integer` | no |  | `0` |
| `passengers` | `integer` | no |  | `2` |
| `blocking_references` | `jsonb` | no |  | `'[]'::jsonb` |
| `status` | `text` | no |  | `'pending'::text` |
| `attempt_count` | `integer` | no |  | `0` |
| `last_error` | `text` | si |  | `` |
| `output_path` | `text` | si |  | `` |
| `started_at` | `timestamp with time zone` | si |  | `` |
| `finished_at` | `timestamp with time zone` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `service_inventory_jobs_adults_not_null`: `adults IS NOT NULL`
- `service_inventory_jobs_attempt_count_not_null`: `attempt_count IS NOT NULL`
- `service_inventory_jobs_batch_id_not_null`: `batch_id IS NOT NULL`
- `service_inventory_jobs_blocking_references_not_null`: `blocking_references IS NOT NULL`
- `service_inventory_jobs_check_in_not_null`: `check_in IS NOT NULL`
- `service_inventory_jobs_check_out_not_null`: `check_out IS NOT NULL`
- `service_inventory_jobs_children_not_null`: `children IS NOT NULL`
- `service_inventory_jobs_created_at_not_null`: `created_at IS NOT NULL`
- `service_inventory_jobs_destination_city_not_null`: `destination_city IS NOT NULL`
- `service_inventory_jobs_destination_key_not_null`: `destination_key IS NOT NULL`
- `service_inventory_jobs_job_id_not_null`: `job_id IS NOT NULL`
- `service_inventory_jobs_job_key_not_null`: `job_key IS NOT NULL`
- `service_inventory_jobs_nights_not_null`: `nights IS NOT NULL`
- `service_inventory_jobs_passengers_not_null`: `passengers IS NOT NULL`
- `service_inventory_jobs_service_type_check`: `(service_type = ANY (ARRAY['transfer'::text, 'activity'::text]))`
- `service_inventory_jobs_service_type_not_null`: `service_type IS NOT NULL`
- `service_inventory_jobs_status_check`: `(status = ANY (ARRAY['pending'::text, 'running'::text, 'ok'::text, 'no_results'::text, 'error'::text, 'skipped'::text]))`
- `service_inventory_jobs_status_not_null`: `status IS NOT NULL`
- `service_inventory_jobs_updated_at_not_null`: `updated_at IS NOT NULL`

### `service_search_snapshots`

Filas actuales: **18**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `snapshot_id` | `text` | no | PK | `` |
| `captured_at` | `timestamp with time zone` | no |  | `now()` |
| `service_type` | `text` | no |  | `` |
| `destination_city` | `text` | si |  | `` |
| `destination_key` | `text` | si |  | `` |
| `check_in` | `date` | si |  | `` |
| `check_out` | `date` | si |  | `` |
| `passengers` | `integer` | si |  | `` |
| `adults` | `integer` | si |  | `` |
| `children` | `integer` | si |  | `` |
| `requested_hotel` | `text` | si |  | `` |
| `matched_origin_term` | `text` | si |  | `` |
| `matched_destination_term` | `text` | si |  | `` |
| `source_url` | `text` | si |  | `` |
| `total_found` | `integer` | no |  | `0` |
| `screenshot_path` | `text` | si |  | `` |
| `raw_payload` | `jsonb` | no |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `service_search_snapshots_captured_at_not_null`: `captured_at IS NOT NULL`
- `service_search_snapshots_created_at_not_null`: `created_at IS NOT NULL`
- `service_search_snapshots_raw_payload_not_null`: `raw_payload IS NOT NULL`
- `service_search_snapshots_service_type_check`: `(service_type = ANY (ARRAY['transfer'::text, 'activity'::text]))`
- `service_search_snapshots_service_type_not_null`: `service_type IS NOT NULL`
- `service_search_snapshots_snapshot_id_not_null`: `snapshot_id IS NOT NULL`
- `service_search_snapshots_total_found_not_null`: `total_found IS NOT NULL`

### `transfer_rate_snapshots`

Filas actuales: **14**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `transfer_rate_id` | `bigint` | no | PK | `nextval('transfer_rate_snapshots_transfer_rate_id_seq'::regclass)` |
| `snapshot_id` | `text` | no | FK -> `service_search_snapshots.snapshot_id` | `` |
| `service_name` | `text` | no |  | `` |
| `modality` | `text` | si |  | `` |
| `provider` | `text` | si |  | `` |
| `currency` | `text` | si |  | `` |
| `base_total` | `numeric` | si |  | `` |
| `max_passengers` | `integer` | si |  | `` |
| `max_luggage` | `integer` | si |  | `` |
| `pickup_time` | `text` | si |  | `` |
| `requested_hotel` | `text` | si |  | `` |
| `booking_url` | `text` | si |  | `` |
| `image_url` | `text` | si |  | `` |
| `details` | `text[]` | si |  | `'{}'::text[]` |
| `raw_text` | `text` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `transfer_rate_snapshots_created_at_not_null`: `created_at IS NOT NULL`
- `transfer_rate_snapshots_service_name_not_null`: `service_name IS NOT NULL`
- `transfer_rate_snapshots_snapshot_id_not_null`: `snapshot_id IS NOT NULL`
- `transfer_rate_snapshots_transfer_rate_id_not_null`: `transfer_rate_id IS NOT NULL`

## Catalogos y reglas

### `fee_rule_versions`

Filas actuales: **1**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `fee_rule_version` | `text` | no | PK | `` |
| `active_from` | `date` | no |  | `` |
| `active_to` | `date` | si |  | `` |
| `domestic_hotel_booking_fee_cop` | `numeric` | no |  | `` |
| `international_hotel_booking_fee_usd` | `numeric` | no |  | `` |
| `domestic_assistance_cop_per_pax_per_night` | `numeric` | no |  | `` |
| `international_assistance_usd_per_pax_per_night` | `numeric` | no |  | `` |
| `domestic_flight_admin_fee_cop_per_pax` | `numeric` | no |  | `` |
| `international_flight_admin_fee_usd_per_pax` | `numeric` | no |  | `` |
| `notes` | `text` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `fee_rule_versions_active_from_not_null`: `active_from IS NOT NULL`
- `fee_rule_versions_created_at_not_null`: `created_at IS NOT NULL`
- `fee_rule_versions_domestic_assistance_cop_per_pax_per__not_null`: `domestic_assistance_cop_per_pax_per_night IS NOT NULL`
- `fee_rule_versions_domestic_flight_admin_fee_cop_per_pa_not_null`: `domestic_flight_admin_fee_cop_per_pax IS NOT NULL`
- `fee_rule_versions_domestic_hotel_booking_fee_cop_not_null`: `domestic_hotel_booking_fee_cop IS NOT NULL`
- `fee_rule_versions_fee_rule_version_not_null`: `fee_rule_version IS NOT NULL`
- `fee_rule_versions_international_assistance_usd_per_pax_not_null`: `international_assistance_usd_per_pax_per_night IS NOT NULL`
- `fee_rule_versions_international_flight_admin_fee_usd_p_not_null`: `international_flight_admin_fee_usd_per_pax IS NOT NULL`
- `fee_rule_versions_international_hotel_booking_fee_usd_not_null`: `international_hotel_booking_fee_usd IS NOT NULL`

### `inventory_load_schedules`

Filas actuales: **4**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `schedule_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `name` | `text` | no |  | `` |
| `inventory_type` | `text` | no |  | `` |
| `timezone` | `text` | no |  | `'America/Bogota'::text` |
| `run_times` | `time[]` | no |  | `ARRAY['06:00:00'::time without time zone, '15:00:00'::time without time zone]` |
| `enabled` | `boolean` | no |  | `false` |
| `max_runs_per_day` | `integer` | no |  | `2` |
| `last_run_id` | `text` | si | FK -> `scrape_runs.run_id` | `` |
| `last_started_at` | `timestamp with time zone` | si |  | `` |
| `last_finished_at` | `timestamp with time zone` | si |  | `` |
| `last_status` | `text` | si |  | `` |
| `next_run_at` | `timestamp with time zone` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `inventory_load_schedules_created_at_not_null`: `created_at IS NOT NULL`
- `inventory_load_schedules_enabled_not_null`: `enabled IS NOT NULL`
- `inventory_load_schedules_inventory_type_check`: `(inventory_type = ANY (ARRAY['blockings'::text, 'hotels'::text, 'services'::text, 'all'::text]))`
- `inventory_load_schedules_inventory_type_not_null`: `inventory_type IS NOT NULL`
- `inventory_load_schedules_max_runs_per_day_check`: `((max_runs_per_day >= 1) AND (max_runs_per_day <= 3))`
- `inventory_load_schedules_max_runs_per_day_not_null`: `max_runs_per_day IS NOT NULL`
- `inventory_load_schedules_name_not_null`: `name IS NOT NULL`
- `inventory_load_schedules_run_times_not_null`: `run_times IS NOT NULL`
- `inventory_load_schedules_schedule_id_not_null`: `schedule_id IS NOT NULL`
- `inventory_load_schedules_timezone_not_null`: `timezone IS NOT NULL`
- `inventory_load_schedules_updated_at_not_null`: `updated_at IS NOT NULL`

### `inventory_pipeline_runs`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `pipeline_run_id` | `text` | no | PK | `` |
| `blocking_run_id` | `text` | si | FK -> `scrape_runs.run_id` | `` |
| `status` | `text` | no |  | `` |
| `current_phase` | `text` | no |  | `` |
| `operators` | `text[]` | no |  | `'{}'::text[]` |
| `hotel_batch_id` | `text` | si |  | `` |
| `service_batch_id` | `text` | si |  | `` |
| `seed_pending_at_start` | `integer` | no |  | `0` |
| `counts` | `jsonb` | no |  | `'{}'::jsonb` |
| `errors` | `jsonb` | no |  | `'[]'::jsonb` |
| `started_at` | `timestamp with time zone` | no |  | `now()` |
| `finished_at` | `timestamp with time zone` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `inventory_pipeline_runs_counts_not_null`: `counts IS NOT NULL`
- `inventory_pipeline_runs_created_at_not_null`: `created_at IS NOT NULL`
- `inventory_pipeline_runs_current_phase_not_null`: `current_phase IS NOT NULL`
- `inventory_pipeline_runs_errors_not_null`: `errors IS NOT NULL`
- `inventory_pipeline_runs_operators_not_null`: `operators IS NOT NULL`
- `inventory_pipeline_runs_pipeline_run_id_not_null`: `pipeline_run_id IS NOT NULL`
- `inventory_pipeline_runs_seed_pending_at_start_not_null`: `seed_pending_at_start IS NOT NULL`
- `inventory_pipeline_runs_started_at_not_null`: `started_at IS NOT NULL`
- `inventory_pipeline_runs_status_check`: `(status = ANY (ARRAY['running'::text, 'queued'::text, 'ok'::text, 'partial'::text, 'error'::text, 'skipped'::text]))`
- `inventory_pipeline_runs_status_not_null`: `status IS NOT NULL`
- `inventory_pipeline_runs_updated_at_not_null`: `updated_at IS NOT NULL`

### `priority_option_lists`

Filas actuales: **1**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `list_id` | `text` | no | PK | `` |
| `source_url` | `text` | no |  | `` |
| `fetched_at` | `timestamp with time zone` | no |  | `now()` |
| `source_rows` | `integer` | no |  | `0` |
| `active` | `boolean` | no |  | `true` |
| `raw_headers` | `text[]` | si |  | `'{}'::text[]` |
| `notes` | `text` | si |  | `` |

Restricciones:
- `priority_option_lists_active_not_null`: `active IS NOT NULL`
- `priority_option_lists_fetched_at_not_null`: `fetched_at IS NOT NULL`
- `priority_option_lists_list_id_not_null`: `list_id IS NOT NULL`
- `priority_option_lists_source_rows_not_null`: `source_rows IS NOT NULL`
- `priority_option_lists_source_url_not_null`: `source_url IS NOT NULL`

### `priority_options`

Filas actuales: **65**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `option_id` | `bigint` | no | PK | `nextval('priority_options_option_id_seq'::regclass)` |
| `list_id` | `text` | no | FK -> `priority_option_lists.list_id` | `` |
| `destination_city` | `text` | no |  | `` |
| `destination_key` | `text` | no |  | `` |
| `option_type` | `text` | no |  | `` |
| `requested_name` | `text` | no |  | `` |
| `canonical_name` | `text` | si |  | `` |
| `alias_status` | `text` | si |  | `` |
| `alias_confidence` | `text` | si |  | `` |
| `alias_source` | `text` | si |  | `` |
| `alias_reason` | `text` | si |  | `` |
| `alias_candidates` | `jsonb` | no |  | `'[]'::jsonb` |
| `provider_filter` | `text` | no |  | `'Grupos Travel'::text` |
| `active` | `boolean` | no |  | `true` |
| `source_row_index` | `integer` | no |  | `` |
| `raw_payload` | `jsonb` | no |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `priority_options_active_not_null`: `active IS NOT NULL`
- `priority_options_alias_candidates_not_null`: `alias_candidates IS NOT NULL`
- `priority_options_created_at_not_null`: `created_at IS NOT NULL`
- `priority_options_destination_city_not_null`: `destination_city IS NOT NULL`
- `priority_options_destination_key_not_null`: `destination_key IS NOT NULL`
- `priority_options_list_id_not_null`: `list_id IS NOT NULL`
- `priority_options_option_id_not_null`: `option_id IS NOT NULL`
- `priority_options_option_type_check`: `(option_type = ANY (ARRAY['hotel'::text, 'transfer'::text, 'tour'::text, 'activity'::text, 'service'::text]))`
- `priority_options_option_type_not_null`: `option_type IS NOT NULL`
- `priority_options_provider_filter_not_null`: `provider_filter IS NOT NULL`
- `priority_options_raw_payload_not_null`: `raw_payload IS NOT NULL`
- `priority_options_requested_name_not_null`: `requested_name IS NOT NULL`
- `priority_options_source_row_index_not_null`: `source_row_index IS NOT NULL`

## Paquetes y cotizaciones

### `flyer_requests`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `flyer_request_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `matrix_id` | `uuid` | si | FK -> `package_price_matrices.matrix_id` | `` |
| `package_id` | `uuid` | si | FK -> `package_drafts.package_id` | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `created_by` | `text` | si |  | `` |
| `status` | `text` | no |  | `'draft'::text` |
| `publication_type` | `text` | si |  | `` |
| `title` | `text` | si |  | `` |
| `subtitle` | `text` | si |  | `` |
| `destination_text` | `text` | si |  | `` |
| `origin_text` | `text` | si |  | `` |
| `airline_logo_required` | `boolean` | si |  | `false` |
| `hotel_logo_required` | `boolean` | si |  | `false` |
| `hotel_photo_required` | `boolean` | si |  | `false` |
| `hero_image_url` | `text` | si |  | `` |
| `includes` | `text[]` | si |  | `'{}'::text[]` |
| `not_includes` | `text[]` | si |  | `'{}'::text[]` |
| `notes` | `text[]` | si |  | `'{}'::text[]` |
| `sale_until_label` | `text` | si |  | `` |
| `terms_label` | `text` | si |  | `` |
| `output_payload` | `jsonb` | no |  | `'{}'::jsonb` |

Restricciones:
- `flyer_requests_created_at_not_null`: `created_at IS NOT NULL`
- `flyer_requests_flyer_request_id_not_null`: `flyer_request_id IS NOT NULL`
- `flyer_requests_output_payload_not_null`: `output_payload IS NOT NULL`
- `flyer_requests_status_check`: `(status = ANY (ARRAY['draft'::text, 'ready_for_design'::text, 'sent'::text, 'archived'::text]))`
- `flyer_requests_status_not_null`: `status IS NOT NULL`

### `package_blocking_links`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `package_blocking_link_id` | `bigint` | no | PK | `nextval('package_blocking_links_package_blocking_link_id_seq'::regclass)` |
| `package_id` | `uuid` | no | FK -> `package_drafts.package_id` | `` |
| `tour_id` | `text` | no |  | `` |
| `departure_date` | `date` | si |  | `` |
| `category_label` | `text` | si |  | `` |
| `available_at_creation` | `integer` | si |  | `` |
| `total_at_creation` | `integer` | si |  | `` |
| `blocking_snapshot_run_id` | `text` | si |  | `` |
| `source_departure_url` | `text` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `package_blocking_links_created_at_not_null`: `created_at IS NOT NULL`
- `package_blocking_links_package_blocking_link_id_not_null`: `package_blocking_link_id IS NOT NULL`
- `package_blocking_links_package_id_not_null`: `package_id IS NOT NULL`
- `package_blocking_links_tour_id_not_null`: `tour_id IS NOT NULL`

### `package_departures`

Filas actuales: **2**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `package_departure_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `package_id` | `uuid` | no | FK -> `package_drafts.package_id` | `` |
| `tour_id` | `text` | no |  | `` |
| `departure_date` | `date` | no |  | `` |
| `category_id` | `text` | si |  | `` |
| `category_label` | `text` | si |  | `` |
| `operator_name` | `text` | si |  | `` |
| `origin_city` | `text` | si |  | `` |
| `origin_city_key` | `text` | si |  | `` |
| `destination_city` | `text` | si |  | `` |
| `destination_city_key` | `text` | si |  | `` |
| `nights` | `integer` | si |  | `` |
| `available_at_creation` | `integer` | si |  | `` |
| `total_at_creation` | `integer` | si |  | `` |
| `blocking_price_per_person` | `numeric` | si |  | `` |
| `baggage_price_per_person` | `numeric` | si |  | `` |
| `currency` | `text` | si |  | `` |
| `source_url` | `text` | si |  | `` |
| `snapshot_run_id` | `text` | si |  | `` |
| `active` | `boolean` | no |  | `true` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `package_departures_active_not_null`: `active IS NOT NULL`
- `package_departures_created_at_not_null`: `created_at IS NOT NULL`
- `package_departures_departure_date_not_null`: `departure_date IS NOT NULL`
- `package_departures_package_departure_id_not_null`: `package_departure_id IS NOT NULL`
- `package_departures_package_id_not_null`: `package_id IS NOT NULL`
- `package_departures_tour_id_not_null`: `tour_id IS NOT NULL`

### `package_drafts`

Filas actuales: **2**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `package_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |
| `status` | `text` | no |  | `'draft'::text` |
| `created_by` | `text` | si |  | `` |
| `blocking_tour_id` | `text` | si |  | `` |
| `blocking_departure_date` | `date` | si |  | `` |
| `destination_city` | `text` | si |  | `` |
| `nights` | `integer` | si |  | `` |
| `pax_adults` | `integer` | si |  | `` |
| `pax_children` | `integer` | si |  | `` |
| `child_ages` | `int4[]` | si |  | `'{}'::integer[]` |
| `currency` | `text` | si |  | `` |
| `fee_rule_version` | `text` | si | FK -> `fee_rule_versions.fee_rule_version` | `` |
| `subtotal_base` | `numeric` | si |  | `` |
| `subtotal_fees` | `numeric` | si |  | `` |
| `total_amount` | `numeric` | si |  | `` |
| `deposit_amount` | `numeric` | si |  | `` |
| `notes` | `text` | si |  | `` |
| `raw_selection` | `jsonb` | no |  | `'{}'::jsonb` |
| `package_code` | `text` | si |  | `` |
| `package_name` | `text` | si |  | `` |
| `version_number` | `integer` | no |  | `1` |
| `operator_name` | `text` | si |  | `` |
| `origin_city` | `text` | si |  | `` |
| `origin_city_key` | `text` | si |  | `` |
| `destination_city_key` | `text` | si |  | `` |
| `route_text` | `text` | si |  | `` |
| `blocking_category` | `text` | si |  | `` |
| `blocking_departure_total` | `integer` | si |  | `` |
| `blocking_departure_available` | `integer` | si |  | `` |
| `selected_matrix_id` | `uuid` | si |  | `` |
| `selected_flyer_request_id` | `uuid` | si |  | `` |
| `approved_at` | `timestamp with time zone` | si |  | `` |
| `approved_by` | `text` | si |  | `` |
| `archived_at` | `timestamp with time zone` | si |  | `` |
| `archived_by` | `text` | si |  | `` |
| `pax_infants` | `integer` | no |  | `0` |
| `total_passengers` | `integer` | si |  | `` |
| `incentive_amount` | `numeric` | no |  | `0` |
| `incentive_mode` | `text` | no |  | `'per_person'::text` |
| `public_summary` | `text` | si |  | `` |
| `public_slug` | `text` | si |  | `` |
| `published_at` | `timestamp with time zone` | si |  | `` |
| `published_by` | `text` | si |  | `` |

Restricciones:
- `package_drafts_created_at_not_null`: `created_at IS NOT NULL`
- `package_drafts_incentive_amount_not_null`: `incentive_amount IS NOT NULL`
- `package_drafts_incentive_mode_not_null`: `incentive_mode IS NOT NULL`
- `package_drafts_package_id_not_null`: `package_id IS NOT NULL`
- `package_drafts_pax_infants_not_null`: `pax_infants IS NOT NULL`
- `package_drafts_raw_selection_not_null`: `raw_selection IS NOT NULL`
- `package_drafts_status_not_null`: `status IS NOT NULL`
- `package_drafts_updated_at_not_null`: `updated_at IS NOT NULL`
- `package_drafts_version_number_not_null`: `version_number IS NOT NULL`

### `package_items`

Filas actuales: **4**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `package_item_id` | `bigint` | no | PK | `nextval('package_items_package_item_id_seq'::regclass)` |
| `package_id` | `uuid` | no | FK -> `package_drafts.package_id` | `` |
| `item_type` | `text` | no |  | `` |
| `item_label` | `text` | no |  | `` |
| `source_snapshot_id` | `text` | si |  | `` |
| `source_rate_snapshot_id` | `bigint` | si |  | `` |
| `source_url` | `text` | si |  | `` |
| `currency` | `text` | si |  | `` |
| `base_amount` | `numeric` | si |  | `` |
| `fee_amount` | `numeric` | si |  | `` |
| `total_amount` | `numeric` | si |  | `` |
| `item_payload` | `jsonb` | no |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `package_items_created_at_not_null`: `created_at IS NOT NULL`
- `package_items_item_label_not_null`: `item_label IS NOT NULL`
- `package_items_item_payload_not_null`: `item_payload IS NOT NULL`
- `package_items_item_type_not_null`: `item_type IS NOT NULL`
- `package_items_package_id_not_null`: `package_id IS NOT NULL`
- `package_items_package_item_id_not_null`: `package_item_id IS NOT NULL`

### `package_price_matrices`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `matrix_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `package_id` | `uuid` | si | FK -> `package_drafts.package_id` | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |
| `created_by` | `text` | si |  | `` |
| `status` | `text` | no |  | `'draft'::text` |
| `destination_city` | `text` | si |  | `` |
| `origin_city` | `text` | si |  | `` |
| `operator_name` | `text` | si |  | `` |
| `airline_name` | `text` | si |  | `` |
| `blocking_tour_id` | `text` | si |  | `` |
| `departure_date_label` | `text` | si |  | `` |
| `sale_until_label` | `text` | si |  | `` |
| `currency` | `text` | si |  | `` |
| `fee_rule_version` | `text` | si | FK -> `fee_rule_versions.fee_rule_version` | `` |
| `notes` | `text` | si |  | `` |
| `raw_context` | `jsonb` | no |  | `'{}'::jsonb` |

Restricciones:
- `package_price_matrices_created_at_not_null`: `created_at IS NOT NULL`
- `package_price_matrices_matrix_id_not_null`: `matrix_id IS NOT NULL`
- `package_price_matrices_raw_context_not_null`: `raw_context IS NOT NULL`
- `package_price_matrices_status_check`: `(status = ANY (ARRAY['draft'::text, 'review'::text, 'approved'::text, 'archived'::text]))`
- `package_price_matrices_status_not_null`: `status IS NOT NULL`
- `package_price_matrices_updated_at_not_null`: `updated_at IS NOT NULL`

### `package_price_matrix_cells`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `matrix_cell_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `matrix_row_id` | `uuid` | no | FK -> `package_price_matrix_rows.matrix_row_id` | `` |
| `occupancy_code` | `text` | no |  | `` |
| `occupancy_label` | `text` | si |  | `` |
| `age_from` | `integer` | si |  | `` |
| `age_to` | `integer` | si |  | `` |
| `available` | `boolean` | no |  | `true` |
| `currency` | `text` | si |  | `` |
| `price_per_person` | `numeric` | si |  | `` |
| `base_components_total` | `numeric` | si |  | `` |
| `fees_total` | `numeric` | si |  | `` |
| `hotel_rate_snapshot_id` | `bigint` | si |  | `` |
| `comparison_rate_snapshot_id` | `bigint` | si |  | `` |
| `calculation_method` | `text` | si |  | `` |
| `calculation_notes` | `text` | si |  | `` |
| `cell_payload` | `jsonb` | no |  | `'{}'::jsonb` |

Restricciones:
- `package_price_matrix_cells_available_not_null`: `available IS NOT NULL`
- `package_price_matrix_cells_cell_payload_not_null`: `cell_payload IS NOT NULL`
- `package_price_matrix_cells_matrix_cell_id_not_null`: `matrix_cell_id IS NOT NULL`
- `package_price_matrix_cells_matrix_row_id_not_null`: `matrix_row_id IS NOT NULL`
- `package_price_matrix_cells_occupancy_code_check`: `(occupancy_code = ANY (ARRAY['SGL'::text, 'DBL'::text, 'TPL'::text, 'QDP'::text, 'CHD'::text, 'INF'::text]))`
- `package_price_matrix_cells_occupancy_code_not_null`: `occupancy_code IS NOT NULL`

### `package_price_matrix_rows`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `matrix_row_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `matrix_id` | `uuid` | no | FK -> `package_price_matrices.matrix_id` | `` |
| `sort_order` | `integer` | no |  | `0` |
| `hotel_name` | `text` | no |  | `` |
| `room_name` | `text` | si |  | `` |
| `meal_plan` | `text` | si |  | `` |
| `meal_plan_code` | `text` | si |  | `` |
| `display_label` | `text` | si |  | `` |
| `source_hotel_snapshot_id` | `text` | si |  | `` |
| `source_url` | `text` | si |  | `` |
| `row_payload` | `jsonb` | no |  | `'{}'::jsonb` |

Restricciones:
- `package_price_matrix_rows_hotel_name_not_null`: `hotel_name IS NOT NULL`
- `package_price_matrix_rows_matrix_id_not_null`: `matrix_id IS NOT NULL`
- `package_price_matrix_rows_matrix_row_id_not_null`: `matrix_row_id IS NOT NULL`
- `package_price_matrix_rows_row_payload_not_null`: `row_payload IS NOT NULL`
- `package_price_matrix_rows_sort_order_not_null`: `sort_order IS NOT NULL`

### `package_publications`

Filas actuales: **1**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `publication_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `package_id` | `uuid` | no | FK -> `package_drafts.package_id` | `` |
| `slug` | `text` | no |  | `` |
| `status` | `text` | no |  | `'draft'::text` |
| `public_title` | `text` | no |  | `` |
| `public_summary` | `text` | si |  | `` |
| `hero_image_url` | `text` | si |  | `` |
| `currency` | `text` | no |  | `'COP'::text` |
| `price_from_per_person` | `numeric` | si |  | `` |
| `incentive_amount` | `numeric` | no |  | `0` |
| `min_adults` | `integer` | no |  | `1` |
| `max_passengers` | `integer` | si |  | `` |
| `sale_until` | `date` | si |  | `` |
| `published_at` | `timestamp with time zone` | si |  | `` |
| `published_by` | `uuid` | si | FK -> `app_users.user_id` | `` |
| `terms_text` | `text` | si |  | `` |
| `contact_cta_label` | `text` | no |  | `'Hablar con un asesor'::text` |
| `metadata` | `jsonb` | no |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `package_publications_contact_cta_label_not_null`: `contact_cta_label IS NOT NULL`
- `package_publications_created_at_not_null`: `created_at IS NOT NULL`
- `package_publications_currency_not_null`: `currency IS NOT NULL`
- `package_publications_incentive_amount_not_null`: `incentive_amount IS NOT NULL`
- `package_publications_metadata_not_null`: `metadata IS NOT NULL`
- `package_publications_min_adults_not_null`: `min_adults IS NOT NULL`
- `package_publications_package_id_not_null`: `package_id IS NOT NULL`
- `package_publications_public_title_not_null`: `public_title IS NOT NULL`
- `package_publications_publication_id_not_null`: `publication_id IS NOT NULL`
- `package_publications_slug_not_null`: `slug IS NOT NULL`
- `package_publications_status_check`: `(status = ANY (ARRAY['draft'::text, 'published'::text, 'paused'::text, 'expired'::text, 'archived'::text]))`
- `package_publications_status_not_null`: `status IS NOT NULL`
- `package_publications_updated_at_not_null`: `updated_at IS NOT NULL`

### `package_revision_snapshots`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `package_revision_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `package_id` | `uuid` | no | FK -> `package_drafts.package_id` | `` |
| `version_number` | `integer` | no |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `created_by` | `text` | si |  | `` |
| `status` | `text` | si |  | `` |
| `total_amount` | `numeric` | si |  | `` |
| `deposit_amount` | `numeric` | si |  | `` |
| `snapshot_payload` | `jsonb` | no |  | `` |

Restricciones:
- `package_revision_snapshots_created_at_not_null`: `created_at IS NOT NULL`
- `package_revision_snapshots_package_id_not_null`: `package_id IS NOT NULL`
- `package_revision_snapshots_package_revision_id_not_null`: `package_revision_id IS NOT NULL`
- `package_revision_snapshots_snapshot_payload_not_null`: `snapshot_payload IS NOT NULL`
- `package_revision_snapshots_version_number_not_null`: `version_number IS NOT NULL`

### `package_status_history`

Filas actuales: **7**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `package_status_history_id` | `bigint` | no | PK | `nextval('package_status_history_package_status_history_id_seq'::regclass)` |
| `package_id` | `uuid` | no | FK -> `package_drafts.package_id` | `` |
| `changed_at` | `timestamp with time zone` | no |  | `now()` |
| `changed_by` | `text` | si |  | `` |
| `old_status` | `text` | si |  | `` |
| `new_status` | `text` | no |  | `` |
| `reason` | `text` | si |  | `` |
| `payload` | `jsonb` | no |  | `'{}'::jsonb` |

Restricciones:
- `package_status_history_changed_at_not_null`: `changed_at IS NOT NULL`
- `package_status_history_new_status_not_null`: `new_status IS NOT NULL`
- `package_status_history_package_id_not_null`: `package_id IS NOT NULL`
- `package_status_history_package_status_history_id_not_null`: `package_status_history_id IS NOT NULL`
- `package_status_history_payload_not_null`: `payload IS NOT NULL`

### `quotation_drafts`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `quotation_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `quotation_code` | `text` | si |  | `` |
| `package_id` | `uuid` | si | FK -> `package_drafts.package_id` | `` |
| `status` | `text` | no |  | `'draft'::text` |
| `version_number` | `integer` | no |  | `1` |
| `customer_name` | `text` | si |  | `` |
| `customer_channel` | `text` | si |  | `` |
| `created_by` | `text` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |
| `destination_city` | `text` | si |  | `` |
| `destination_city_key` | `text` | si |  | `` |
| `origin_city` | `text` | si |  | `` |
| `origin_city_key` | `text` | si |  | `` |
| `departure_date` | `date` | si |  | `` |
| `return_date` | `date` | si |  | `` |
| `nights` | `integer` | si |  | `` |
| `pax_adults` | `integer` | si |  | `` |
| `pax_children` | `integer` | si |  | `` |
| `child_ages` | `int4[]` | si |  | `'{}'::integer[]` |
| `currency` | `text` | no |  | `'COP'::text` |
| `trm` | `numeric` | si |  | `` |
| `subtotal_base` | `numeric` | si |  | `` |
| `subtotal_fees` | `numeric` | si |  | `` |
| `total_amount` | `numeric` | si |  | `` |
| `deposit_amount` | `numeric` | si |  | `` |
| `public_notes` | `text` | si |  | `` |
| `internal_notes` | `text` | si |  | `` |
| `raw_payload` | `jsonb` | no |  | `'{}'::jsonb` |

Restricciones:
- `quotation_drafts_created_at_not_null`: `created_at IS NOT NULL`
- `quotation_drafts_currency_not_null`: `currency IS NOT NULL`
- `quotation_drafts_quotation_id_not_null`: `quotation_id IS NOT NULL`
- `quotation_drafts_raw_payload_not_null`: `raw_payload IS NOT NULL`
- `quotation_drafts_status_check`: `(status = ANY (ARRAY['draft'::text, 'review'::text, 'sent'::text, 'accepted'::text, 'expired'::text, 'archived'::text]))`
- `quotation_drafts_status_not_null`: `status IS NOT NULL`
- `quotation_drafts_updated_at_not_null`: `updated_at IS NOT NULL`
- `quotation_drafts_version_number_not_null`: `version_number IS NOT NULL`

### `quotation_flight_components`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `flight_component_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `quotation_id` | `uuid` | si | FK -> `quotation_drafts.quotation_id` | `` |
| `package_id` | `uuid` | si | FK -> `package_drafts.package_id` | `` |
| `component_source` | `text` | no |  | `` |
| `airline` | `text` | si |  | `` |
| `flight_number_out` | `text` | si |  | `` |
| `flight_number_return` | `text` | si |  | `` |
| `origin_airport` | `text` | si |  | `` |
| `destination_airport` | `text` | si |  | `` |
| `departure_at` | `timestamp with time zone` | si |  | `` |
| `return_at` | `timestamp with time zone` | si |  | `` |
| `schedule_text` | `text` | si |  | `` |
| `baggage_label` | `text` | si |  | `` |
| `currency` | `text` | no |  | `'COP'::text` |
| `net_amount_per_person` | `numeric` | si |  | `` |
| `tax_amount_per_person` | `numeric` | si |  | `` |
| `admin_fee_per_person` | `numeric` | si |  | `` |
| `total_amount_per_person` | `numeric` | si |  | `` |
| `booking_url` | `text` | si |  | `` |
| `source_url` | `text` | si |  | `` |
| `source_reference` | `text` | si |  | `` |
| `internal_notes` | `text` | si |  | `` |
| `raw_payload` | `jsonb` | no |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `quotation_flight_components_component_source_check`: `(component_source = ANY (ARRAY['blocking'::text, 'manual'::text, 'scraped'::text, 'external'::text]))`
- `quotation_flight_components_component_source_not_null`: `component_source IS NOT NULL`
- `quotation_flight_components_created_at_not_null`: `created_at IS NOT NULL`
- `quotation_flight_components_currency_not_null`: `currency IS NOT NULL`
- `quotation_flight_components_flight_component_id_not_null`: `flight_component_id IS NOT NULL`
- `quotation_flight_components_raw_payload_not_null`: `raw_payload IS NOT NULL`

### `quotation_items`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `quotation_item_id` | `bigint` | no | PK | `nextval('quotation_items_quotation_item_id_seq'::regclass)` |
| `quotation_id` | `uuid` | no | FK -> `quotation_drafts.quotation_id` | `` |
| `item_type` | `text` | no |  | `` |
| `item_label` | `text` | no |  | `` |
| `source_kind` | `text` | si |  | `` |
| `source_id` | `text` | si |  | `` |
| `source_url` | `text` | si |  | `` |
| `provider` | `text` | si |  | `` |
| `currency` | `text` | si |  | `` |
| `net_amount` | `numeric` | si |  | `` |
| `tax_amount` | `numeric` | si |  | `` |
| `fee_amount` | `numeric` | si |  | `` |
| `total_amount` | `numeric` | si |  | `` |
| `per_person` | `boolean` | no |  | `false` |
| `quantity` | `numeric` | no |  | `1` |
| `public_visible` | `boolean` | no |  | `true` |
| `item_payload` | `jsonb` | no |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `quotation_items_created_at_not_null`: `created_at IS NOT NULL`
- `quotation_items_item_label_not_null`: `item_label IS NOT NULL`
- `quotation_items_item_payload_not_null`: `item_payload IS NOT NULL`
- `quotation_items_item_type_check`: `(item_type = ANY (ARRAY['blocking'::text, 'flight'::text, 'hotel'::text, 'transfer'::text, 'tour'::text, 'activity'::text, 'assistance'::text, 'fee'::text, 'manual_adjustment'::text]))`
- `quotation_items_item_type_not_null`: `item_type IS NOT NULL`
- `quotation_items_per_person_not_null`: `per_person IS NOT NULL`
- `quotation_items_public_visible_not_null`: `public_visible IS NOT NULL`
- `quotation_items_quantity_not_null`: `quantity IS NOT NULL`
- `quotation_items_quotation_id_not_null`: `quotation_id IS NOT NULL`
- `quotation_items_quotation_item_id_not_null`: `quotation_item_id IS NOT NULL`

### `quotation_revision_snapshots`

Filas actuales: **0**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `quotation_revision_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `quotation_id` | `uuid` | no | FK -> `quotation_drafts.quotation_id` | `` |
| `version_number` | `integer` | no |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `created_by` | `text` | si |  | `` |
| `status` | `text` | si |  | `` |
| `rendered_text` | `text` | si |  | `` |
| `rendered_html` | `text` | si |  | `` |
| `snapshot_payload` | `jsonb` | no |  | `` |

Restricciones:
- `quotation_revision_snapshots_created_at_not_null`: `created_at IS NOT NULL`
- `quotation_revision_snapshots_quotation_id_not_null`: `quotation_id IS NOT NULL`
- `quotation_revision_snapshots_quotation_revision_id_not_null`: `quotation_revision_id IS NOT NULL`
- `quotation_revision_snapshots_snapshot_payload_not_null`: `snapshot_payload IS NOT NULL`
- `quotation_revision_snapshots_version_number_not_null`: `version_number IS NOT NULL`

## Usuarios y ventas

### `app_users`

Filas actuales: **1**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `user_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `email` | `text` | no |  | `` |
| `full_name` | `text` | no |  | `` |
| `role` | `text` | no |  | `'commercial'::text` |
| `phone` | `text` | si |  | `` |
| `active` | `boolean` | no |  | `true` |
| `password_hash` | `text` | si |  | `` |
| `invite_status` | `text` | no |  | `'pending'::text` |
| `last_login_at` | `timestamp with time zone` | si |  | `` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `app_users_active_not_null`: `active IS NOT NULL`
- `app_users_created_at_not_null`: `created_at IS NOT NULL`
- `app_users_email_not_null`: `email IS NOT NULL`
- `app_users_full_name_not_null`: `full_name IS NOT NULL`
- `app_users_invite_status_check`: `(invite_status = ANY (ARRAY['pending'::text, 'active'::text, 'disabled'::text]))`
- `app_users_invite_status_not_null`: `invite_status IS NOT NULL`
- `app_users_role_check`: `(role = ANY (ARRAY['admin'::text, 'operations'::text, 'commercial'::text, 'advisor'::text, 'viewer'::text]))`
- `app_users_role_not_null`: `role IS NOT NULL`
- `app_users_updated_at_not_null`: `updated_at IS NOT NULL`
- `app_users_user_id_not_null`: `user_id IS NOT NULL`

### `sales_lead_events`

Filas actuales: **4**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `lead_event_id` | `bigint` | no | PK | `nextval('sales_lead_events_lead_event_id_seq'::regclass)` |
| `lead_id` | `uuid` | no | FK -> `sales_leads.lead_id` | `` |
| `event_type` | `text` | no |  | `` |
| `old_status` | `text` | si |  | `` |
| `new_status` | `text` | si |  | `` |
| `created_by` | `uuid` | si | FK -> `app_users.user_id` | `` |
| `notes` | `text` | si |  | `` |
| `payload` | `jsonb` | no |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `sales_lead_events_created_at_not_null`: `created_at IS NOT NULL`
- `sales_lead_events_event_type_not_null`: `event_type IS NOT NULL`
- `sales_lead_events_lead_event_id_not_null`: `lead_event_id IS NOT NULL`
- `sales_lead_events_lead_id_not_null`: `lead_id IS NOT NULL`
- `sales_lead_events_payload_not_null`: `payload IS NOT NULL`

### `sales_leads`

Filas actuales: **1**.

| Campo | Tipo | Nulo | Clave/relacion | Default |
|---|---|---:|---|---|
| `lead_id` | `uuid` | no | PK | `gen_random_uuid()` |
| `lead_code` | `text` | no |  | `` |
| `publication_id` | `uuid` | si | FK -> `package_publications.publication_id` | `` |
| `package_id` | `uuid` | si | FK -> `package_drafts.package_id` | `` |
| `package_departure_id` | `uuid` | si | FK -> `package_departures.package_departure_id` | `` |
| `status` | `text` | no |  | `'new'::text` |
| `customer_name` | `text` | no |  | `` |
| `customer_email` | `text` | si |  | `` |
| `customer_phone` | `text` | no |  | `` |
| `preferred_channel` | `text` | no |  | `'whatsapp'::text` |
| `origin_city` | `text` | si |  | `` |
| `destination_city` | `text` | si |  | `` |
| `desired_departure_date` | `date` | si |  | `` |
| `adults` | `integer` | no |  | `2` |
| `children` | `integer` | no |  | `0` |
| `infants` | `integer` | no |  | `0` |
| `child_ages` | `int4[]` | no |  | `'{}'::integer[]` |
| `notes` | `text` | si |  | `` |
| `consent_at` | `timestamp with time zone` | si |  | `` |
| `assigned_to` | `uuid` | si | FK -> `app_users.user_id` | `` |
| `source` | `text` | no |  | `'public_catalog'::text` |
| `source_url` | `text` | si |  | `` |
| `snapshot_payload` | `jsonb` | no |  | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | no |  | `now()` |
| `updated_at` | `timestamp with time zone` | no |  | `now()` |

Restricciones:
- `sales_leads_adults_not_null`: `adults IS NOT NULL`
- `sales_leads_child_ages_not_null`: `child_ages IS NOT NULL`
- `sales_leads_children_not_null`: `children IS NOT NULL`
- `sales_leads_created_at_not_null`: `created_at IS NOT NULL`
- `sales_leads_customer_name_not_null`: `customer_name IS NOT NULL`
- `sales_leads_customer_phone_not_null`: `customer_phone IS NOT NULL`
- `sales_leads_infants_not_null`: `infants IS NOT NULL`
- `sales_leads_lead_code_not_null`: `lead_code IS NOT NULL`
- `sales_leads_lead_id_not_null`: `lead_id IS NOT NULL`
- `sales_leads_preferred_channel_check`: `(preferred_channel = ANY (ARRAY['whatsapp'::text, 'phone'::text, 'email'::text]))`
- `sales_leads_preferred_channel_not_null`: `preferred_channel IS NOT NULL`
- `sales_leads_snapshot_payload_not_null`: `snapshot_payload IS NOT NULL`
- `sales_leads_source_not_null`: `source IS NOT NULL`
- `sales_leads_status_check`: `(status = ANY (ARRAY['new'::text, 'assigned'::text, 'contacted'::text, 'quoted'::text, 'won'::text, 'lost'::text, 'archived'::text]))`
- `sales_leads_status_not_null`: `status IS NOT NULL`
- `sales_leads_updated_at_not_null`: `updated_at IS NOT NULL`

## Vistas

- `v_available_departure_options`: tour_id, operator_name, blocking_name, origin_city, origin_city_key, destination_city, destination_city_key, nights, category_id, category_label, departure_date, available, total, visible_availability, source_url
- `v_blocking_departure_calendar`: tour_id, operator_name, blocking_name, origin_city, origin_city_key, destination_city, destination_city_key, nights, category_id, category_label, departure_date, available, total, visible_availability, source_url
- `v_blocking_summary`: tour_id, operator_name, name, origin_city, origin_city_key, destination_city, destination_city_key, nights, route_text, currency, start_month, end_month, portal_last_update, latest_status, category_count, visible_departure_count, total_available, first_available_date, last_available_date, source_view_url, source_departures_url, source_rate_plan_url
- `v_hotel_city_inventory`: hotel_search_snapshot_id, destination_city, destination_key, check_in, check_out, nights, adults, children, hotel_search_result_id, result_index, hotel_product_id, hotel_name, canonical_name, provider, stars, min_currency, min_total_amount, detail_url, booking_url, captured_at
- `v_hotel_filter_options`: hotel_name, destination_label, check_in, check_out, nights, occupancy_code, room_names, meal_plans, refundability_options, currencies, min_base_total, max_base_total, rate_count
- `v_hotel_latest_search_snapshots`: hotel_search_snapshot_id, run_id, captured_at, destination_city, destination_key, check_in, check_out, nights, rooms, adults, children, child_ages, source_url, total_found, filters_payload, raw_payload, occupancy_code, reference_age, job_id
- `v_hotel_occupancy_rate_matrix`: destination_key, hotel_name, room_summary, meal_summary, provider, check_in, check_out, currency, sgl_total, dbl_total, tpl_total, qdp_total, family_chd_total, family_inf_total, child_reference_age, infant_reference_age
- `v_hotel_rate_selector`: snapshot_id, rate_snapshot_id, hotel_product_id, hotel_name, destination_label, destination_id, check_in, check_out, nights, occupancy_code, room_name, room_quantity, adults, children, child_ages, meal_plan, meal_plan_raw, refundable, refundability_label, availability_status, discount_percent, currency, base_total, base_nightly, supplier, source_url, final_url, captured_at
- `v_package_price_matrix_pivot`: matrix_id, matrix_row_id, destination_city, origin_city, operator_name, airline_name, departure_date_label, sale_until_label, sort_order, hotel_name, room_name, meal_plan, meal_plan_code, sgl_price, dbl_price, tpl_price, qdp_price, chd_price, inf_price, currency
- `v_package_registry_summary`: blocking_tour_id, blocking_departure_date, operator_name, origin_city, destination_city, route_text, package_count, draft_count, review_count, approved_count, archived_count, first_package_created_at, last_package_updated_at
- `v_packages_by_blocking`: package_id, package_code, package_name, version_number, status, created_at, updated_at, created_by, approved_at, approved_by, blocking_tour_id, blocking_departure_date, blocking_category, operator_name, origin_city, destination_city, route_text, nights, currency, total_amount, deposit_amount, selected_matrix_id, selected_flyer_request_id, item_count, hotel_item_count, transfer_item_count, activity_item_count
- `v_priority_options_selector`: option_id, list_id, destination_city, destination_key, option_type, requested_name, display_name, canonical_name, alias_status, alias_confidence, alias_source, alias_candidates, provider_filter, active, fetched_at, source_url
- `v_public_package_catalog`: publication_id, slug, public_title, public_summary, hero_image_url, currency, price_from_per_person, incentive_amount, min_adults, max_passengers, sale_until, contact_cta_label, package_id, package_code, origin_city, origin_city_key, destination_city, destination_city_key, nights, pax_adults, pax_children, pax_infants, raw_selection, first_departure_date, last_departure_date, departure_count, minimum_captured_availability, departure_dates
- `v_quotation_summary`: quotation_id, quotation_code, package_id, status, version_number, customer_name, origin_city, destination_city, departure_date, return_date, nights, currency, total_amount, deposit_amount, item_count, flight_item_count, hotel_item_count, service_item_count, updated_at
- `v_sales_lead_queue`: lead_id, lead_code, publication_id, package_id, package_departure_id, status, customer_name, customer_email, customer_phone, preferred_channel, origin_city, destination_city, desired_departure_date, adults, children, infants, child_ages, notes, consent_at, assigned_to, source, source_url, snapshot_payload, created_at, updated_at, package_code, package_title, advisor_name, advisor_email
- `v_scrape_health`: run_id, started_at, finished_at, status, operators, total_items, ok_items, partial_items, error_items, duration_seconds
- `v_selector_destinations`: destination_city, destination_city_key, blocking_count, visible_departure_count, total_available, first_available_date, last_available_date
- `v_selector_months`: destination_city, destination_city_key, month_start, month_key, blocking_count, visible_departure_count, total_available
- `v_service_inventory_selector`: snapshot_id, service_type, destination_city, check_in, check_out, item_id, item_name, modality, provider, currency, base_amount, per_person, booking_url, image_url
- `v_service_latest_search_snapshots`: snapshot_id, captured_at, service_type, destination_city, destination_key, check_in, check_out, passengers, adults, children, requested_hotel, matched_origin_term, matched_destination_term, source_url, total_found, screenshot_path, raw_payload, created_at

## Regla de lectura

- Estado actual de bloqueos: `v_blocking_summary`, `v_blocking_departure_calendar` y `v_available_departure_options`.
- Historia de cupos: `blocking_departure_snapshots`; no usarla directamente como estado actual.
- Hoteles actuales: `v_hotel_latest_search_snapshots`, `v_hotel_city_inventory` y `v_hotel_occupancy_rate_matrix`.
- Servicios actuales: `v_service_latest_search_snapshots` y `v_service_inventory_selector`.
- Seguimiento de cargas: `scrape_runs`, `inventory_pipeline_runs`, `hotel_inventory_jobs` y `service_inventory_jobs`.
- Paquetes publicados: `v_public_package_catalog`; solicitudes comerciales: `v_sales_lead_queue`.
