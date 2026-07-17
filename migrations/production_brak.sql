-- =============================================================================
-- Выпуск продукции: колонки брака (кг) по линиям
-- Выполнить в Supabase SQL Editor после ic_calculation_init.sql
-- =============================================================================

ALTER TABLE public.production_output
    ADD COLUMN IF NOT EXISTS fcl1_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS fcl2_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS fcl3_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS fcl4_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS fcl5_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS fcl6_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS fcl7_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS fcl8_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS fcl9_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS peremotka_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS shreder_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS granulyaciya1_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS granulyaciya2_brak NUMERIC,
    ADD COLUMN IF NOT EXISTS granulyaciya3_brak NUMERIC;
