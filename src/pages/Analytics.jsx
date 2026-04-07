import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { METERS, MONTHS, MONTH_SHORT } from "@/lib/meterConfig";
import { listReadings, listProduction } from "@/lib/supabaseApi";
import { calcLineConsumption } from "@/lib/consumptionCalc";
import GlassCard from "../components/layout/GlassCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import MonthSelector from "../components/table/MonthSelector";

// Счётчики фрикуллеров — исключаются из "общего расхода"
const FRICOOLER_METER_NUMS = new Set([2, 3, 12]);

const CHART_COLORS = [
  "hsl(210, 100%, 60%)", "hsl(270, 80%, 65%)", "hsl(160, 70%, 50%)",
  "hsl(40, 90%, 60%)",   "hsl(340, 75%, 55%)", "hsl(190, 80%, 50%)",
  "hsl(20, 85%, 55%)",   "hsl(300, 70%, 60%)", "hsl(130, 65%, 45%)",
  "hsl(50, 90%, 55%)",
];

/**
 * "Общий расход" — как в MeterSummaryCards:
 * - фрикуллеры (2,3,12) исключены (их расход уже внутри FCL)
 * - FCL-линии берут total_consumption (с долей фрикуллера)
 * - остальные — своё consumption
 */
function calcTotal(readings, lineCalcRows) {
  return readings.reduce((sum, r) => {
    if (FRICOOLER_METER_NUMS.has(r.meter_number)) return sum;
    const fclRow = lineCalcRows.find(lc => lc.meter_number === r.meter_number);
    return sum + (fclRow ? fclRow.total_consumption : (r.consumption || 0));
  }, 0);
}

/**
 * Расход конкретного счётчика:
 * FCL-линия → total_consumption (с долей фрикуллера), иначе → consumption
 */
