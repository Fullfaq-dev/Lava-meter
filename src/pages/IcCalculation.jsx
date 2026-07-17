import React, { useState, useEffect, useMemo } from "react";
import { MONTHS } from "@/lib/meterConfig";
import { supabase } from "@/api/supabaseClient";
import { buildIcCalculation, getPrevMonth } from "@/lib/icCalc";
import {
  IC_EE_TRANSFORM_COEF,
  IC_WATER_SUPPLY_TARIFF,
  IC_WATER_DRAINAGE_TARIFF,
  IC_HEATING_TARIFF_PER_GCAL,
} from "@/lib/icConfig";
import { exportIcReportWord } from "@/lib/exportWordIc";
import GlassCard from "../components/layout/GlassCard";
import MonthSelector from "../components/table/MonthSelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check, Calculator, Download, Zap, Droplets, Flame, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

const fmt = (v, digits = 2) =>
  v != null && !isNaN(v)
    ? Number(v).toLocaleString("ru-RU", { maximumFractionDigits: digits })
    : "—";

const fmtRub = (v) =>
  v != null && !isNaN(v)
    ? Number(v).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽"
    : "—";

function FieldRow({ label, value, onChange, unit, placeholder = "0", disabled = false, integer = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <Input
          type="number"
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
              return;
            }
            onChange(integer ? parseInt(raw, 10) : parseFloat(raw));
          }}
          className="w-40 bg-white/5 border-white/10 text-right text-xs tabular-nums h-8"
          disabled={disabled}
        />
        {unit && <span className="text-xs text-muted-foreground w-14 shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function CalcRow({ label, value, unit, highlight }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1.5", highlight && "font-semibold")}>
      <span className={cn("text-xs flex-1", highlight ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span className={cn("text-xs tabular-nums shrink-0", highlight ? "text-primary" : "text-foreground")}>
        {value} {unit}
      </span>
    </div>
  );
}

