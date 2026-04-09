import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { METERS, MONTHS } from "@/lib/meterConfig";
import { listReadings, listProduction, upsertLineSummary } from "@/lib/supabaseApi";
import { supabase } from "@/api/supabaseClient";
import { calcLineConsumption } from "@/lib/consumptionCalc";
import { FRICOOLER_GROUPS } from "@/lib/productionConfig";
import GlassCard from "../components/layout/GlassCard";
import MeterTableHeader from "../components/table/MeterTableHeader";
import MeterTableRow from "../components/table/MeterTableRow.jsx";
import MonthSelector from "../components/table/MonthSelector";
import MeterSummaryCards from "../components/table/MeterSummaryCards";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FCL_METER_NUMBERS = new Set(
  FRICOOLER_GROUPS.flatMap(g => g.lines.map(l => l.meter_number))
);
const FRICOOLER_METER_NUMBERS = new Set(
  FRICOOLER_GROUPS.map(g => g.fricooler_meter_number)
);

const FILTER_OPTIONS = [
  { value: "all",       label: "Все" },
  { value: "fcl",       label: "FCL-линии" },
  { value: "fricooler", label: "Фрикуллеры" },
  { value: "other",     label: "Остальные" },
];

export default function Vedomost() {
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const defaultMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const defaultYear = currentMonthIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[defaultMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [filter, setFilter] = useState("all");

  const { data: readings, isLoading: readingsLoading } = useQuery({
    queryKey: ['readings-sb', selectedYear, selectedMonth],
    queryFn: () => listReadings({ year: selectedYear, month: selectedMonth }),
    initialData: [],
  });

  const { data: production, isLoading: productionLoading } = useQuery({
    queryKey: ['production-sb', selectedYear, selectedMonth],
    queryFn: () => listProduction({ year: selectedYear, month: selectedMonth }).then(rows => rows[0] || null),
  });

  const { data: energyReport, isLoading: energyLoading } = useQuery({
    queryKey: ['energy-report-sb', selectedYear, selectedMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from("energy_reports")
        .select("vazma_active_kwh,vazma_active_rosseti_rub,vazma_active_atom_rub")
        .eq("year", selectedYear)
        .eq("month", selectedMonth)
        .maybeSingle();
      return data || null;
    },
  });

  // Фактическая стоимость 1 кВт·ч (Вязьма-2), совпадает с расчётом в EnergyReportInput
  const er = /** @type {any} */ (energyReport);
  const vazmaCostPerKwh =
    er?.vazma_active_kwh > 0
      ? ((er.vazma_active_rosseti_rub ?? 0) + (er.vazma_active_atom_rub ?? 0)) /
        er.vazma_active_kwh
      : null;

  const isLoading = readingsLoading || productionLoading;

  const lineCalc = calcLineConsumption(readings, production);

  // Авто-сохранение итогов по ВСЕМ счётчикам в БД после загрузки данных.
  // Ключ включает хэш показаний и тариф — срабатывает при любом изменении данных.
  const lastSavedKey = useRef("");

  useEffect(() => {
    if (readingsLoading || productionLoading || energyLoading) return;
    if (!readings || readings.length === 0) return;

    // Content-aware ключ: включает хэш данных, чтобы срабатывать при изменениях
    const readingsHash = readings.reduce(
      (s, r) => s + r.meter_number * 1000 + (r.consumption || 0),
      0
    );
    const productionHash = production
      ? Object.values(production).reduce((s, v) => s + (Number(v) || 0), 0)
      : 0;
    const key = `${selectedYear}__${selectedMonth}__r${readingsHash}__p${productionHash}__v${vazmaCostPerKwh ?? 0}`;

    if (lastSavedKey.current === key) return;
    lastSavedKey.current = key;

    const now = new Date().toISOString();
    const rows = METERS.map((meter) => {
      const reading          = readings.find((r) => r.meter_number === meter.number);
      const lcRow            = lineCalc.find((r) => r.meter_number === meter.number);
      const rawConsumption   = reading?.consumption ?? null;
      const totalConsumption = lcRow ? lcRow.total_consumption : rawConsumption;
      const costRub =
        totalConsumption != null && vazmaCostPerKwh != null
          ? Math.round(totalConsumption * vazmaCostPerKwh * 100) / 100
          : null;

      return {
        year:                   selectedYear,
        month:                  selectedMonth,
        meter_number:           meter.number,
        meter_code:             meter.code,
        meter_name:             meter.name,
        raw_consumption:        rawConsumption,
        total_consumption:      totalConsumption,
        // FCL-specific (null для не-FCL счётчиков)
        fcl:                    lcRow?.fcl                    ?? null,
        own_consumption:        lcRow?.own_consumption        ?? null,
        fricooler_meter_number: lcRow?.fricooler_meter_number ?? null,
        fricooler_consumption:  lcRow?.fricooler_consumption  ?? null,
        fricooler_share:        lcRow?.fricooler_share        ?? null,
        output_kg:              lcRow?.output_kg              ?? null,
        share_pct:              lcRow?.share_pct              ?? null,
        // Стоимость ЭЭ (null если тариф не введён)
        cost_per_kwh:           vazmaCostPerKwh               ?? null,
        cost_rub:               costRub,
        calculated_at:          now,
      };
    });

    upsertLineSummary(rows).catch((err) => {
      console.error("[meter_line_summary] Ошибка сохранения расчёта:", err);
    });
  }, [readingsLoading, productionLoading, energyLoading, selectedYear, selectedMonth, readings, production, lineCalc, vazmaCostPerKwh]);

  const getReadingForMeter = (meterNumber) =>
    readings.find(r => r.meter_number === meterNumber) || null;

  const getLineCalcRow = (meterNumber) =>
    lineCalc.find(r => r.meter_number === meterNumber) || null;

  const getProductionForMeter = (meterNumber) => {
    if (!production) return null;
    // FCL lines are handled by lineCalcRow, but we also need to handle other meters
    // that have production output (peremotka, granulyaciya)
    const meter = METERS.find(m => m.number === meterNumber);
    if (!meter) return null;

    // Map meter numbers to production keys
    const productionMap = {
      7: "peremotka", // Сч.8 Участок перемотки
      11: "granulyaciya3", // Сч.12 Гранулятор №3
      20: "granulyaciya1", // Сч.21 Гранулятор №1
      21: "granulyaciya2", // Сч.22 Гранулятор №2
    };

    const key = productionMap[meterNumber];
    return key ? production[key] : null;
  };

  const filteredMeters = METERS.filter(m => {
    if (filter === "fcl")       return FCL_METER_NUMBERS.has(m.number);
    if (filter === "fricooler") return FRICOOLER_METER_NUMBERS.has(m.number);
    if (filter === "other")     return !FCL_METER_NUMBERS.has(m.number) && !FRICOOLER_METER_NUMBERS.has(m.number);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Ведомость учёта
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ООО "ЛАВА" — внутренний учёт потребления электроэнергии
          </p>
        </div>
        <GlassCard className="p-4 min-w-[280px]">
          <MonthSelector
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        </GlassCard>
      </div>

      <MeterSummaryCards readings={readings} meters={METERS} lineCalc={lineCalc} />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              filter === opt.value
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <table className="w-full">
              <MeterTableHeader />
              <tbody>
                {filteredMeters.map((meter, index) => (
                  <MeterTableRow
                    key={meter.number}
                    meter={meter}
                    reading={getReadingForMeter(meter.number)}
                    index={index}
                    lineCalcRow={getLineCalcRow(meter.number)}
                    readings={readings}
                    productionOutput={getProductionForMeter(meter.number)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
  );
}