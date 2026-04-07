import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MONTHS } from "@/lib/meterConfig";
import { supabase } from "@/api/supabaseClient";
import { listReadings, listProduction } from "@/lib/supabaseApi";
import { calcLineConsumption } from "@/lib/consumptionCalc";
import GlassCard from "../components/layout/GlassCard";
import MonthSelector from "../components/table/MonthSelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check, Zap, Factory, Flame, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportEnergyReportToExcel } from "@/lib/exportExcel";
import { useAuth } from "@/lib/AuthContext";

const fmt = (v) =>
  v != null && !isNaN(v) ? Number(v).toLocaleString("ru-RU", { maximumFractionDigits: 2 }) : "—";

const fmtRub = (v) =>
  v != null && !isNaN(v)
    ? Number(v).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽"
    : "—";

function FieldRow({ label, value, onChange, unit, placeholder = "0", disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <Input
          type="number"
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
          className="w-40 bg-white/5 border-white/10 text-right text-xs tabular-nums h-8"
          disabled={disabled}
        />
        {unit && <span className="text-xs text-muted-foreground w-12 shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function CalcRow({ label, value, unit, highlight }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1.5", highlight && "font-semibold")}>
      <span className={cn("text-xs flex-1", highlight ? "text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-xs tabular-nums shrink-0", highlight ? "text-primary" : "text-foreground")}>
        {value} {unit}
      </span>
    </div>
  );
}

