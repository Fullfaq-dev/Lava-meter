import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

function fmt(n) {
  return (n ?? 0).toLocaleString("ru-RU");
}

export default function NormCalcTooltip({ norm, totalConsumption, outputKg, children }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const anchorRef = useRef(null);
  const timerRef = useRef(null);

  if (norm === null) return children;

  const TOOLTIP_WIDTH = 240;

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
        Расчет нормы потребления
      </p>

      <div className="space-y-2 text-xs">
        <div className="rounded-lg bg-white/5 p-2 space-y-1">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Итоговое потребление</span>
            <span className="tabular-nums text-foreground">{fmt(totalConsumption)} кВт·ч</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Выпуск продукции</span>
            <span className="tabular-nums text-foreground">{fmt(outputKg)} кг</span>
          </div>
        </div>

        <div className="rounded-lg bg-accent/10 border border-accent/20 p-2">
          <div className="flex justify-between gap-2 items-center">
            <span className="text-foreground font-semibold">Норма</span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {fmt(totalConsumption)} / {fmt(outputKg)}
            </span>
          </div>
          <div className="flex justify-between gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">кВт·ч / кг</span>
            <span className="tabular-nums font-bold text-accent text-sm">{norm.toFixed(3)}</span>
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
