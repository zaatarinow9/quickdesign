"use client";

import { useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Check, ImagePlus, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { signImageUpload, type Result } from "@/app/shop-admin/actions";
import type { Localized } from "@/lib/shop/schema";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Text DE/AR */

export function LField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  hint,
}: {
  label: string;
  value: Localized;
  onChange: (v: Localized) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}) {
  const Comp = multiline ? "textarea" : "input";
  return (
    <div>
      <p className="adm-label">{label}</p>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="relative block">
          <span className="pointer-events-none absolute end-2 top-2 rounded bg-ink/[0.06] px-1.5 text-[0.65rem] font-semibold text-stone-dark">DE</span>
          <Comp
            className={cn("adm-input w-full pe-10", multiline && "min-h-[5rem] py-2 leading-relaxed")}
            rows={multiline ? rows : undefined}
            value={value.de}
            onChange={(e) => onChange({ ...value, de: e.target.value })}
          />
        </label>
        <label className="relative block">
          <span className="pointer-events-none absolute start-2 top-2 rounded bg-ink/[0.06] px-1.5 text-[0.65rem] font-semibold text-stone-dark">AR</span>
          <Comp
            dir="rtl"
            lang="ar"
            className={cn("adm-input w-full ps-10", multiline && "min-h-[5rem] py-2 leading-relaxed")}
            rows={multiline ? rows : undefined}
            value={value.ar}
            onChange={(e) => onChange({ ...value, ar: e.target.value })}
          />
        </label>
      </div>
      {hint ? <p className="mt-1 text-xs text-stone-dark">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Geld, Zahl, Schalter */

export function MoneyInput({ cents, onChange, className }: { cents: number; onChange: (c: number) => void; className?: string }) {
  const [text, setText] = useState((cents / 100).toFixed(2).replace(".", ","));
  const [last, setLast] = useState(cents);
  if (cents !== last) {
    setLast(cents);
    setText((cents / 100).toFixed(2).replace(".", ","));
  }
  return (
    <label className={cn("relative block", className)}>
      <input
        inputMode="decimal"
        className="adm-input w-full pe-7 text-end tabular-nums"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value.replace(/\./g, "").replace(",", "."));
          if (Number.isFinite(n) && n >= 0) {
            const c = Math.round(n * 100);
            setLast(c);
            onChange(c);
          }
        }}
        onBlur={() => setText((cents / 100).toFixed(2).replace(".", ","))}
      />
      <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm text-stone-dark">€</span>
    </label>
  );
}

export function NumberInput({ value, onChange, min = 0, max = 100000, suffix, className }: { value: number; onChange: (n: number) => void; min?: number; max?: number; suffix?: string; className?: string }) {
  return (
    <label className={cn("relative block", className)}>
      <input
        type="number"
        min={min}
        max={max}
        className={cn("adm-input w-full tabular-nums", suffix && "pe-8")}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Math.round(Number(e.target.value) || 0))))}
      />
      {suffix ? <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm text-stone-dark">{suffix}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-[#0b6b3a]" : "bg-ink/15")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]", checked ? "left-[1.375rem]" : "left-0.5")} />
      </button>
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-stone-dark">{hint}</span> : null}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ Bilder */

/** Bild im Browser verkleinern und als WebP komprimieren (spart Speicher und Ladezeit) */
async function compress(file: File, max = 2400): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.88));
  return blob ?? file;
}

let sb: ReturnType<typeof createClient> | null = null;
const storage = () => {
  sb ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  return sb.storage.from("shop");
};

export function ImageField({
  value,
  onChange,
  label,
  fallback,
  size = "md",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** Standardbild, auf das zurückgesetzt werden kann */
  fallback?: string;
  size?: "sm" | "md";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const blob = await compress(file);
      const type = blob.type || file.type;
      const signed = await signImageUpload({ name: file.name, type });
      if (!signed.ok) throw new Error(signed.error);
      const { error: upErr } = await storage().uploadToSignedUrl(signed.path, signed.token, blob, { contentType: type, cacheControl: "31536000" });
      if (upErr) throw new Error("Upload fehlgeschlagen.");
      onChange(signed.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const box = size === "sm" ? "size-16" : "aspect-square w-full";
  return (
    <div className={size === "sm" ? "flex items-center gap-3" : ""}>
      {label ? <p className="adm-label">{label}</p> : null}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void upload(e.dataTransfer.files[0]);
        }}
        className={cn(
          "group relative shrink-0 overflow-hidden rounded-xl bg-ink/[0.04] ring-1 ring-ink/10 transition",
          box,
          drag && "ring-2 ring-[#0b6b3a]",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-stone-dark">
            <ImagePlus className="size-6" aria-hidden />
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
          </div>
        ) : null}
        <button type="button" onClick={() => input.current?.click()} className="absolute inset-0" aria-label="Bild hochladen" />
      </div>
      <div className={cn("flex flex-wrap items-center gap-1.5", size === "sm" ? "" : "mt-2")}>
        <button type="button" onClick={() => input.current?.click()} className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy}>
          <ImagePlus className="size-3.5" /> {value ? "Ersetzen" : "Hochladen"}
        </button>
        {fallback && value !== fallback ? (
          <button type="button" onClick={() => onChange(fallback)} className="adm-btn adm-btn-ghost adm-btn-sm" title="Standardbild wiederherstellen">
            <RotateCcw className="size-3.5" />
          </button>
        ) : null}
        {value ? (
          <button type="button" onClick={() => onChange("")} className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" title="Entfernen">
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
  );
}

/* ------------------------------------------------------------------ Speichern */

export function SaveBar({ onSave, dirty, extra }: { onSave: () => Promise<Result>; dirty: boolean; extra?: React.ReactNode }) {
  const [state, setState] = useState<{ busy: boolean; msg: string; ok: boolean }>({ busy: false, msg: "", ok: true });
  const save = async () => {
    setState({ busy: true, msg: "", ok: true });
    const r = await onSave();
    setState({ busy: false, ok: r.ok, msg: r.ok ? (r.message ?? "Gespeichert.") : r.error });
  };
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-ink/10 bg-white/90 px-4 py-3 backdrop-blur sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={state.busy} className="adm-btn h-11 bg-[#0b6b3a] px-6 text-white hover:bg-[#0a5c32] disabled:opacity-60">
          {state.busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Speichern
        </button>
        {dirty && !state.busy ? <span className="text-sm text-amber-700">Ungespeicherte Änderungen</span> : null}
        {state.msg ? <span className={cn("text-sm", state.ok ? "text-emerald-700" : "text-red-700")}>{state.msg}</span> : null}
        <span className="ms-auto">{extra}</span>
      </div>
    </div>
  );
}
