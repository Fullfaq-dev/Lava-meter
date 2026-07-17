import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const registrationRef = useRef({
    isDirty: false,
    onSave: null,
    saving: false,
  });
  const [, setTick] = useState(0);
  const [dialog, setDialog] = useState({ open: false, proceed: null });
  const [dialogSaving, setDialogSaving] = useState(false);

  const register = useCallback((state) => {
    registrationRef.current = {
      isDirty: !!state.isDirty,
      onSave: state.onSave || null,
      saving: !!state.saving,
    };
    setTick((t) => t + 1);
  }, []);

  const unregister = useCallback(() => {
    registrationRef.current = { isDirty: false, onSave: null, saving: false };
    setTick((t) => t + 1);
  }, []);

  const isDirty = registrationRef.current.isDirty;

  const requestLeave = useCallback((proceed) => {
    if (typeof proceed !== "function") return;
    if (!registrationRef.current.isDirty) {
      proceed();
      return;
    }
    setDialog({ open: true, proceed });
  }, []);

  const closeDialog = useCallback(() => {
    setDialog({ open: false, proceed: null });
    setDialogSaving(false);
  }, []);

  const handleDiscard = useCallback(() => {
    const proceed = dialog.proceed;
    closeDialog();
    proceed?.();
  }, [dialog.proceed, closeDialog]);

  const handleSaveAndLeave = useCallback(async () => {
    const proceed = dialog.proceed;
    const onSave = registrationRef.current.onSave;
    setDialogSaving(true);
    try {
      if (onSave) await onSave();
      closeDialog();
      proceed?.();
    } catch (err) {
      console.error("[UnsavedChanges] save before leave failed:", err);
      setDialogSaving(false);
    }
  }, [dialog.proceed, closeDialog]);

  // Закрытие вкладки / обновление страницы
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!registrationRef.current.isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const value = useMemo(
    () => ({
      register,
      unregister,
      requestLeave,
      isDirty,
    }),
    [register, unregister, requestLeave, isDirty]
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <Dialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open && !dialogSaving) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md border-white/10 bg-background">
          <DialogHeader>
            <DialogTitle>Несохранённые данные</DialogTitle>
            <DialogDescription>
              Есть несохранённые изменения. Сохранить перед уходом?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={handleDiscard}
              disabled={dialogSaving}
              className="text-muted-foreground"
            >
              Не сохранять
            </Button>
            <Button
              onClick={handleSaveAndLeave}
              disabled={dialogSaving}
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
            >
              {dialogSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
  }
  return ctx;
}

/**
 * Регистрирует страницу с ручным вводом: dirty + сохранение при уходе.
 * @returns {{ requestLeave: (proceed: () => void) => void }}
 */
export function useUnsavedGuard({ isDirty, onSave, saving = false, enabled = true }) {
  const { register, unregister, requestLeave } = useUnsavedChanges();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const stableSave = useCallback(async () => {
    if (onSaveRef.current) await onSaveRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) {
      unregister();
      return undefined;
    }
    register({ isDirty, onSave: stableSave, saving });
    return () => unregister();
  }, [enabled, isDirty, saving, register, unregister, stableSave]);

  return { requestLeave };
}