function getMeterValue(meterNum, readings, lineCalcRows) {
  if (FRICOOLER_METER_NUMS.has(meterNum)) {
    const r = readings.find(x => x.meter_number === meterNum);
    return r?.consumption || 0;
  }
  const fclRow = lineCalcRows.find(lc => lc.meter_number === meterNum);
  if (fclRow) return fclRow.total_consumption;
  const r = readings.find(x => x.meter_number === meterNum);
  return r?.consumption || 0;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-2xl">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm font-bold text-foreground">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span>{entry.value?.toLocaleString("ru-RU")} кВт·ч</span>
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const defaultMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const defaultYear = currentMonthIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [period1, setPeriod1] = useState({ month: MONTHS[defaultMonthIndex], year: defaultYear });
  const [period2, setPeriod2] = useState({
    month: MONTHS[defaultMonthIndex === 0 ? 11 : defaultMonthIndex - 1],
    year: defaultMonthIndex === 0 ? defaultYear - 1 : defaultYear,
  });
  const [compareMode, setCompareMode] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState("all");

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: readingsY1 = [], isLoading: isLoadingR1 } = useQuery({
    queryKey: ["readings-year", period1.year],
    queryFn: () => listReadings({ year: period1.year }),
    initialData: [],
  });

  const { data: productionY1 = [], isLoading: isLoadingP1 } = useQuery({
    queryKey: ["production-year", period1.year],
    queryFn: () => listProduction({ year: period1.year }),
    initialData: [],
  });

  const { data: readingsY2 = [], isLoading: isLoadingR2 } = useQuery({
    queryKey: ["readings-year", period2.year],
    queryFn: () => listReadings({ year: period2.year }),
    initialData: [],
    enabled: compareMode && period1.year !== period2.year,
  });

  const { data: productionY2 = [], isLoading: isLoadingP2 } = useQuery({
    queryKey: ["production-year", period2.year],
    queryFn: () => listProduction({ year: period2.year }),
    initialData: [],
    enabled: compareMode && period1.year !== period2.year,
  });

  const isLoading =
    isLoadingR1 || isLoadingP1 ||
    (compareMode && period1.year !== period2.year && (isLoadingR2 || isLoadingP2));

  const effectiveReadingsY2 = compareMode
    ? (period1.year === period2.year ? readingsY1 : readingsY2)
    : [];
  const effectiveProductionY2 = compareMode
    ? (period1.year === period2.year ? productionY1 : productionY2)
    : [];

  // ── Period 1 — selected month ────────────────────────────────────────────
  const p1MonthReadings = readingsY1.filter(r => r.month === period1.month);
  const prodP1 = productionY1.find(p => p.month === period1.month) || null;
  const lineCalcP1 = calcLineConsumption(p1MonthReadings, prodP1);

  const p1Total = selectedMeter === "all"
    ? calcTotal(p1MonthReadings, lineCalcP1)
    : getMeterValue(parseInt(selectedMeter), p1MonthReadings, lineCalcP1);

  // ── Period 2 — selected month ────────────────────────────────────────────
  const p2MonthReadings = effectiveReadingsY2.filter(r => r.month === period2.month);
  const prodP2 = effectiveProductionY2.find(p => p.month === period2.month) || null;
  const lineCalcP2 = calcLineConsumption(p2MonthReadings, prodP2);

  const p2Total = compareMode
    ? (selectedMeter === "all"
        ? calcTotal(p2MonthReadings, lineCalcP2)
        : getMeterValue(parseInt(selectedMeter), p2MonthReadings, lineCalcP2))
    : 0;

  const diff = p1Total - p2Total;
  const diffPercent = p2Total > 0 ? Math.round((diff / p2Total) * 100) : 0;

  // ── Monthly trend ────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => MONTHS.map((month, i) => {
    const r1 = readingsY1.filter(r => r.month === month);
    const pr1 = productionY1.find(p => p.month === month) || null;
    const lc1 = calcLineConsumption(r1, pr1);
    const total1 = selectedMeter === "all"
      ? calcTotal(r1, lc1)
      : getMeterValue(parseInt(selectedMeter), r1, lc1);

    let total2 = 0;
    if (compareMode) {
      const r2 = effectiveReadingsY2.filter(r => r.month === month);
      const pr2 = effectiveProductionY2.find(p => p.month === month) || null;
      const lc2 = calcLineConsumption(r2, pr2);
      total2 = selectedMeter === "all"
        ? calcTotal(r2, lc2)
        : getMeterValue(parseInt(selectedMeter), r2, lc2);
    }

    return { month: MONTH_SHORT[i], total1, total2 };
  }), [readingsY1, productionY1, effectiveReadingsY2, effectiveProductionY2, compareMode, selectedMeter]);

  // ── Top consumers (только когда "все"; итог с учётом фрикуллеров) ────────
  const topConsumers = useMemo(() => {
    if (selectedMeter !== "all") return [];
    const totals = {};
    p1MonthReadings.forEach(r => {
      if (FRICOOLER_METER_NUMS.has(r.meter_number)) return;
      const fclRow = lineCalcP1.find(lc => lc.meter_number === r.meter_number);
      const val = fclRow ? fclRow.total_consumption : (r.consumption || 0);
      if (val > 0) totals[r.meter_number] = (totals[r.meter_number] || 0) + val;
    });
    return Object.entries(totals)
      .map(([num, total]) => {
        const meter = METERS.find(m => m.number === parseInt(num));
        return { name: meter?.code || `#${num}`, total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [p1MonthReadings, lineCalcP1, selectedMeter]);

  // ── Diff card ─────────────────────────────────────────────────────────────
  const diffColor = diff > 0 ? "text-red-400" : diff < 0 ? "text-green-400" : "text-foreground";
  const DiffIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;

  const selectedMeterInfo = selectedMeter !== "all"
    ? METERS.find(m => m.number === parseInt(selectedMeter))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Аналитика</h1>
        <p className="text-sm text-muted-foreground mt-1">Детальный анализ потребления электроэнергии</p>
      </div>

      {/* Filter bar */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          {/* Period 1 */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Период:</span>
            <MonthSelector
              selectedMonth={period1.month}
              selectedYear={period1.year}
              onMonthChange={m => setPeriod1(p => ({ ...p, month: m }))}
              onYearChange={y => setPeriod1(p => ({ ...p, year: y }))}
            />
          </div>

          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          {/* Compare toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setCompareMode(v => !v)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors shrink-0 ${compareMode ? "bg-primary" : "bg-white/15"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${compareMode ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm text-muted-foreground whitespace-nowrap">Сравнить с</span>
          </div>

          {/* Period 2 */}
          {compareMode && (
            <div className="flex items-center gap-2 shrink-0">
              <MonthSelector
                selectedMonth={period2.month}
                selectedYear={period2.year}
                onMonthChange={m => setPeriod2(p => ({ ...p, month: m }))}
                onYearChange={y => setPeriod2(p => ({ ...p, year: y }))}
              />
            </div>
          )}

          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          {/* Meter filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap shrink-0">Счётчик:</span>
            <Select value={selectedMeter} onValueChange={setSelectedMeter}>
              <SelectTrigger className="w-full sm:w-[260px] bg-white/5 border-white/10 h-9 text-sm">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все счётчики (общий расход)</SelectItem>
                {METERS.map(m => (
                  <SelectItem key={m.number} value={m.number.toString()}>
                    {m.code} — {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected meter info */}
        {selectedMeterInfo && (
          <p className="mt-2 text-xs text-muted-foreground pl-1">
            <span className="text-primary font-medium">{selectedMeterInfo.code}</span>
            {" "}— {selectedMeterInfo.name}
            {selectedMeterInfo.location && ` · ${selectedMeterInfo.location}`}
            {FRICOOLER_METER_NUMS.has(selectedMeterInfo.number) && (
              <span className="ml-2 text-yellow-400">фрикуллер — расход указан напрямую</span>
            )}
            {lineCalcP1.find(lc => lc.meter_number === selectedMeterInfo.number) && (
              <span className="ml-2 text-primary/70">FCL-линия — итог включает долю фрикуллера</span>
            )}
          </p>
        )}
      </GlassCard>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className={`grid gap-4 ${compareMode ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1"}`}>
            <GlassCard className="p-5">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {selectedMeter === "all" ? "Общий расход" : selectedMeterInfo?.code} — {period1.month} {period1.year}
              </p>
              <p className="text-3xl font-bold text-foreground tabular-nums">
                {p1Total.toLocaleString("ru-RU")}
                <span className="text-base font-normal text-muted-foreground ml-1">кВт·ч</span>
              </p>
            </GlassCard>

            {compareMode && (
              <>
                <GlassCard className="p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {selectedMeter === "all" ? "Общий расход" : selectedMeterInfo?.code} — {period2.month} {period2.year}
                  </p>
                  <p className="text-3xl font-bold text-foreground tabular-nums">
                    {p2Total.toLocaleString("ru-RU")}
                    <span className="text-base font-normal text-muted-foreground ml-1">кВт·ч</span>
                  </p>
                </GlassCard>

                <GlassCard className="p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Разница</p>
                  <div className={`flex items-center gap-2 text-3xl font-bold tabular-nums ${diffColor}`}>
                    <DiffIcon className="w-6 h-6 shrink-0" />
                    <span>{diff > 0 ? "+" : ""}{diff.toLocaleString("ru-RU")}</span>
                    <span className="text-base font-normal text-muted-foreground ml-1">кВт·ч</span>
                  </div>
                  {p2Total > 0 && (
                    <p className={`text-sm mt-1 font-medium ${diffColor}`}>
                      {diffPercent > 0 ? "+" : ""}{diffPercent}% к предыдущему периоду
                    </p>
                  )}
                </GlassCard>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly trend */}
            <GlassCard className="p-5 lg:col-span-2">
              <p className="text-sm font-semibold text-foreground mb-0.5">
                Динамика по месяцам
                {compareMode && period1.year !== period2.year
                  ? ` — ${period1.year} vs ${period2.year}`
                  : ` — ${period1.year}`}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {selectedMeter === "all"
                  ? "Общий расход (без фрикуллеров напрямую, FCL с долей)"
                  : `${selectedMeterInfo?.code} — ${selectedMeterInfo?.name}`}
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="hsl(220, 10%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="hsl(220, 10%, 55%)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      width={36}
                    />
                    <Tooltip content={props => <CustomTooltip {...props} />} />
                    {compareMode && period1.year !== period2.year && (
                      <Legend verticalAlign="top" height={32} />
                    )}
                    <Bar dataKey="total1" name={period1.year.toString()} fill="hsl(210, 100%, 60%)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    {compareMode && period1.year !== period2.year && (
                      <Bar dataKey="total2" name={period2.year.toString()} fill="hsl(270, 80%, 65%)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Top consumers — только при "все" */}
            {selectedMeter === "all" && topConsumers.length > 0 && (
              <GlassCard className="p-5 lg:col-span-2">
                <p className="text-sm font-semibold text-foreground mb-0.5">
                  Топ потребители — {period1.month} {period1.year}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Итоговый расход с учётом доли фрикуллеров; сами фрикуллеры не включены
                </p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topConsumers}
                      layout="vertical"
                      margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                    >
                      <XAxis
                        type="number"
                        stroke="hsl(220, 10%, 55%)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(220, 10%, 55%)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                      />
                      <Tooltip content={props => <CustomTooltip {...props} />} />
                      <Bar dataKey="total" name="Итого" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        {topConsumers.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            )}

            {/* FCL table — только при "все" */}
            {selectedMeter === "all" && lineCalcP1.length > 0 && (
              <GlassCard className="p-5 lg:col-span-2">
                <p className="text-sm font-semibold text-foreground mb-4">
                  Расчёт потребления FCL — {period1.month} {period1.year}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Линия</th>
                        <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Выпуск, кг</th>
                        <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Доля, %</th>
                        <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Своё потр.</th>
                        <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Фрикуллер всего</th>
                        <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Доля фрик.</th>
                        <th className="text-right py-2 text-primary font-semibold">Итого кВт·ч</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineCalcP1.map(row => (
                        <tr key={row.fcl} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2 pr-3 font-semibold text-foreground">{row.fcl}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.output_kg.toLocaleString("ru-RU")}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{row.share_pct}%</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.own_consumption.toLocaleString("ru-RU")}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{row.fricooler_consumption.toLocaleString("ru-RU")}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-accent">{row.fricooler_share.toLocaleString("ru-RU")}</td>
                          <td className="py-2 text-right tabular-nums font-bold text-primary">
                            {(row.own_consumption + row.fricooler_share).toLocaleString("ru-RU")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
