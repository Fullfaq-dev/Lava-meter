import { supabase } from "@/api/supabaseClient";
import { METERS } from "@/lib/meterConfig";
import { calcLineConsumption } from "@/lib/consumptionCalc";

export async function listReadings({ year, month, meter_number } = {}) {
  let query = supabase.from("meter_readings").select("*").order("meter_number", { ascending: true });
  if (year) query = query.eq("year", year);
  if (month) query = query.eq("month", month);
  if (meter_number) query = query.eq("meter_number", meter_number);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function upsertReadings(data) {
  const rows = Array.isArray(data) ? data : [data];
  const { data: result, error } = await supabase
    .from("meter_readings")
    .upsert(rows, { onConflict: "meter_number,year,month" })
    .select();

  if (error) throw error;
  return result || [];
}

export async function deleteReading(id) {
  const { data, error } = await supabase.from("meter_readings").delete().eq("id", id);
  if (error) throw error;
  return data;
}

// ── Production Output ─────────────────────────────────────────────

export async function listProduction({ year, month } = {}) {
  let query = supabase.from("production_output").select("*");
  if (year) query = query.eq("year", year);
  if (month) query = query.eq("month", month);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function upsertProduction(data) {
  const rows = Array.isArray(data) ? data : [data];
  const { data: result, error } = await supabase
    .from("production_output")
    .upsert(rows, { onConflict: "year,month" })
    .select();

  if (error) throw error;
  return result || [];
}

// ── Line Summary (computed FCL totals) ────────────────────────────

export async function listLineSummary({ year, month } = {}) {
  let query = supabase.from("meter_line_summary").select("*").order("meter_number", { ascending: true });
  if (year)  query = query.eq("year", year);
  if (month) query = query.eq("month", month);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Сохраняет (upsert) итоговый расчёт по ВСЕМ счётчикам в meter_line_summary.
 * Каждая строка rows уже содержит все нужные поля.
 * @param {Array} rows - подготовленный массив записей с year, month и полями счётчиков
 */
export async function upsertLineSummary(rows) {
  if (!rows || rows.length === 0) return [];

  const { data: result, error } = await supabase
    .from("meter_line_summary")
    .upsert(rows, { onConflict: "year,month,meter_number" })
    .select();

  if (error) throw error;
  return result || [];
}

// ── Full re-sync: все месяцы → meter_line_summary ─────────────────
/**
 * Забирает ВСЕ данные из БД (readings, production, energy_reports)
 * и полностью перезаписывает meter_line_summary по каждому месяцу.
 * Вызывается при открытии чата с ИИ.
 */
export async function syncAllMonthsToLineSummary() {
  // 1. Забираем все три источника параллельно
  const [readingsRes, productionRes, energyRes] = await Promise.all([
    supabase.from("meter_readings").select("*"),
    supabase.from("production_output").select("*"),
    supabase.from("energy_reports").select("*"),
  ]);

  if (readingsRes.error)   throw readingsRes.error;
  if (productionRes.error) throw productionRes.error;
  if (energyRes.error)     throw energyRes.error;

  const allReadings      = readingsRes.data   || [];
  const allProduction    = productionRes.data  || [];
  const allEnergyReports = energyRes.data      || [];

  // 2. Собираем все уникальные пары year+month
  const monthKeySet = new Set([
    ...allReadings.map((r) => `${r.year}__${r.month}`),
    ...allProduction.map((r) => `${r.year}__${r.month}`),
    ...allEnergyReports.map((r) => `${r.year}__${r.month}`),
  ]);

  const allRows = [];
  const now = new Date().toISOString();

  for (const key of monthKeySet) {
    const [yearStr, month] = key.split("__");
    const year = parseInt(yearStr, 10);

    const readings     = allReadings.filter((r) => r.year === year && r.month === month);
    const production   = allProduction.find((r)  => r.year === year && r.month === month) || null;
    const energyReport = allEnergyReports.find((r) => r.year === year && r.month === month) || null;

    // Стоимость 1 кВтч (Вязьма-2)
    const vazmaCostPerKwh =
      energyReport?.vazma_active_kwh > 0
        ? ((energyReport.vazma_active_rosseti_rub ?? 0) + (energyReport.vazma_active_atom_rub ?? 0)) /
          energyReport.vazma_active_kwh
        : null;

    // FCL-расчёт
    const lineCalc = calcLineConsumption(readings, production);

    // ── Строки по каждому счётчику ──────────────────────────────
    for (const meter of METERS) {
      const reading        = readings.find((r) => r.meter_number === meter.number);
      const lcRow          = lineCalc.find((r) => r.meter_number === meter.number);
      const rawConsumption = reading?.consumption ?? null;
      const totalConsumption = lcRow ? lcRow.total_consumption : rawConsumption;
      const costRub =
        totalConsumption != null && vazmaCostPerKwh != null
          ? Math.round(totalConsumption * vazmaCostPerKwh * 100) / 100
          : null;

      allRows.push({
        year,
        month,
        meter_number:           meter.number,
        meter_code:             meter.code,
        meter_name:             meter.name,
        raw_consumption:        rawConsumption,
        total_consumption:      totalConsumption,
        fcl:                    lcRow?.fcl                    ?? null,
        own_consumption:        lcRow?.own_consumption        ?? null,
        fricooler_meter_number: lcRow?.fricooler_meter_number ?? null,
        fricooler_consumption:  lcRow?.fricooler_consumption  ?? null,
        fricooler_share:        lcRow?.fricooler_share        ?? null,
        output_kg:              lcRow?.output_kg              ?? null,
        share_pct:              lcRow?.share_pct              ?? null,
        cost_per_kwh:           vazmaCostPerKwh               ?? null,
        cost_rub:               costRub,
        calculated_at:          now,
      });
    }

    // ── Строка EE_REPORT (meter_number = 0) ────────────────────
    if (energyReport) {
      const vedomostTotal = readings.reduce((sum, r) => {
        if ([2, 3, 12].includes(r.meter_number)) return sum;
        const fclRow = lineCalc.find((lc) => lc.meter_number === r.meter_number);
        return sum + (fclRow ? fclRow.total_consumption : (r.consumption || 0));
      }, 0);

      const sn_total =
        (energyReport.sn_zavod_kwh       ?? 0) +
        (energyReport.sn_energocenter_kwh ?? 0) +
        (energyReport.losses_cable_kwh    ?? 0) +
        (energyReport.losses_transformer_kwh ?? 0) +
        (energyReport.boiler_kwh          ?? 0);

      const total_kwh          = vedomostTotal + sn_total;
      const total_kwh_vazma_ec = (energyReport.vazma_active_kwh ?? 0) + (energyReport.ec_produced_kwh ?? 0);
      const total_cost         =
        (energyReport.vazma_active_rosseti_rub ?? 0) +
        (energyReport.vazma_active_atom_rub    ?? 0) +
        (energyReport.ec_gas_payment_rub       ?? 0);
      const total_cost_per_kwh = total_kwh > 0 ? total_cost / total_kwh : null;

      const ec_cost_per_kwh =
        energyReport.ec_produced_kwh > 0
          ? (energyReport.ec_gas_payment_rub ?? 0) / energyReport.ec_produced_kwh
          : null;
      const ec_gas_per_m3 =
        energyReport.ec_gas_volume_m3 > 0
          ? (energyReport.ec_gas_payment_rub ?? 0) / energyReport.ec_gas_volume_m3
          : null;

      allRows.push({
        year,
        month,
        meter_number: 0,
        meter_code:   "EE_REPORT",
        meter_name:   "Ведомость потребления ЭЭ — месячный итог",
        raw_consumption:   vedomostTotal,
        total_consumption: total_kwh,
        cost_per_kwh:      total_cost_per_kwh ?? null,
        cost_rub:          total_cost,
        extra_data: {
          vazma_active_kwh:          energyReport.vazma_active_kwh          ?? null,
          vazma_active_rosseti_rub:  energyReport.vazma_active_rosseti_rub  ?? null,
          vazma_active_atom_rub:     energyReport.vazma_active_atom_rub     ?? null,
          vazma_reactive_kwh:        energyReport.vazma_reactive_kwh        ?? null,
          vazma_reactive_rosseti_rub: energyReport.vazma_reactive_rosseti_rub ?? null,
          sn_zavod_kwh:              energyReport.sn_zavod_kwh              ?? null,
          sn_energocenter_kwh:       energyReport.sn_energocenter_kwh       ?? null,
          losses_cable_kwh:          energyReport.losses_cable_kwh          ?? null,
          losses_transformer_kwh:    energyReport.losses_transformer_kwh    ?? null,
          boiler_kwh:                energyReport.boiler_kwh                ?? null,
          ec_produced_kwh:           energyReport.ec_produced_kwh           ?? null,
          ec_gas_payment_rub:        energyReport.ec_gas_payment_rub        ?? null,
          ec_gas_volume_m3:          energyReport.ec_gas_volume_m3          ?? null,
          vazma_cost_per_kwh:        vazmaCostPerKwh                        ?? null,
          ec_cost_per_kwh:           ec_cost_per_kwh                        ?? null,
          ec_gas_per_m3:             ec_gas_per_m3                          ?? null,
          ec_gas_per_1000m3:         ec_gas_per_m3 != null ? ec_gas_per_m3 * 1000 : null,
          sn_total_kwh:              sn_total,
          total_kwh_vazma_ec,
          total_kwh,
          vedomost_total_kwh:        vedomostTotal,
          total_cost_rub:            total_cost,
          total_cost_per_kwh:        total_cost_per_kwh ?? null,
        },
        calculated_at: now,
      });
    }
  }

  if (allRows.length === 0) return [];

  // 3. Upsert батчами по 100 строк
  for (let i = 0; i < allRows.length; i += 100) {
    const chunk = allRows.slice(i, i + 100);
    const { error } = await supabase
      .from("meter_line_summary")
      .upsert(chunk, { onConflict: "year,month,meter_number" });
    if (error) throw error;
  }

  return allRows;
}
