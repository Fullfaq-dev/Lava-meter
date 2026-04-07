import React, { useState, useEffect } from "react";
import { MONTHS } from "@/lib/meterConfig";
import { PRODUCTION_LINES } from "@/lib/productionConfig";
import { listProduction, upsertProduction } from "@/lib/supabaseApi";
import GlassCard from "../components/layout/GlassCard";
import MonthSelector from "../components/table/MonthSelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function ProductionInput() {
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const defaultMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const defaultYear = currentMonthIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[defaultMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [values, setValues] = useState({});
  const [hasExisting, setHasExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    listProduction({ year: selectedYear, month: selectedMonth })
      .then((rows) => {
        if (rows.length > 0) {
          const row = rows[0];
          setHasExisting(true);
          const vals = {};
          PRODUCTION_LINES.forEach(({ key }) => {
            if (row[key] !== null && row[key] !== undefined) vals[key] = row[key];
          });
          setValues(vals);
        } else {
          setHasExisting(false);
          setValues({});
        }
      })
      .finally(() => setLoading(false));
  }, [selectedYear, selectedMonth]);

  const handleSave = async () => {
    setSaving(true);
    const payload = { year: selectedYear, month: selectedMonth };
    PRODUCTION_LINES.forEach(({ key }) => {
      const v = values[key];
      payload[key] = v !== undefined && v !== "" ? parseFloat(v) : null;
    });
    await upsertProduction(payload);
    setHasExisting(true);
    setSaving(false);
    toast.success(`Выпуск за ${selectedMonth} ${selectedYear} сохранён в Supabase`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Выпуск продукции
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Объём выпуска по линиям за месяц (кг)
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTION_LINES.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0"
                    value={values[key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="bg-white/5 border-white/10 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    кг
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            {hasExisting && (
              <div className="flex items-center gap-1.5 text-xs text-chart-3">
                <Check className="w-3.5 h-3.5" />
                Данные за этот месяц уже внесены
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="ml-auto bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Сохранить
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}