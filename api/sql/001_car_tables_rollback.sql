-- ============================================================================
-- Carrito GT — migración 001 (ROLLBACK)
-- Revierte sql/001_car_tables.sql
-- CUIDADO: borra datos de tablas car_*
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS car_cotizacion CASCADE;
DROP TABLE IF EXISTS car_api_token CASCADE;
DROP TABLE IF EXISTS car_agencia CASCADE;
DROP TABLE IF EXISTS car_contacto CASCADE;
DROP TABLE IF EXISTS car_asesor CASCADE;
DROP TABLE IF EXISTS car_schema_meta CASCADE;

COMMIT;
