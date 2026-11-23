"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, RotateCcw, Trash2, X } from "lucide-react";
import { restoreItems } from "@/app/admin/trash-actions";
import { cn } from "@/lib/utils";

/**
 * Einheitliches Feedback in der Verwaltung:
 *  - confirm(): schöner Bestätigungsdialog (Klick außerhalb / ESC = abbrechen), optional mit Kontrollkästchen
 *  - toast(): kurze Meldung unten, bei gelöschten Einträgen mit „Rückgängig“
 */
type ConfirmOpts = { title: string; text?: string; confirm?: string; danger?: boolean; option?: string };
type ConfirmResult = { ok: boolean; option: boolean };
type ToastOpts = { undo?: string[]; tone?: "ok" | "error" };
type Ctx = {
  confirm: (o: ConfirmOpts) => Promise<ConfirmResult>;
  toast: (text: string, o?: ToastOpts) => void;
};

const FeedbackCtx = createContext<Ctx | null>(null);

export function useFeedback(): Ctx {
  const c = useContext(FeedbackCtx);
  if (!c) throw new Error("FeedbackProvider fehlt");
  return c;
}

type Toast = { id: number; text: string; undo?: string[]; tone: "ok" | "error" };

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (r: ConfirmResult) => void }) | null>(null);
  const [option, setOption] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Portal erst im Browser
  useEffect(() => setMounted(true), []);

  const confirm = useCallback(
    (o: ConfirmOpts) =>
      new Promise<ConfirmResult>((resolve) => {
        setOption(false);
        setDialog({ ...o, resolve });
      }),
    [],
  );
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const toast = useCallback((text: string, o?: ToastOpts) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, text, undo: o?.undo, tone: o?.tone ?? "ok" }]);
    setTimeout(() => dismiss(id), o?.undo?.length ? 8000 : 4000);
  }, []);

  const close = (ok: boolean) => {
    dialog?.resolve({ ok, option });
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        dialog.resolve({ ok: false, option: false });
        setDialog(null);
      }
      if (e.key === "Enter") {
        dialog.resolve({ ok: true, option });
        setDialog(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [dialog, option]);

  return (
    <FeedbackCtx.Provider value={{ confirm, toast }}>
      {children}
      {mounted
        ? createPortal(
            <>
              {dialog ? (
                <div className="qd-fade-in fixed inset-0 z-[100] grid place-items-end bg-ink/45 p-0 backdrop-blur-[3px] sm:place-items-center sm:p-4" onMouseDown={() => close(false)}>
                  <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-label={dialog.title}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="qd-pop-in w-full max-w-sm overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
                  >
                    <div className="px-6 pb-5 pt-6 text-center">
                      {dialog.danger ? (
                        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
                          <Trash2 className="size-5" aria-hidden />
                        </span>
                      ) : null}
                      <h2 className="text-[1.05rem] font-semibold">{dialog.title}</h2>
                      {dialog.text ? <p className="mt-1.5 text-sm leading-relaxed text-stone-dark">{dialog.text}</p> : null}
                      {dialog.option ? (
                        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink/[0.04] px-3 py-2.5 text-sm">
                          <input type="checkbox" checked={option} onChange={(e) => setOption(e.target.checked)} className="size-4 accent-red-600" />
                          {dialog.option}
                        </label>
                      ) : null}
                      {dialog.danger ? <p className="mt-3 text-xs text-stone-dark">30 Tage im Papierkorb wiederherstellbar.</p> : null}
                    </div>
                    <div className="grid grid-cols-2 border-t border-ink/[0.07]">
                      <button type="button" onClick={() => close(false)} className="h-12 text-[0.95rem] font-medium text-stone-dark hover:bg-ink/[0.03]">
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        autoFocus
                        onClick={() => close(true)}
                        className={cn("h-12 border-l border-ink/[0.07] text-[0.95rem] font-semibold hover:bg-ink/[0.03]", dialog.danger ? "text-red-600" : "text-accent")}
                      >
                        {dialog.confirm ?? (dialog.danger ? "Löschen" : "OK")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[110] flex flex-col items-center gap-2 px-4" aria-live="polite">
                {toasts.map((t) => (
                  <ToastPill key={t.id} t={t} onClose={() => dismiss(t.id)} onToast={toast} />
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </FeedbackCtx.Provider>
  );
}

function ToastPill({ t, onClose, onToast }: { t: Toast; onClose: () => void; onToast: (s: string, o?: ToastOpts) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className={cn("qd-pop-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl py-2.5 pl-4 pr-2 text-sm text-white shadow-2xl", t.tone === "error" ? "bg-red-600" : "bg-ink/95 backdrop-blur")}>
      {t.tone === "ok" ? <CheckCircle2 className="size-4 shrink-0 text-emerald-400" aria-hidden /> : null}
      <span className="min-w-0 flex-1">{t.text}</span>
      {t.undo?.length ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await restoreItems(t.undo!);
            onClose();
            onToast(r.error ?? "Wiederhergestellt.", { tone: r.error ? "error" : "ok" });
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white/15 px-3 font-semibold hover:bg-white/25 disabled:opacity-50"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Rückgängig
        </button>
      ) : null}
      <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white" aria-label="Schließen">
        <X className="size-4" />
      </button>
    </div>
  );
}
