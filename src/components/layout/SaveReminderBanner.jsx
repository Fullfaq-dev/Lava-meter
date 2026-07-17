import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Постоянное напоминание на вкладках с ручным вводом.
 */
export default function SaveReminderBanner({
  onSave,
  saving = false,
  disabled = false,
  isDirty = false,
}) {
  return (
    <div
      className={cn(
        "sticky z-40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border px-4 py-3 backdrop-blur-md",
        "top-2 md:top-[4.25rem]",
        isDirty
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-primary/25 bg-primary/10"
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <AlertTriangle
          className={cn(
            "w-5 h-5 shrink-0 mt-0.5",
            isDirty ? "text-amber-400" : "text-primary"
          )}
        />
        <div>
          <p
            className={cn(
              "text-sm font-bold tracking-wide uppercase",
              isDirty ? "text-amber-300" : "text-primary"
            )}
          >
            Не забудьте сохранить введённые данные
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isDirty
              ? "Есть несохранённые изменения — нажмите «Сохранить», иначе данные пропадут."
              : "После ввода нажмите «Сохранить», чтобы записать данные в базу."}
          </p>
        </div>
      </div>
      <Button
        onClick={onSave}
        disabled={disabled || saving}
        className={cn(
          "shrink-0 h-10 px-4",
          isDirty
            ? "bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40"
            : "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
        )}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Сохранить
      </Button>
    </div>
  );
}
