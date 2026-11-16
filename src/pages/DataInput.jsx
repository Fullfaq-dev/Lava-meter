import React, { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { METERS, MONTHS } from "@/lib/meterConfig";
import { listReadings, upsertReadings, deleteReading } from "@/lib/supabaseApi";
import { supabase } from "@/api/supabaseClient";
import { useUnsavedGuard } from "@/lib/UnsavedChangesContext";
import GlassCard from "../components/layout/GlassCard";
import MonthSelector from "../components/table/MonthSelector";
import SaveReminderBanner from "../components/layout/SaveReminderBanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Check, Search, Trash2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

function fileToJpegDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxSide = 2000;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось открыть фото"));
    };
    image.src = url;
  });
}

export default function DataInput() {
  const { user } = useAuth();
  const canEdit = user?.can_edit;
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const defaultMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const defaultYear = currentMonthIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[defaultMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [inputValues, setInputValues] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [savingMeter, setSavingMeter] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [savingIc, setSavingIc] = useState(false);
  const [ocrReport, setOcrReport] = useState(null);
  const [uncertainMeters, setUncertainMeters] = useState({});
  const photoInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: readings, isLoading } = useQuery({
    queryKey: ["readings-sb", selectedYear, selectedMonth],
    queryFn: () => listReadings({ year: selectedYear, month: selectedMonth }),
    initialData: [],
  });

  const getExistingReading = (meterNumber) =>
    readings.find((r) => r.meter_number === meterNumber);

  const pendingMeters = useMemo(
    () =>
      METERS.filter((m) => {
        const v = inputValues[m.number];
        return v !== undefined && v !== "" && !isNaN(parseFloat(v));
      }),
    [inputValues]
  );

  const isDirty = canEdit && pendingMeters.length > 0;

  const saveMeter = async (meter, valueOverride) => {
    const value = valueOverride ?? inputValues[meter.number];
    if (value === undefined || value === "") return false;
    const currentReading = parseFloat(value);
    if (isNaN(currentReading)) return false;

    setSavingMeter(meter.number);

    const monthIndex = MONTHS.indexOf(selectedMonth);
    let initialReading = meter.initialReading || 0;

    const prevMonth = monthIndex === 0 ? MONTHS[11] : MONTHS[monthIndex - 1];
    const prevYear = monthIndex === 0 ? selectedYear - 1 : selectedYear;

    const prevReadings = await listReadings({
      year: prevYear,
      month: prevMonth,
      meter_number: meter.number,
    });
    if (prevReadings.length > 0 && prevReadings[0].current_reading !== null) {
      initialReading = prevReadings[0].current_reading;
    }

    await upsertReadings({
      meter_number: meter.number,
      meter_code: meter.code,
      meter_name: meter.name,
      meter_type: meter.type,
      ratio_coefficient: meter.coefficient,
      year: selectedYear,
      month: selectedMonth,
      initial_reading: initialReading,
      current_reading: currentReading,
    });

    setSavingMeter(null);
    setInputValues((prev) => {
      const next = { ...prev };
      delete next[meter.number];
      return next;
    });
    return true;
  };

  const handleSave = async (meter) => {
    try {
      const ok = await saveMeter(meter);
      if (!ok) return;
      queryClient.invalidateQueries({ queryKey: ["readings-sb", selectedYear, selectedMonth] });
      toast.success(`${meter.code} сохранён в Supabase`);
    } catch (err) {
      setSavingMeter(null);
      console.error("[DataInput] save error:", err);
      toast.error("Ошибка при сохранении");
      throw err;
    }
  };

  const handleSaveAll = useCallback(async () => {
    if (pendingMeters.length === 0) {
      toast.message("Нет несохранённых показаний");
      return;
    }
    setSavingAll(true);
    try {
      // снимок, чтобы цикл не зависел от асинхронных clear
      const toSave = pendingMeters.map((m) => ({
        meter: m,
        value: inputValues[m.number],
      }));
      for (const { meter, value } of toSave) {
        await saveMeter(meter, value);
      }
      queryClient.invalidateQueries({ queryKey: ["readings-sb", selectedYear, selectedMonth] });
      toast.success(`Сохранено показаний: ${toSave.length}`);
    } catch (err) {
      console.error("[DataInput] save all error:", err);
      toast.error("Ошибка при сохранении");
      throw err;
    } finally {
      setSavingAll(false);
      setSavingMeter(null);
    }
  }, [pendingMeters, inputValues, selectedYear, selectedMonth, queryClient]);

  const { requestLeave } = useUnsavedGuard({
    isDirty,
    onSave: handleSaveAll,
    saving: savingAll,
    enabled: !!canEdit,
  });

  const handleDelete = async (existingId, meterCode) => {
    if (!confirm(`Удалить показания для ${meterCode}?`)) return;
    try {
      await deleteReading(existingId);
      queryClient.invalidateQueries({ queryKey: ["readings-sb", selectedYear, selectedMonth] });
      toast.success(`${meterCode} удалён`);
    } catch (error) {
      toast.error(`Ошибка при удалении: ${error.message}`);
    }
  };

  const changeMonth = (fn) => {
    requestLeave(() => {
      setInputValues({});
      setOcrReport(null);
      setUncertainMeters({});
      fn();
    });
  };

  const handlePhoto = async (file) => {
    if (!file) return;
    setReadingPhoto(true);
    try {
      const image = await fileToJpegDataUrl(file);
      const response = await fetch("/api/read-meter-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось прочитать бланк");

      const nextValues = {};
      const nextUncertain = {};
      for (const row of payload.meters || []) {
        nextValues[row.number] = String(row.reading);
        if (row.uncertain || row.replaced_from != null) nextUncertain[row.number] = row;
      }
      setInputValues((prev) => ({ ...prev, ...nextValues }));
      setUncertainMeters(nextUncertain);
      setOcrReport(payload);
      const icCount = ["water", "ee", "heating"].filter((key) => payload.ic?.[key] != null).length;
      toast.success(
        `Прочитано счётчиков: ${payload.meters?.length || 0}` +
          (icCount ? `, строки ИЦ: ${icCount}` : "")
      );
    } catch (err) {
      console.error("[DataInput] photo read error:", err);
      toast.error(err.message || "Не удалось прочитать бланк");
    } finally {
      setReadingPhoto(false);
    }
  };

  const saveIcFromReport = async () => {
    const ic = ocrReport?.ic;
    if (!ic) return;
    const patch = {};
    if (ic.ee != null) patch.ee_reading = ic.ee;
    if (ic.water != null) {
      patch.water_supply_reading = ic.water;
      patch.water_drainage_reading = ic.water;
    }
    if (ic.heating != null) patch.heating_reading = ic.heating;
    if (Object.keys(patch).length === 0) return;

    setSavingIc(true);
    try {
      const { data: existing, error: readError } = await supabase
        .from("ic_readings")
        .select("id")
        .eq("year", selectedYear)
        .eq("month", selectedMonth)
        .maybeSingle();
      if (readError) throw readError;
      if (existing?.id) {
        const { error } = await supabase.from("ic_readings").update(patch).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ic_readings").insert({
          year: selectedYear,
          month: selectedMonth,
          ...patch,
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["ic-readings"] });
      toast.success(`Показания ИЦ за ${selectedMonth} записаны`);
    } catch (err) {
      console.error("[DataInput] ic save error:", err);
      toast.error("Не удалось записать показания ИЦ");
    } finally {
      setSavingIc(false);
    }
  };

  const filteredMeters = METERS.filter(
    (m) =>
      searchQuery === "" ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.number.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Ввод показаний
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Данные сохраняются в Supabase
          </p>
          {canEdit && (
            <div className="mt-3">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  handlePhoto(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={readingPhoto}
                onClick={() => photoInputRef.current?.click()}
                className="bg-white/5 border-white/10"
              >
                {readingPhoto ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4 mr-2" />
                )}
                {readingPhoto ? "Читаю бланк..." : "Загрузить фото бланка"}
              </Button>
            </div>
          )}
        </div>
        <GlassCard className="p-4 min-w-[280px]">
          <MonthSelector
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            confirmChange={changeMonth}
          />
        </GlassCard>
      </div>

      {canEdit && (
        <SaveReminderBanner
          onSave={handleSaveAll}
          saving={savingAll}
          disabled={isLoading}
          isDirty={isDirty}
        />
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по номеру или названию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 backdrop-blur-xl"
        />
      </div>

      {ocrReport && (
        <GlassCard className="p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Бланк прочитан</p>
            <p className="text-xs text-muted-foreground mt-1">
              Цифры разложены по строкам этого бланка, не по номеру карточки один в один.
              Жёлтая рамка — цифра сомнительная или на бланке была исправлена. В базу ещё ничего не записано.
            </p>
          </div>
          {ocrReport.ic && ["water", "ee", "heating"].some((key) => ocrReport.ic[key] != null) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
              <p className="text-muted-foreground">
                ИЦ: вода {ocrReport.ic.water ?? "—"}, свет {ocrReport.ic.ee ?? "—"}, тепло{" "}
                {ocrReport.ic.heating ?? "—"} Гкал
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={savingIc}
                onClick={saveIcFromReport}
                className="bg-white/5 border-white/10 shrink-0"
              >
                {savingIc ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                Записать в расчёт ИЦ
              </Button>
            </div>
          )}
          {ocrReport.meters?.length > 0 && (
            <p className="text-xs text-foreground leading-relaxed">
              {ocrReport.meters
                .map((row) => `${row.number} · ${row.name}: ${row.reading}`)
                .join("  ·  ")}
            </p>
          )}
          {ocrReport.extras?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              На бланке есть, в этой вкладке поля нет:{" "}
              {ocrReport.extras.map((row) => `${row.label} ${row.reading}`).join("; ")}
            </p>
          )}
          {ocrReport.unmatched?.length > 0 && (
            <p className="text-xs text-amber-200/90">
              Не разложено, проверьте вручную:{" "}
              {ocrReport.unmatched
                .map((row) => `строка ${row.paper_row ?? "—"} «${row.note}» = ${row.reading}`)
                .join("; ")}
            </p>
          )}
        </GlassCard>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMeters.map((meter) => {
            const existing = getExistingReading(meter.number);
            const hasData = !!existing;
            const hasDraft = inputValues[meter.number] !== undefined && inputValues[meter.number] !== "";

            return (
              <GlassCard key={meter.number} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary tabular-nums">{meter.number}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{meter.code}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{meter.name}</p>
                    </div>
                  </div>
                  {hasData && (
                    <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 text-[10px]">
                      <Check className="w-3 h-3 mr-1" />
                      Есть
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Коэф.</p>
                    <p className="font-medium text-foreground tabular-nums">{meter.coefficient}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Нач. пок.</p>
                    <p className="font-medium text-foreground tabular-nums">
                      {existing
                        ? existing.initial_reading?.toLocaleString("ru-RU")
                        : meter.initialReading?.toLocaleString("ru-RU") || "—"}
                    </p>
                  </div>
                  {hasData && (
                    <div>
                      <p className="text-muted-foreground">Расход</p>
                      <p
                        className={cn(
                          "font-bold tabular-nums",
                          existing.consumption > 0 ? "text-primary" : "text-destructive"
                        )}
                      >
                        {existing.consumption?.toLocaleString("ru-RU")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={hasData ? existing.current_reading?.toString() : "Показание..."}
                    value={inputValues[meter.number] || ""}
                    onChange={(e) => {
                      setInputValues((prev) => ({ ...prev, [meter.number]: e.target.value }));
                      setUncertainMeters((prev) => {
                        if (!prev[meter.number]) return prev;
                        const next = { ...prev };
                        delete next[meter.number];
                        return next;
                      });
                    }}
                    className={cn(
                      "bg-white/5 border-white/10 text-sm tabular-nums",
                      hasDraft && "border-amber-500/40",
                      uncertainMeters[meter.number] && "border-amber-400 ring-1 ring-amber-400/60"
                    )}
                    onKeyDown={(e) => e.key === "Enter" && handleSave(meter)}
                    disabled={!canEdit}
                  />
                  {canEdit && (
                    <>
                      <Button
                        size="icon"
                        onClick={() => handleSave(meter)}
                        disabled={savingMeter === meter.number || !inputValues[meter.number]}
                        className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 shrink-0"
                      >
                        {savingMeter === meter.number ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                      {hasData && (
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(existing.id, meter.code)}
                          className="shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