export default function IcCalculation() {
  const { user } = useAuth();
  const canEdit = user?.can_edit;

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const defaultMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const defaultYear = currentMonthIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[defaultMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [form, setForm] = useState({});
  const [prevForm, setPrevForm] = useState(null);
  const [energyReport, setEnergyReport] = useState(null);
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const prevMonth = getPrevMonth(selectedYear, selectedMonth);
  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  const calc = useMemo(
    () => buildIcCalculation({ form, prevForm, energyReport }),
    [form, prevForm, energyReport]
  );

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        const [icRes, prevRes, eeRes] = await Promise.all([
          supabase
            .from("ic_readings")
            .select("*")
            .eq("year", selectedYear)
            .eq("month", selectedMonth)
            .maybeSingle(),
          prevMonth
            ? supabase
                .from("ic_readings")
                .select("*")
                .eq("year", prevMonth.year)
                .eq("month", prevMonth.month)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from("energy_reports")
            .select("*")
            .eq("year", selectedYear)
            .eq("month", selectedMonth)
            .maybeSingle(),
        ]);

        if (icRes.error) throw icRes.error;
        if (prevRes.error) throw prevRes.error;
        if (eeRes.error) throw eeRes.error;

        if (icRes.data) {
          setExistingId(icRes.data.id);
          const water = icRes.data.water_supply_reading ?? icRes.data.water_drainage_reading;
          setForm({
            ee_reading: icRes.data.ee_reading,
            water_reading: water,
            heating_reading: icRes.data.heating_reading,
            residents_count: icRes.data.residents_count,
          });
        } else {
          setExistingId(null);
          setForm({});
        }

        setPrevForm(prevRes.data || null);
        setEnergyReport(eeRes.data || null);
      } catch (err) {
        console.error("[IcCalculation] load error:", err);
        toast.error("Ошибка загрузки данных");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedYear, selectedMonth, prevMonth?.year, prevMonth?.month]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const water = form.water_reading ?? null;
      const payload = {
        year: selectedYear,
        month: selectedMonth,
        ee_reading: form.ee_reading ?? null,
        water_supply_reading: water,
        water_drainage_reading: water,
        heating_reading: form.heating_reading ?? null,
        residents_count: form.residents_count ?? null,
      };

      if (existingId) {
        const { error } = await supabase.from("ic_readings").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("ic_readings").insert(payload).select().single();
        if (error) throw error;
        setExistingId(data.id);
      }

      toast.success(`Данные за ${selectedMonth} ${selectedYear} сохранены`);
    } catch (err) {
      console.error("[IcCalculation] save error:", err);
      toast.error("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportIcReportWord({
        monthName: selectedMonth,
        year: selectedYear,
        form,
        prevForm,
        calc,
      });
      toast.success("Word-отчёт скачан");
    } catch (err) {
      console.error("[IcCalculation] export error:", err);
      toast.error("Ошибка при формировании Word");
    } finally {
      setExporting(false);
    }
  };

  const prevLabel = prevMonth ? `${prevMonth.month} ${prevMonth.year}` : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Расчёт ИЦ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Показания коммунальных счётчиков и формирование Word-документов
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleExport}
            disabled={exporting || loading}
            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/20 h-full py-4"
          >
            {exporting ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            Скачать Word
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
          {/* Общие данные */}
          <GlassCard className="p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Исправительный центр</p>
                <p className="text-[11px] text-muted-foreground">Общие показатели за {selectedMonth} {selectedYear}</p>
              </div>
            </div>
            <FieldRow
              label="Количество проживающих"
              value={form.residents_count}
              onChange={set("residents_count")}
              unit="чел."
              integer
              disabled={!canEdit}
            />
          </GlassCard>

          {/* Электроэнергия */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Электроэнергия</p>
                <p className="text-[11px] text-muted-foreground">Показание счётчика, кВт·ч</p>
              </div>
            </div>

            <FieldRow
              label={`Показание за ${prevLabel}`}
              value={prevForm?.ee_reading}
              onChange={() => {}}
              unit="кВт·ч"
              disabled
            />
            <FieldRow
              label="Показание за текущий месяц"
              value={form.ee_reading}
              onChange={set("ee_reading")}
              unit="кВт·ч"
              disabled={!canEdit}
            />

            <div className="mt-3 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 space-y-0.5">
              <CalcRow label="Потребление за месяц" value={fmt(calc.eeConsumption, 0)} unit="кВт·ч" />
              <CalcRow label={`Коэффициент ×${IC_EE_TRANSFORM_COEF}`} value={fmt(IC_EE_TRANSFORM_COEF, 0)} unit="" />
              <CalcRow
                label="Тариф (из Потребления ЭЭ)"
                value={calc.eeTariff != null ? fmt(calc.eeTariff, 4) : "—"}
                unit="₽/кВт·ч"
              />
              <CalcRow label="Сумма ИЦ" value={fmtRub(calc.eeAmount)} unit="" highlight />
            </div>
          </GlassCard>

          {/* Вода */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-chart-3/20 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Вода</p>
                <p className="text-[11px] text-muted-foreground">Один счётчик, м³ (подача и отвод)</p>
              </div>
            </div>

            <FieldRow label={`Показание за ${prevLabel}`} value={prevForm?.water_supply_reading ?? prevForm?.water_drainage_reading} onChange={() => {}} unit="м³" disabled />
            <FieldRow label="Показание за текущий месяц" value={form.water_reading} onChange={set("water_reading")} unit="м³" disabled={!canEdit} />

            <div className="mt-3 rounded-lg bg-chart-3/5 border border-chart-3/20 px-3 py-2 space-y-0.5">
              <CalcRow label="Объём за месяц" value={fmt(calc.waterSupplyConsumption, 0)} unit="м³" />
              <CalcRow label="Тариф водоснабжения" value={fmt(IC_WATER_SUPPLY_TARIFF, 2)} unit="₽/м³" />
              <CalcRow label="Сумма водоснабжения" value={fmtRub(calc.waterSupplyAmount)} unit="" />
              <CalcRow label="Объём водоотведения" value={fmt(calc.waterDrainageConsumption, 0)} unit="м³" />
              <CalcRow label="Тариф водоотведения" value={fmt(IC_WATER_DRAINAGE_TARIFF, 2)} unit="₽/м³" />
              <CalcRow label="Сумма водоотведения" value={fmtRub(calc.waterDrainageAmount)} unit="" />
              <CalcRow label="Итого по воде" value={fmtRub(calc.waterTotalAmount)} unit="" highlight />
            </div>
          </GlassCard>

          {/* Отопление */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-chart-4/20 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-chart-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Отопление</p>
                <p className="text-[11px] text-muted-foreground">Показание счётчика, Гкал</p>
              </div>
            </div>

            <FieldRow label={`Показание за ${prevLabel}`} value={prevForm?.heating_reading} onChange={() => {}} unit="Гкал" disabled />
            <FieldRow label="Показание за текущий месяц" value={form.heating_reading} onChange={set("heating_reading")} unit="Гкал" disabled={!canEdit} />

            <div className="mt-3 rounded-lg bg-chart-4/5 border border-chart-4/20 px-3 py-2 space-y-0.5">
              <CalcRow label="Потребление за месяц" value={fmt(calc.heatingConsumption, 4)} unit="Гкал" />
              <CalcRow label="Тариф" value={fmt(IC_HEATING_TARIFF_PER_GCAL, 2)} unit="₽/Гкал" />
              <CalcRow label="Сумма ИЦ" value={fmtRub(calc.heatingAmount)} unit="" highlight />
            </div>
          </GlassCard>

          {/* Итог */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <Calculator className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Итого</p>
                <p className="text-[11px] text-muted-foreground">{selectedMonth} {selectedYear}</p>
              </div>
            </div>

            <div className="space-y-0">
              <CalcRow label="ИЦ — электроэнергия" value={fmtRub(calc.eeAmount)} unit="" />
              <CalcRow label="ИЦ — вода" value={fmtRub(calc.waterTotalAmount)} unit="" />
              <CalcRow label="ИЦ — отопление" value={fmtRub(calc.heatingAmount)} unit="" />
              <div className="border-t border-white/10 mt-2 pt-2">
                <CalcRow label="Всего ИЦ" value={fmtRub(calc.totalAmount)} unit="" highlight />
              </div>
            </div>

            {!energyReport && (
              <p className="text-[10px] text-amber-400/80 mt-4 leading-relaxed">
                Для расчёта тарифа ЭЭ заполните вкладку «Потребление ЭЭ» за этот месяц.
              </p>
            )}
            {!prevForm && (
              <p className="text-[10px] text-amber-400/80 mt-2 leading-relaxed">
                Нет показаний за прошлый месяц — потребление за месяц не рассчитается.
              </p>
            )}
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
