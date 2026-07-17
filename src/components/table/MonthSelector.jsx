import React from "react";
import { MONTHS, MONTH_SHORT } from "@/lib/meterConfig";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * @param {object} props
 * @param {(proceed: () => void) => void} [props.confirmChange] — если задан, вызывается перед сменой месяца/года
 */
export default function MonthSelector({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  confirmChange,
}) {
  const monthIndex = MONTHS.indexOf(selectedMonth);

  const run = (fn) => {
    if (confirmChange) confirmChange(fn);
    else fn();
  };

  const handlePrev = () => {
    run(() => {
      if (monthIndex === 0) {
        onMonthChange(MONTHS[11]);
        onYearChange(selectedYear - 1);
      } else {
        onMonthChange(MONTHS[monthIndex - 1]);
      }
    });
  };

  const handleNext = () => {
    run(() => {
      if (monthIndex === 11) {
        onMonthChange(MONTHS[0]);
        onYearChange(selectedYear + 1);
      } else {
        onMonthChange(MONTHS[monthIndex + 1]);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="text-muted-foreground hover:text-foreground h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">{selectedMonth}</span>
          <span className="text-lg text-muted-foreground">{selectedYear}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="text-muted-foreground hover:text-foreground h-8 w-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 justify-center">
        {MONTHS.map((month, i) => (
          <button
            key={month}
            type="button"
            onClick={() => run(() => onMonthChange(month))}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200",
              month === selectedMonth
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {MONTH_SHORT[i]}
          </button>
        ))}
      </div>
    </div>
  );
}
