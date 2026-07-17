-- =============================================================================
-- Расчёт ИЦ — единая миграция
-- 1) Таблица ic_readings
-- 2) Доступ access_ic_calculation в lava_users
-- 3) Сиды: март / апрель / май 2026 (Исправительный центр)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Таблица показаний
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ic_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    month TEXT NOT NULL,
    ee_reading NUMERIC,
    water_supply_reading NUMERIC,
    water_drainage_reading NUMERIC,
    heating_reading NUMERIC,
    residents_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(year, month)
);

-- На случай если таблица уже была без residents_count
ALTER TABLE public.ic_readings
    ADD COLUMN IF NOT EXISTS residents_count INTEGER;

ALTER TABLE public.ic_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ic_readings_select" ON public.ic_readings;
DROP POLICY IF EXISTS "ic_readings_insert" ON public.ic_readings;
DROP POLICY IF EXISTS "ic_readings_update" ON public.ic_readings;
DROP POLICY IF EXISTS "ic_readings_delete" ON public.ic_readings;

CREATE POLICY "ic_readings_select" ON public.ic_readings FOR SELECT USING (true);
CREATE POLICY "ic_readings_insert" ON public.ic_readings FOR INSERT WITH CHECK (true);
CREATE POLICY "ic_readings_update" ON public.ic_readings FOR UPDATE USING (true);
CREATE POLICY "ic_readings_delete" ON public.ic_readings FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- 2. Права на вкладку «Расчёт ИЦ»
-- -----------------------------------------------------------------------------
ALTER TABLE public.lava_users
    ADD COLUMN IF NOT EXISTS access_ic_calculation BOOLEAN DEFAULT false;

-- Всем, у кого уже есть «Потребление ЭЭ», и admin — открываем вкладку
UPDATE public.lava_users
SET access_ic_calculation = true
WHERE access_energy_report = true
   OR username = 'admin';

-- -----------------------------------------------------------------------------
-- 3. Начальные данные (из отчётов Апрель/Май 2026)
--    Вода: один счётчик → supply = drainage
--    Март — база для расчёта апреля
-- -----------------------------------------------------------------------------
INSERT INTO public.ic_readings (
    year,
    month,
    ee_reading,
    water_supply_reading,
    water_drainage_reading,
    heating_reading,
    residents_count
) VALUES
    (2026, 'Март',   1774, 2653, 2653, 129, NULL),
    (2026, 'Апрель', 1990, 2993, 2993, 142, 43),
    (2026, 'Май',    2187, 3351, 3351, 142, 47)
ON CONFLICT (year, month) DO UPDATE SET
    ee_reading              = EXCLUDED.ee_reading,
    water_supply_reading    = EXCLUDED.water_supply_reading,
    water_drainage_reading  = EXCLUDED.water_drainage_reading,
    heating_reading         = EXCLUDED.heating_reading,
    residents_count         = EXCLUDED.residents_count;
