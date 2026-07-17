import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MONTHS } from "@/lib/meterConfig";
import { PRODUCTION_LINES, brakKey } from "@/lib/productionConfig";
import { listProduction, upsertProduction } from "@/lib/supabaseApi";
import { isFormDirty, snapshotForm } from "@/lib/formDirty";
import { useUnsavedGuard } from "@/lib/UnsavedChangesContext";
import GlassCard from "../components/layout/GlassCard";
import MonthSelector from "../components/table/MonthSelector";
import SaveReminderBanner from "../components/layout/SaveReminderBanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

const FIELD_KEYS = PRODUCTION_LINES.flatMap(({ key }) => [key, brakKey(key)]);

function KgInput({ label, value, onChange, disabled, muted }) {
  return (
    <div className="space-y-1 flex-1 min-w-0">
      <label className={`text-[10px] font-medium ${muted ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
        {label}
      </label>
      <div className="relative">
        <Input
          type="number"
          placeholder="0"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/5 border-white/10 pr-10 h-9 text-sm"
          disabled={disabled}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          кг
        </span>
      </div>
    </div>
  );
}

function normalizeValues(values) {
  const out = {};
  FIELD_KEYS.forEach((key) => {
    const v = values[key];
    out[key] = v !== undefined && v !== "" && v != null ? parseFloat(v) : null;
    if (out[key] != null && Number.isNaN(out[key])) out[key] = null;
  });
  return out;
}

export default function ProductionInput() {
  const { user } = useAuth();
  const canEdit = user?.can_edit;
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const defaultMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const defaultYear = currentMonthIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[defaultMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [values, setValues] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState({});
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
            const bk = brakKey(key);
            if (row[bk] !== null && row[bk] !== undefined) vals[bk] = row[bk];
          });
          setValues(vals);
          setSavedSnapshot(snapshotForm(normalizeValues(vals), FIELD_KEYS));
        } else {
          setHasExisting(false);
          setValues({});
          setSavedSnapshot(snapshotForm({}, FIELD_KEYS));
        }
      })
      .finally(() => setLoading(false));
  }, [selectedYear, selectedMonth]);

  const setField = (key) => (raw) =>
    setValues((prev) => ({ ...prev, [key]: raw }));

  const isDirty = useMemo(
    () =>
      !loading &&
      canEdit &&
      isFormDirty(normalizeValues(values), savedSnapshot, FIELD_KEYS),
    [loading, canEdit, values, savedSnapshot]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    const normalized = normalizeValues(values);
    const payload = { year: selectedYear, month: selectedMonth, ...normalized };
    try {
      await upsertProduction(payload);
      setHasExisting(true);
      setSavedSnapshot(snapshotForm(normalized, FIELD_KEYS));
      setValues(
        Object.fromEntries(
          Object.entries(normalized).filter(([, v]) => v != null)
        )
      );
      toast.success(`Выпуск за ${selectedMonth} ${selectedYear} сохранён в Supabase`);
    } catch (err) {
      console.error("[ProductionInput] save error:", err);
      toast.error("Ошибка сохранения. Проверьте, что миграция брака выполнена в Supabase.");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [values, selectedYear, selectedMonth]);

  const { requestLeave } = useUnsavedGuard({
    isDirty,
    onSave: handleSave,
    saving,
    enabled: !!canEdit,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Выпуск продукции
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Объём выпуска и брак по линиям за месяц (кг)
          </p>
        </div>
        <GlassCard className="p-4 min-w-[280px]">
          <MonthSelector
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            confirmChange={requestLeave}
          />
        </GlassCard>
      </div>

      {canEdit && (
        <SaveReminderBanner
          onSave={handleSave}
          saving={saving}
          disabled={loading}
          isDirty={isDirty}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRODUCTION_LINES.map(({ key, label }) => {
              const bk = brakKey(key);
              const total = parseFloat(values[key]) || 0;
              const defect = parseFloat(values[bk]) || 0;
              const good = total - defect;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2"
                >
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <div className="flex gap-2">
                    <KgInput
                      label="Всего (в т.ч. брак)"
                      value={values[key]}
                      onChange={setField(key)}
                      disabled={!canEdit}
                    />
                    <KgInput
                      label="Брак"
                      value={values[bk]}
                      onChange={setField(bk)}
                      disabled={!canEdit}
                      muted
                    />
                  </div>
                  {(values[key] != null && values[key] !== "") ||
                  (values[bk] != null && values[bk] !== "") ? (
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      Товар:{" "}
                      <span className="text-foreground">
                        {good.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} кг
                      </span>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            {hasExisting && (
              <div className="flex items-center gap-1.5 text-xs text-chart-3">
                <Check className="w-3.5 h-3.5" />
                Данные за этот месяц уже внесены
              </div>
            )}
            {canEdit && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="ml-auto bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Сохранить
              </Button>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
