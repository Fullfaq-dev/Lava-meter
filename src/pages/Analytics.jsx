import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { METERS, MONTHS, MONTH_SHORT } from "@/lib/meterConfig";
import { listReadings, listProduction } from "@/lib/supabaseApi";
import { calcLineConsumption } from "@/lib/consumptionCalc";
import GlassCard from "../components/layout/GlassCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import MonthSelector from "../components/table/MonthSelector";

const CHART_COLORS = [
  "hsl(210, 100%, 60%)", "hsl(270, 80%, 65%)", "hsl(160, 70%, 50%)",
  "hsl(40, 90%, 60%)", "hsl(340, 75%, 55%)", "hsl(190, 80%, 50%)",
  "hsl(20, 85%, 55%)", "hsl(300, 70%, 60%)", "hsl(130, 65%, 45%)",
  "hsl(50, 90%, 55%)"
];

export default function Analytics() {
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const defaultMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const defaultYear = currentMonthIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[defaultMonthIndex]);

  const { data: allReadings, isLoading } = useQuery({
    queryKey: ['all-readings-sb', selectedYear],
    queryFn: () => listReadings({ year: selectedYear }),
    initialData: [],
  });

  const { data: monthReadings } = useQuery({
    queryKey: ['readings-sb', selectedYear, selectedMonth],
    queryFn: () => listReadings({ year: selectedYear, month: selectedMonth }),
    initialData: [],
  });

  const { data: production } = useQuery({
    queryKey: ['production-sb', selectedYear, selectedMonth],
    queryFn: () => listProduction({ year: selectedYear, month: selectedMonth }).then(rows => rows[0] || null),
  });

  const lineCalc = calcLineConsumption(monthReadings, production);

  const monthlyData = MONTHS.map((month, i) => {
    const total = allReadings
      .filter(r => r.month === month && r.consumption > 0)
      .reduce((sum, r) => sum + r.consumption, 0);
    return { month: MONTH_SHORT[i], total };
  }).filter(d => d.total > 0);

  const meterTotals = {};
  allReadings.forEach(r => {
    if (r.consumption > 0) {
      meterTotals[r.meter_number] = (meterTotals[r.meter_number] || 0) + r.consumption;
    }
  });

  const topConsumers = Object.entries(meterTotals)
    .map(([num, total]) => {
      const meter = METERS.find(m => m.number === parseInt(num));
      return { name: meter?.code || `#${num}`, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const byType = {};
  allReadings.forEach(r => {
    if (r.consumption > 0) {
      const meter = METERS.find(m => m.number === r.meter_number);
      const type = meter?.type || "Другое";
      byType[type] = (byType[type] || 0) + r.consumption;
    }
  });
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card/90 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-2xl">
        <p className="text-xs text-muted-foreground">{label || payload[0]?.name}</p>
        <p className="text-sm font-bold text-foreground">
          {payload[0]?.value?.toLocaleString('ru-RU')} кВт·ч
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Аналитика</h1>
          <p className="text-sm text-muted-foreground mt-1">Графики потребления электроэнергии</p>
        </div>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[120px] bg-white/5 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : allReadings.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <p className="text-muted-foreground">Нет данных за {selectedYear} год</p>
          <p className="text-xs text-muted-foreground mt-2">Внесите показания на странице "Ввод данных"</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Расход по месяцам</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" stroke="hsl(220, 10%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(220, 10%, 55%)" fontSize={11} tickFormatter={(v) => v.toLocaleString('ru-RU')} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="hsl(210, 100%, 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Топ потребители</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topConsumers} layout="vertical">
                  <XAxis type="number" stroke="hsl(220, 10%, 55%)" fontSize={11} tickFormatter={(v) => v.toLocaleString('ru-RU')} />
                  <YAxis type="category" dataKey="name" stroke="hsl(220, 10%, 55%)" fontSize={11} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {topConsumers.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-6 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-sm font-semibold text-foreground">Расчёт потребления FCL (с учётом фрикуллеров)</h3>
              <div className="w-full sm:w-auto">
                <MonthSelector
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onMonthChange={setSelectedMonth}
                  onYearChange={setSelectedYear}
                />
              </div>
            </div>
            {lineCalc.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нет данных</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground">
                      <th className="text-left py-2 pr-4">Линия</th>
                      <th className="text-right py-2 pr-4">Выпуск, кг</th>
                      <th className="text-right py-2 pr-4">Доля, %</th>
                      <th className="text-right py-2 pr-4">Своё потр.</th>
                      <th className="text-right py-2 pr-4">Фрикуллер всего</th>
                      <th className="text-right py-2 pr-4">Доля фрик.</th>
                      <th className="text-right py-2 font-bold text-primary">Итого кВт·ч</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineCalc.map((row) => (
                      <tr key={row.fcl} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 pr-4 font-semibold text-foreground">{row.fcl}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{row.output_kg.toLocaleString('ru-RU')}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">{row.share_pct}%</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{row.own_consumption.toLocaleString('ru-RU')}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">{row.fricooler_consumption.toLocaleString('ru-RU')}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-accent">{row.fricooler_share.toLocaleString('ru-RU')}</td>
                        <td className="py-2 text-right tabular-nums font-bold text-primary">{(row.own_consumption + row.fricooler_share).toLocaleString('ru-RU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">По типу учёта</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={50} outerRadius={90} strokeWidth={0}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}