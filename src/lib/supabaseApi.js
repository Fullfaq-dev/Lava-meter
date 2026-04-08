import { supabase } from "@/api/supabaseClient";

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
