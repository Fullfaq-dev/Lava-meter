import React from "react";

export default function MeterTableHeader() {
  return (
    <thead>
      <tr className="border-b border-white/10">
        <th className="sticky left-0 z-20 bg-white/5 backdrop-blur-xl px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[40px]">
          №
        </th>
        <th className="sticky left-[40px] z-20 bg-white/5 backdrop-blur-xl px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[220px]">
          Счётчик
        </th>
        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">
          Тип
        </th>
        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">
          Коэф.
        </th>
        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[80px]">
          Нач. пок.
        </th>
        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[80px]">
          Тек. пок.
        </th>
        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[70px]">
          Разность
        </th>
        <th className="px-3 py-3 text-center text-xs font-semibold text-primary uppercase tracking-wider font-bold min-w-[90px]">
          Расход
        </th>
        <th className="px-3 py-3 text-center text-xs font-semibold text-accent uppercase tracking-wider font-bold min-w-[110px]">
          Итого
        </th>
        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[80px]">
          Норма
        </th>
      </tr>
    </thead>
  );
}