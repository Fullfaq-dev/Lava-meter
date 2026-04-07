import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { METERS } from "@/lib/meterConfig";
import { FRICOOLER_GROUPS } from "@/lib/productionConfig";
import { cn } from "@/lib/utils";

function fmt(n) {
  return (n ?? 0).toLocaleString("ru-RU");
}

export default function FclCalcTooltip({ lineCalcRow, readings, children }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const anchorRef = useRef(null);
  const timerRef = useRef(null);

  if (!lineCalcRow) return children;

  const fMeter = METERS.find(m => m.number === lineCalcRow.fricooler_meter_number);
  const fCode = fMeter?.code ?? `#${lineCalcRow.fricooler_meter_number}`;

  let subtractMeters = [];
  for (const group of FRICOOLER_GROUPS) {
    const line = group.lines.find(l => l.meter_number === lineCalcRow.meter_number);
    if (line?.subtract_meters) {
      subtractMeters = line.subtract_meters.map(num => {
        const meter = METERS.find(m => m.number === num);
        const reading = (readings || []).find(r => Number(r.meter_number) === Number(num));
        return meter ? { ...meter, consumption: reading?.consumption ?? null } : null;
      }).filter(Boolean);
    }
  }

  // Расход самого счётчика-ввода до вычитания
  const ownRawReading = (readings || []).find(r => Number(r.meter_number) === Number(lineCalcRow.meter_number));
  const ownRaw = ownRawReading?.consumption ?? null;

  const ownMeter = METERS.find(m => m.number === lineCalcRow.meter_number);
  const ownCode = ownMeter?.code ?? `#${lineCalcRow.meter_number}`;

  const TOOLTIP_WIDTH = 288;

  const show = () => {
    clearTimeout(timerRef.current);
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // позиционируем слева от элемента
      let x = rect.left - TOOLTIP_WIDTH - 10;
      // если уходит за левый край — показываем справа
      if (x < 8) x = rect.right + 10;
      // по вертикали — по центру якоря, но не уходим за края
      let y = rect.top + rect.height / 2;
      setPos({ x, y });
    }
    setVisible(true);
  };

  const hide = () => {
    timerRef.current = setTimeout(() => setVisible(false), 100);
  };

  const tooltip = visible && createPortal(
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        transform: "translateY(-50%)",
        width: TOOLTIP_WIDTH,
        zIndex: 9999,
      }}
      className="rounded-xl border border-white/15 bg-card/98 backdrop-blur-xl shadow-2xl shadow-black/60 p-3"
      onMouseEnter={() => clearTimeout(timerRef.current)}
      onMouseLeave={hide}
    >
      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2.5">
        Как считается «Итого» — {lineCalcRow.fcl}
      </p>

      <div className="space-y-2 text-xs">
        {/* Шаг 1 */}
        <div className="rounded-lg bg-white/5 p-2 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Шаг 1 — Собственное потребление
          </p>
          {subtractMeters.length > 0 ? (
            <>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Расход ({ownCode})</span>
                <span className="tabular-nums text-foreground">
                  {ownRaw != null ? fmt(ownRaw) : "—"} кВт·ч
                </span>
              </div>
              {subtractMeters.map(sm => (
                <div key={sm.number} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">− Расход ({sm.code})</span>
                  <span className="tabular-nums text-destructive/70">
                    {sm.consumption != null ? fmt(sm.consumption) : "—"} кВт·ч
                  </span>
                </div>
              ))}
              <div className="flex justify-between gap-2 border-t border-white/10 pt-1 font-semibold">
                <span className="text-foreground">= Чистый расход</span>
                <span className="tabular-nums text-foreground">{fmt(lineCalcRow.own_consumption)} кВт·ч</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Расход ({ownCode})</span>
              <span className="tabular-nums font-semibold text-foreground">{fmt(lineCalcRow.own_consumption)} кВт·ч</span>
            </div>
          )}
        </div>

        {/* Шаг 2 */}
        <div className="rounded-lg bg-white/5 p-2 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Шаг 2 — Доля фрикуллера ({fCode})
          </p>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Расход {fCode}</span>
            <span className="tabular-nums text-foreground">{fmt(lineCalcRow.fricooler_consumption)} кВт·ч</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Выпуск {lineCalcRow.fcl}</span>
            <span className="tabular-nums text-foreground">{fmt(lineCalcRow.output_kg)} кг</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Доля выпуска</span>
            <span className="tabular-nums text-foreground">{lineCalcRow.share_pct}%</span>
          </div>
          <div className="flex justify-between gap-2 border-t border-white/10 pt-1 font-semibold">
            <span className="text-foreground">= Доля фрикуллера</span>
            <span className="tabular-nums text-accent">+{fmt(lineCalcRow.fricooler_share)} кВт·ч</span>
          </div>
        </div>

        {/* Итог */}
        <div className="rounded-lg bg-accent/10 border border-accent/20 p-2">
          <div className="flex justify-between gap-2 items-center">
            <span className="text-foreground font-semibold">Итого</span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {fmt(lineCalcRow.own_consumption)} + {fmt(lineCalcRow.fricooler_share)}
            </span>
          </div>
          <div className="flex justify-between gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">чистый + доля фрик.</span>
            <span className="tabular-nums font-bold text-accent text-sm">{fmt(lineCalcRow.total_consumption)} кВт·ч</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {tooltip}
    </div>
  );
}