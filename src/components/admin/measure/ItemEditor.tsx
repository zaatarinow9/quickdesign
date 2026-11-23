"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Minus, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { deleteMeasureItem, measurePhotoUpload, saveMeasureItem } from "@/app/admin/measure-actions";
import { areaM2, defaultArrows, fmtM2, itemPresets, type Arrows, type MeasureItem } from "@/lib/measure/shared";
import { useFeedback } from "@/components/admin/feedback";
import { cn } from "@/lib/utils";
import { compressPhoto, H_COLOR, MeasureCanvas, renderMarked, W_COLOR } from "./MeasureCanvas";

async function put(url: string, blob: Blob) {
  const r = await fetch(url, { method: "PUT", body: blob, headers: { "content-type": "image/jpeg" } });
  if (!r.ok) throw new Error(`Upload fehlgeschlagen (${r.status})`);
}

const num = (s: string) => {
  const v = Number(s.replace(",", "."));
  return s.trim() && Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null;
};

/** Eine Position erfassen: Foto, Breite × Höhe (cm) mit Pfeilen, Anzahl, Notizen */
export function ItemEditor({ measurementId, item, nextPosition, title, onClose }: { measurementId: string; item?: MeasureItem | null; nextPosition: number; title: string; onClose: () => void }) {
  const { toast, confirm } = useFeedback();
  const [label, setLabel] = useState(item?.label ?? "");
  const [w, setW] = useState(item?.width_cm != null ? String(item.width_cm).replace(".", ",") : "");
  const [h, setH] = useState(item?.height_cm != null ? String(item.height_cm).replace(".", ",") : "");
  const [qty, setQty] = useState(item?.quantity ?? 1);
  const [material, setMaterial] = useState(item?.material ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [arrows, setArrows] = useState<Required<Arrows>>(() => ({ ...defaultArrows(), ...(item?.arrows ?? {}) }) as Required<Arrows>);
  const [photo, setPhoto] = useState<{ url: string; blob?: Blob; width: number; height: number; key?: string } | null>(
    item?.photo_url ? { url: item.photo_url, width: item.photo_width ?? 4, height: item.photo_height ?? 3, key: item.photo_key ?? undefined } : null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const width = num(w);
  const height = num(h);
  const area = areaM2({ width_cm: width, height_cm: height, quantity: qty });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[role="alertdialog"]') && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const pick = async (file?: File | null) => {
    if (!file) return;
    setBusy("Foto wird vorbereitet …");
    try {
      const p = await compressPhoto(file);
      setPhoto({ url: URL.createObjectURL(p.blob), blob: p.blob, width: p.width, height: p.height });
    } catch {
      toast("Foto konnte nicht gelesen werden.", { tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const save = async (andNext = false) => {
    if (!width && !height && !label && !photo) return toast("Bitte mindestens ein Maß oder ein Foto erfassen.", { tone: "error" });
    try {
      let photoInfo: { key: string; width: number; height: number } | null | undefined = undefined;
      let markedKey: string | null | undefined = undefined;
      if (photo?.blob) {
        setBusy("Foto wird hochgeladen …");
        const up = await measurePhotoUpload(measurementId, "foto");
        if (!up.url || !up.key) throw new Error(up.error ?? "Upload nicht möglich");
        await put(up.url, photo.blob);
        photoInfo = { key: up.key, width: photo.width, height: photo.height };
      } else if (!photo && item?.photo_key) {
        photoInfo = null;
        markedKey = null;
      }
      // Foto mit eingezeichneten Maßen (für Kundenordner und Druck)
      if (photo) {
        setBusy("Maße werden eingezeichnet …");
        const src = photo.blob ? photo.url : URL.createObjectURL(await (await fetch(photo.url)).blob());
        const img = new Image();
        img.src = src;
        await img.decode();
        const pos = item?.position ?? nextPosition;
        const marked = await renderMarked(img, arrows, width, height, `${title} · Pos. ${pos}${label ? ` · ${label}` : ""}`);
        const up = await measurePhotoUpload(measurementId, "markiert");
        if (up.url && up.key) {
          await put(up.url, marked);
          markedKey = up.key;
        }
      }
      setBusy("Speichern …");
      const r = await saveMeasureItem({
        measurementId,
        id: item?.id,
        label: label.trim(),
        width,
        height,
        quantity: qty,
        material: material.trim() || null,
        notes: notes.trim() || null,
        photo: photoInfo,
        arrows,
        markedKey,
      });
      if (r.error) throw new Error(r.error);
      toast(item ? "Position gespeichert." : `Position ${nextPosition} gespeichert.`);
      if (andNext) {
        setLabel("");
        setW("");
        setH("");
        setQty(1);
        setMaterial("");
        setNotes("");
        setPhoto(null);
        setArrows(defaultArrows());
      } else onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Speichern fehlgeschlagen.", { tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!item) return;
    const ok = await confirm({ title: `Position ${item.position} löschen?`, danger: true });
    if (!ok.ok) return;
    setBusy("Löschen …");
    await deleteMeasureItem(item.id);
    setBusy(null);
    onClose();
  };

  return (
    <div className="qd-fade-in fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 backdrop-blur-[3px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qd-pop-in flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label="Position erfassen">
        <header className="flex items-center gap-3 border-b border-ink/[0.07] px-5 py-3.5">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-bold text-white">{item?.position ?? nextPosition}</span>
          <h2 className="flex-1 font-semibold">{item ? "Position bearbeiten" : "Neue Position"}</h2>
          {item ? (
            <button type="button" onClick={remove} className="grid size-9 place-items-center rounded-xl text-stone-dark hover:bg-red-50 hover:text-red-600" aria-label="Position löschen">
              <Trash2 className="size-4" />
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl hover:bg-ink/[0.06]" aria-label="Schließen">
            <X className="size-5" />
          </button>
        </header>

        <div className="grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[1.25fr_1fr]">
          {/* Foto + Pfeile */}
          <div className="space-y-2.5">
            <MeasureCanvas photoUrl={photo?.url} aspect={photo ? photo.width / photo.height : 4 / 3} arrows={arrows} width={width} height={height} onChange={setArrows} />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => camera.current?.click()} className="adm-btn adm-btn-primary adm-btn-sm">
                <Camera className="size-4" aria-hidden /> {photo ? "Neues Foto" : "Foto aufnehmen"}
              </button>
              <button type="button" onClick={() => gallery.current?.click()} className="adm-btn adm-btn-ghost adm-btn-sm">
                <ImagePlus className="size-4" aria-hidden /> Aus Galerie
              </button>
              <button type="button" onClick={() => setArrows(defaultArrows())} className="adm-btn adm-btn-ghost adm-btn-sm" title="Pfeile zurücksetzen">
                <RotateCcw className="size-4" aria-hidden /> Pfeile
              </button>
              {photo ? (
                <button type="button" onClick={() => setPhoto(null)} className="adm-btn adm-btn-ghost adm-btn-sm text-red-700">
                  Foto entfernen
                </button>
              ) : null}
            </div>
            <p className="text-xs leading-relaxed text-stone-dark">
              Pfeile an den Punkten ziehen: <b style={{ color: W_COLOR }}>blau = Breite</b> (links ↔ rechts), <b style={{ color: H_COLOR }}>orange = Höhe</b> (oben ↕ unten).
            </p>
            <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
            <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
          </div>

          {/* Maße */}
          <div className="space-y-4">
            <div>
              <label className="adm-label" htmlFor="m-label">
                Bezeichnung
              </label>
              <input id="m-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Schaufenster links" className="adm-input" maxLength={120} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {itemPresets.map((p) => (
                  <button key={p} type="button" onClick={() => setLabel(p)} className={cn("h-7 rounded-full px-2.5 text-xs", label === p ? "bg-ink text-white" : "bg-ink/[0.05] hover:bg-ink/[0.1]")}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MeasureInput id="m-w" label="Breite" hint="links ↔ rechts" color={W_COLOR} value={w} onChange={setW} />
              <MeasureInput id="m-h" label="Höhe" hint="oben ↕ unten" color={H_COLOR} value={h} onChange={setH} />
            </div>
            <div className="flex items-end gap-3">
              <div>
                <span className="adm-label">Anzahl</span>
                <div className="flex h-11 items-center rounded-xl ring-1 ring-ink/15">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center text-stone-dark" aria-label="Weniger">
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
                  <button type="button" onClick={() => setQty((q) => Math.min(999, q + 1))} className="grid size-11 place-items-center text-stone-dark" aria-label="Mehr">
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 rounded-xl bg-ink/[0.04] px-3 py-2 text-right">
                <span className="block text-[0.7rem] text-stone-dark">Fläche gesamt</span>
                <span className="text-lg font-bold tabular-nums">{area ? fmtM2(area) : "–"}</span>
              </div>
            </div>
            <div>
              <label className="adm-label" htmlFor="m-mat">
                Material / Ausführung
              </label>
              <input id="m-mat" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="z. B. Milchglasfolie, Montage innen" className="adm-input" maxLength={200} />
            </div>
            <div>
              <label className="adm-label" htmlFor="m-notes">
                Notizen
              </label>
              <textarea id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Besonderheiten, Abstand zum Rand, Untergrund …" className="adm-input" maxLength={4000} />
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/[0.07] bg-paper/60 px-5 py-3">
          {busy ? (
            <span className="mr-auto inline-flex items-center gap-2 text-sm text-stone-dark">
              <Loader2 className="size-4 animate-spin" aria-hidden /> {busy}
            </span>
          ) : null}
          {!item ? (
            <button type="button" disabled={!!busy} onClick={() => save(true)} className="adm-btn adm-btn-ghost">
              Speichern & nächste
            </button>
          ) : null}
          <button type="button" disabled={!!busy} onClick={() => save(false)} className="adm-btn adm-btn-primary">
            Speichern
          </button>
        </footer>
      </div>
    </div>
  );
}

function MeasureInput({ id, label, hint, color, value, onChange }: { id: string; label: string; hint: string; color: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-center justify-between text-sm font-semibold" style={{ color }}>
        {label} <span className="text-[0.7rem] font-normal text-stone-dark">{hint}</span>
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
          placeholder="0"
          className="h-14 w-full rounded-xl border-0 bg-white pl-4 pr-12 text-2xl font-bold tabular-nums outline-none ring-2"
          style={{ ["--tw-ring-color" as string]: `${color}55`, color }}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-dark">cm</span>
      </div>
    </div>
  );
}