export default function EnergyReportInput() {
  const { user } = useAuth();
  const canEdit = user?.can_edit;
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const defaultMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const defaultYear = currentMonthIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[defaultMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [form, setForm] = useState({});
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: readings } = useQuery({
    queryKey: ['readings-sb', selectedYear, selectedMonth],
    queryFn: () => listReadings({ year: selectedYear, month: selectedMonth }),
    initialData: [],
  });

  const { data: production } = useQuery({
    queryKey: ['production-sb', selectedYear, selectedMonth],
    queryFn: () => listProduction({ year: selectedYear, month: selectedMonth }).then(rows => rows[0] || null),
  });

  const lineCalc = calcLineConsumption(readings || [], production);

  const vedomostTotal = (readings || []).reduce((sum, r) => {
    if ([2, 3, 12].includes(r.meter_number)) {
      return sum;
    }
    const fclRow = (lineCalc || []).find(lc => lc.meter_number === r.meter_number);
    return sum + (fclRow ? fclRow.total_consumption : (r.consumption || 0));
  }, 0);

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    setLoading(true);
    supabase.from("energy_reports").select("*").eq("year", selectedYear).eq("month", selectedMonth)
      .then(({ data: rows, error }) => {
        if (error) throw error;
        if (rows.length > 0) {
          const row = rows[0];
          setExistingId(row.id);
          setForm({
            vazma_active_kwh: row.vazma_active_kwh,
            vazma_active_rosseti_rub: row.vazma_active_rosseti_rub,
            vazma_active_atom_rub: row.vazma_active_atom_rub,
            vazma_reactive_kwh: row.vazma_reactive_kwh,
            vazma_reactive_rosseti_rub: row.vazma_reactive_rosseti_rub,
            sn_zavod_kwh: row.sn_zavod_kwh,
            sn_energocenter_kwh: row.sn_energocenter_kwh,
            losses_cable_kwh: row.losses_cable_kwh,
            losses_transformer_kwh: row.losses_transformer_kwh,
            boiler_kwh: row.boiler_kwh,
            ec_produced_kwh: row.ec_produced_kwh,
            ec_gas_payment_rub: row.ec_gas_payment_rub,
            ec_gas_volume_m3: row.ec_gas_volume_m3,
          });
        } else {
          setExistingId(null);
          setForm({});
        }
      })
      .finally(() => setLoading(false));
  }, [selectedYear, selectedMonth]);

  const handleSave = async () => {
    setSaving(true);
    const payload = { year: selectedYear, month: selectedMonth, ...form };
    if (existingId) {
      await supabase.from("energy_reports").update(payload).eq("id", existingId);
    } else {
      const { data: created, error } = await supabase.from("energy_reports").insert(payload).select().single();
      if (error) throw error;
      setExistingId(created.id);
    }
    setSaving(false);
    toast.success(`Данные за ${selectedMonth} ${selectedYear} сохранены`);
  };

  // ── Расчёты ────────────────────────────────────────────────────
  const f = form;

  // Вязьма-2
  const vazma_cost_per_kwh =
    f.vazma_active_kwh > 0
      ? ((f.vazma_active_rosseti_rub ?? 0) + (f.vazma_active_atom_rub ?? 0)) / f.vazma_active_kwh
      : null;

  // Энергоцентр
  const ec_cost_per_kwh =
    f.ec_produced_kwh > 0 ? (f.ec_gas_payment_rub ?? 0) / f.ec_produced_kwh : null;
  const ec_gas_per_m3 =
    f.ec_gas_volume_m3 > 0 ? (f.ec_gas_payment_rub ?? 0) / f.ec_gas_volume_m3 : null;
  const ec_gas_per_1000m3 = ec_gas_per_m3 != null ? ec_gas_per_m3 * 1000 : null;

  // Итоги
  const sn_total =
    (f.sn_zavod_kwh ?? 0) +
    (f.sn_energocenter_kwh ?? 0) +
    (f.losses_cable_kwh ?? 0) +
    (f.losses_transformer_kwh ?? 0) +
    (f.boiler_kwh ?? 0);

  const total_kwh = vedomostTotal + sn_total;
  const total_kwh_vazma_ec = (f.vazma_active_kwh ?? 0) + (f.ec_produced_kwh ?? 0);
  const total_cost =
    (f.vazma_active_rosseti_rub ?? 0) +
    (f.vazma_active_atom_rub ?? 0) +
    (f.ec_gas_payment_rub ?? 0);
  const total_cost_per_kwh = total_kwh > 0 ? total_cost / total_kwh : null;

  const handleExport = async () => {
    try {
      await exportEnergyReportToExcel({
        monthName: selectedMonth,
        year: selectedYear,
        form,
        lineCalc: lineCalc || [],
        readings: readings || [],
        production,
        vazmaCostPerKwh: vazma_cost_per_kwh
      });
      toast.success("Файл успешно скачан");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Ошибка при скачивании файла");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Ведомость потребления ЭЭ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ввод данных АСКУЭ и расчётных показателей
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleExport}
            className="bg-green-600/20 hover:bg-green-600/30 text-green-500 border border-green-600/20 h-full py-4"
          >
            <Download className="w-5 h-5 mr-2" />
            Скачать Excel
          </Button>
          <GlassCard className="p-4 min-w-[280px]">
            <MonthSelector
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </GlassCard>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Блок 1: ПС Вязьма-2 */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Источник: п/ст. Вязьма-2</p>
                <p className="text-[11px] text-muted-foreground">СН1 (ВН)</p>
              </div>
            </div>

            <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-2">Активная энергия</p>
            <FieldRow label="Потребление от ПС Вязьма-2" value={f.vazma_active_kwh} onChange={set("vazma_active_kwh")} unit="кВтч" disabled={!canEdit} />
            <FieldRow label="Оплата Россети Центр–Смоленск-энерго" value={f.vazma_active_rosseti_rub} onChange={set("vazma_active_rosseti_rub")} unit="руб" disabled={!canEdit} />
            <FieldRow label="Оплата АтомЭнергоСбыт" value={f.vazma_active_atom_rub} onChange={set("vazma_active_atom_rub")} unit="руб" disabled={!canEdit} />

            <div className="mt-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
              <CalcRow label="Фактическая стоимость 1 кВтч" value={vazma_cost_per_kwh != null ? fmt(vazma_cost_per_kwh) + " ₽" : "—"} highlight />
            </div>

            <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mt-4 mb-2">Реактивная энергия</p>
            <FieldRow label="Потребление реактивное" value={f.vazma_reactive_kwh} onChange={set("vazma_reactive_kwh")} unit="кВтч" disabled={!canEdit} />
            <FieldRow label="Оплата Россети (реактивная)" value={f.vazma_reactive_rosseti_rub} onChange={set("vazma_reactive_rosseti_rub")} unit="руб" disabled={!canEdit} />
          </GlassCard>

          {/* Блок 2: Собственные нужды */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-chart-4/20 flex items-center justify-center shrink-0">
                <Factory className="w-4 h-4 text-chart-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Собственные нужды и потери</p>
                <p className="text-[11px] text-muted-foreground">кВтч</p>
              </div>
            </div>

            <FieldRow label="Собственные нужды завода (СН1)*" value={f.sn_zavod_kwh} onChange={set("sn_zavod_kwh")} unit="кВтч" disabled={!canEdit} />
            <FieldRow label="Собственные нужды энергоцентра" value={f.sn_energocenter_kwh} onChange={set("sn_energocenter_kwh")} unit="кВтч" disabled={!canEdit} />
            <FieldRow label="Потери в кабелях 10 кВ" value={f.losses_cable_kwh} onChange={set("losses_cable_kwh")} unit="кВтч" disabled={!canEdit} />
            <FieldRow label="Потери в трансформаторах" value={f.losses_transformer_kwh} onChange={set("losses_transformer_kwh")} unit="кВтч" disabled={!canEdit} />
            <FieldRow label="Котельная в зимний период" value={f.boiler_kwh} onChange={set("boiler_kwh")} unit="кВтч" disabled={!canEdit} />
          </GlassCard>

          {/* Блок 3: Энергоцентр */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-chart-3/20 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Источник: Энергоцентр</p>
                <p className="text-[11px] text-muted-foreground">СН1 — Активная энергия</p>
              </div>
            </div>

            <FieldRow label="Выработано электроэнергии" value={f.ec_produced_kwh} onChange={set("ec_produced_kwh")} unit="кВтч" disabled={!canEdit} />
            <FieldRow label="Оплата за газ" value={f.ec_gas_payment_rub} onChange={set("ec_gas_payment_rub")} unit="руб" disabled={!canEdit} />
            <FieldRow label="Объём потребл. газа" value={f.ec_gas_volume_m3} onChange={set("ec_gas_volume_m3")} unit="куб.м" disabled={!canEdit} />

            <div className="mt-3 rounded-lg bg-chart-3/5 border border-chart-3/20 px-3 py-2 space-y-0.5">
              <CalcRow label="Факт. стоимость 1 кВтч" value={ec_cost_per_kwh != null ? fmt(ec_cost_per_kwh) + " ₽" : "—"} highlight />
              <CalcRow label="Стоимость 1 м³ газа" value={ec_gas_per_m3 != null ? fmt(ec_gas_per_m3) + " ₽" : "—"} />
              <CalcRow label="Стоимость 1000 м³ газа" value={ec_gas_per_1000m3 != null ? fmt(ec_gas_per_1000m3) + " ₽" : "—"} />
            </div>
          </GlassCard>

          {/* Блок 4: Итоги */}
          <GlassCard className="p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Итоговые показатели</p>
            <div className="space-y-0">
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-xs text-muted-foreground">Общее потребление (Вязьма-2 + Энергоцентр)</span>
                <span className="text-xs font-bold text-primary tabular-nums">{fmt(total_kwh_vazma_ec)} кВтч</span>
              </div>
              <div className="flex flex-col py-2.5 border-b border-white/5 gap-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Общее потребление (Ведомость + СН и потери)</span>
                  <span className="text-xs font-bold text-primary tabular-nums">{fmt(total_kwh)} кВтч</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground/70 pl-2 border-l-2 border-white/10">в т.ч. общий расход из ведомости</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{fmt(vedomostTotal)} кВтч</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground/70 pl-2 border-l-2 border-white/10">в т.ч. собственные нужды и потери</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{fmt(sn_total)} кВтч</span>
                </div>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-xs text-muted-foreground">Общая стоимость ЭЭ и газа (с НДС 20%)</span>
                <span className="text-xs font-bold text-foreground tabular-nums">{fmtRub(total_cost)}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-xs text-muted-foreground">Фактическая стоимость 1 кВт·ч</span>
                <span className="text-xs font-bold text-accent tabular-nums">
                  {total_cost_per_kwh != null ? fmt(total_cost_per_kwh) + " ₽/кВтч" : "—"}
                </span>
              </div>
            </div>
          </GlassCard>

        </div>
      )}

      {!loading && canEdit && (
        <div className="flex justify-between items-center">
          {existingId && (
            <div className="flex items-center gap-1.5 text-xs text-chart-3">
              <Check className="w-3.5 h-3.5" />
              Данные за этот месяц уже сохранены
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Сохранить
          </Button>
        </div>
      )}
    </div>
  );
}