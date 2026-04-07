import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { METERS, MONTHS } from "@/lib/meterConfig";
import { listReadings, upsertReadings, deleteReading } from "@/lib/supabaseApi";
import GlassCard from "../components/layout/GlassCard";
import MonthSelector from "../components/table/MonthSelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Check, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

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
  const queryClient = useQueryClient();

  const { data: readings, isLoading } = useQuery({
    queryKey: ['readings-sb', selectedYear, selectedMonth],
    queryFn: () => listReadings({ year: selectedYear, month: selectedMonth }),
    initialData: [],
  });

  const getExistingReading = (meterNumber) =>
    readings.find(r => r.meter_number === meterNumber);

  const handleSave = async (meter) => {
    const value = inputValues[meter.number];
    if (value === undefined || value === "") return;
    const currentReading = parseFloat(value);
    if (isNaN(currentReading)) return;

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

    queryClient.invalidateQueries({ queryKey: ['readings-sb', selectedYear, selectedMonth] });
    setSavingMeter(null);
    setInputValues(prev => ({ ...prev, [meter.number]: "" }));
    toast.success(`${meter.code} сохранён в Supabase`);
  };

  const handleDelete = async (existingId, meterCode) => {
    if (!confirm(`Удалить показания для ${meterCode}?`)) return;
    try {
      await deleteReading(existingId);
      queryClient.invalidateQueries({ queryKey: ['readings-sb', selectedYear, selectedMonth] });
      toast.success(`${meterCode} удалён`);
    } catch (error) {
      toast.error(`Ошибка при удалении: ${error.message}`);
    }
  };

  const filteredMeters = METERS.filter(m =>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по номеру или названию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 backdrop-blur-xl"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMeters.map((meter) => {
            const existing = getExistingReading(meter.number);
            const hasData = !!existing;

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
                        ? existing.initial_reading?.toLocaleString('ru-RU')
                        : (meter.initialReading?.toLocaleString('ru-RU') || '—')}
                    </p>
                  </div>
                  {hasData && (
                    <div>
                      <p className="text-muted-foreground">Расход</p>
                      <p className={cn(
                        "font-bold tabular-nums",
                        existing.consumption > 0 ? "text-primary" : "text-destructive"
                      )}>
                        {existing.consumption?.toLocaleString('ru-RU')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={hasData ? existing.current_reading?.toString() : "Показание..."}
                    value={inputValues[meter.number] || ""}
                    onChange={(e) => setInputValues(prev => ({ ...prev, [meter.number]: e.target.value }))}
                    className="bg-white/5 border-white/10 text-sm tabular-nums"
                    onKeyDown={(e) => e.key === 'Enter' && handleSave(meter)}
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