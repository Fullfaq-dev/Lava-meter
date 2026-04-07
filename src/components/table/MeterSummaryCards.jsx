import React from "react";
import GlassCard from "../layout/GlassCard";
import { Zap, Activity, Gauge, TrendingUp } from "lucide-react";

export default function MeterSummaryCards({ readings, meters, lineCalc }) {
  // "Итого" для FCL-линий берём из lineCalc (с учётом фрикуллеров),
  // для остальных счётчиков — их собственный consumption
  const fclMeterNumbers = new Set((lineCalc || []).map(r => r.meter_number));
  const totalConsumption = readings.reduce((sum, r) => {
    // Исключаем счетчики фрикуллеров (2, 3, 13) из общего расхода,
    // так как их расход уже распределен по линиям FCL
    if ([2, 3, 12].includes(r.meter_number)) {
      return sum;
    }
    const fclRow = (lineCalc || []).find(lc => lc.meter_number === r.meter_number);
    return sum + (fclRow ? fclRow.total_consumption : (r.consumption || 0));
  }, 0);
  const activeMeters = readings.filter(r => r.current_reading !== null && r.current_reading !== undefined).length;
  const maxConsumption = readings.reduce((max, r) => {
    const fclRow = (lineCalc || []).find(lc => lc.meter_number === r.meter_number);
    const val = fclRow ? fclRow.total_consumption : (r.consumption || 0);
    return Math.max(max, val);
  }, 0);
  const maxMeter = readings.find(r => {
    const fclRow = (lineCalc || []).find(lc => lc.meter_number === r.meter_number);
    const val = fclRow ? fclRow.total_consumption : (r.consumption || 0);
    return val === maxConsumption;
  });
  const maxMeterInfo = maxMeter ? meters.find(m => m.number === maxMeter.meter_number) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Общий расход</p>
        <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
          {totalConsumption.toLocaleString('ru-RU')}
        </p>
        <p className="text-[10px] text-muted-foreground">кВт·ч</p>
        <p className="text-[9px] text-muted-foreground/70 mt-1 leading-tight">
          *Сч.2, Сч.3, Сч.13 не идут в подсчет напрямую
        </p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-chart-3/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-chart-3" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Активных</p>
        <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
          {activeMeters} <span className="text-sm font-normal text-muted-foreground">/ {meters.length}</span>
        </p>
        <p className="text-[10px] text-muted-foreground">счётчиков</p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-chart-4/20 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-chart-4" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Макс. расход</p>
        <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
          {maxConsumption.toLocaleString('ru-RU')}
        </p>
        <p className="text-[10px] text-muted-foreground">{maxMeterInfo?.code || '—'}</p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Среднее</p>
        <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
          {activeMeters > 0 ? Math.round(totalConsumption / activeMeters).toLocaleString('ru-RU') : '0'}
        </p>
        <p className="text-[10px] text-muted-foreground">кВт·ч / счётчик</p>
      </GlassCard>
    </div>
  );
}