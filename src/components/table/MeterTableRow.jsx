import React from "react";
import { cn } from "@/lib/utils";
import FclCalcTooltip from "./FclCalcTooltip.jsx";
import NormCalcTooltip from "./NormCalcTooltip.jsx";

export default function MeterTableRow({ meter, reading, index, lineCalcRow, readings, productionOutput }) {
  const hasReading = reading !== null;

  const displayTotal = lineCalcRow
    ? lineCalcRow.total_consumption
    : reading?.consumption ?? null;

  // Calculate norm (kWh/kg)
  let norm = null;
  let outputKg = null;
  
  if (displayTotal != null) {
    if (lineCalcRow && lineCalcRow.output_kg > 0) {
      norm = displayTotal / lineCalcRow.output_kg;
      outputKg = lineCalcRow.output_kg;
    } else if (productionOutput > 0) {
      norm = displayTotal / productionOutput;
      outputKg = productionOutput;
    }
  }

  return (
    <tr
      className={cn(
        "border-b border-white/5 transition-colors duration-150",
        index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent",
        "hover:bg-white/[0.05]"
      )}
    >
      {/* № */}
      <td className="sticky left-0 z-10 bg-card/80 backdrop-blur-xl px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
        {meter.number}
      </td>

      {/* Счётчик */}
      <td className="sticky left-[40px] z-10 bg-card/80 backdrop-blur-xl px-3 py-2.5 min-w-[220px] max-w-[260px]">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-foreground">{meter.code}</p>
          {lineCalcRow && (
            <span className="text-[10px] font-bold text-primary bg-primary/15 border border-primary/30 rounded px-1.5 py-0.5 leading-none">
              {lineCalcRow.fcl}
            </span>
          )}
          {meter.location && !lineCalcRow && (
            <span className="text-[10px] text-muted-foreground/60">{meter.location}</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground whitespace-normal leading-tight mt-0.5">
          {meter.name}
        </p>
      </td>

      {/* Тип */}
      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
        {meter.type}
      </td>

      {/* Коэф. */}
      <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground">
        {meter.coefficient}
      </td>

      {/* Нач. пок. */}
      <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground">
        {hasReading
          ? reading.initial_reading?.toLocaleString("ru-RU") ?? "—"
          : "—"}
      </td>

      {/* Тек. пок. */}
      <td className="px-3 py-2.5 text-center text-xs tabular-nums text-foreground">
        {hasReading
          ? reading.current_reading?.toLocaleString("ru-RU") ?? "—"
          : "—"}
      </td>

      {/* Разность */}
      <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground">
        {hasReading
          ? reading.difference?.toLocaleString("ru-RU") ?? "—"
          : "—"}
      </td>

      {/* Расход */}
      <td className="px-3 py-2.5 text-center text-xs tabular-nums font-semibold text-primary">
        {hasReading && reading.consumption != null
          ? reading.consumption.toLocaleString("ru-RU")
          : "—"}
      </td>

      {/* Итого */}
      <td className="px-3 py-2.5 text-center text-xs tabular-nums font-bold text-accent">
        {displayTotal != null ? (
          <FclCalcTooltip lineCalcRow={lineCalcRow} readings={readings}>
            <span className={cn(lineCalcRow ? "underline decoration-dotted cursor-help" : "")}>
              {displayTotal.toLocaleString("ru-RU")}
            </span>
          </FclCalcTooltip>
        ) : (
          "—"
        )}
      </td>

      {/* Норма */}
      <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground">
        {norm !== null ? (
          <NormCalcTooltip norm={norm} totalConsumption={displayTotal} outputKg={outputKg}>
            <span className="cursor-help underline decoration-dotted">
              {norm.toFixed(3)}
            </span>
          </NormCalcTooltip>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}