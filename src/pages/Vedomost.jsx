import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { METERS, MONTHS } from "@/lib/meterConfig";
import { listReadings, listProduction } from "@/lib/supabaseApi";
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

  const { data: readings, isLoading } = useQuery({
    queryKey: ['readings-sb', selectedYear, selectedMonth],
    queryFn: () => listReadings({ year: selectedYear, month: selectedMonth }),
    initialData: [],
  });

  const { data: production } = useQuery({
    queryKey: ['production-sb', selectedYear, selectedMonth],
    queryFn: () => listProduction({ year: selectedYear, month: selectedMonth }).then(rows => rows[0] || null),
  });

  const lineCalc = calcLineConsumption(readings, production);

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