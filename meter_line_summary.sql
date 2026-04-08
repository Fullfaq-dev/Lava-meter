-- Таблица для хранения итогового расчёта по ВСЕМ счётчикам за каждый месяц.
-- Данные вычисляются на фронте (consumptionCalc.js + Vedomost.jsx) и
-- автоматически сохраняются при открытии страницы Ведомость.

CREATE TABLE IF NOT EXISTS meter_line_summary (
  id              SERIAL PRIMARY KEY,
  year            INT          NOT NULL,
  month           TEXT         NOT NULL,
  meter_number    INT          NOT NULL,

  -- Идентификация счётчика (из meterConfig)
  meter_code      TEXT,         -- напр. "Сч.1"
  meter_name      TEXT,         -- полное название

  -- Потребление
  raw_consumption         NUMERIC,  -- показание из meter_readings (consumption)
  total_consumption       NUMERIC,  -- итоговое: для FCL = own + fricooler_share, для остальных = raw

  -- FCL-специфичные поля (NULL для не-FCL счётчиков)
  fcl                     TEXT,
  own_consumption         NUMERIC,  -- собственное потребление линии (после вычета дочерних)
  fricooler_meter_number  INT,      -- номер счётчика фрикуллера этой группы
  fricooler_consumption   NUMERIC,  -- полное потребление фрикуллера за месяц
  fricooler_share         NUMERIC,  -- доля фрикуллера для данной линии

  -- Производство (NULL для не-FCL)
  output_kg   NUMERIC,  -- выпуск линии в кг
  share_pct   NUMERIC,  -- доля линии в группе (%)

  -- Стоимость (NULL если тариф ещё не введён в энергоотчёт)
  cost_per_kwh  NUMERIC,  -- фактическая стоимость 1 кВтч (из energy_reports)
  cost_rub      NUMERIC,  -- стоимость потребления = total_consumption × cost_per_kwh

  -- Месячный агрегат (только для строки meter_number = 0, "EE_REPORT")
  -- Хранит все вычисленные показатели со страницы «Потребление ЭЭ» в виде JSON.
  -- Пример ключей: vazma_active_kwh, vazma_cost_per_kwh, ec_produced_kwh,
  --   sn_total_kwh, total_kwh, total_kwh_vazma_ec, total_cost, total_cost_per_kwh, ...
  extra_data    JSONB,

  calculated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (year, month, meter_number)
);

-- RLS: только авторизованные пользователи могут читать и писать
ALTER TABLE meter_line_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated"
  ON meter_line_summary FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert/update for authenticated"
  ON meter_line_summary FOR ALL
  USING (auth.role() = 'authenticated');
