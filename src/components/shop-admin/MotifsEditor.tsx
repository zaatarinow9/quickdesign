"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { saveMotifs } from "@/app/shop-admin/actions";
import type { Motif } from "@/lib/shop/schema";
import { Card } from "@/components/admin/ui";
import { SaveBar, Toggle, uploadImage } from "./fields";

const newId = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "tasmim"}-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 4)}`;

export function MotifsEditor({ initial }: { initial: Motif[] }) {
  const router = useRouter();
  const [list, setList] = useState<Motif[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [bulk, setBulk] = useState<{ done: number; total: number; error: string } | null>(null);
  const files = useRef<HTMLInputElement>(null);

  const change = (next: Motif[]) => {
    setList(next);
    setDirty(true);
  };
  const set = (i: number, patch: Partial<Motif>) => change(list.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };

  // Mehrere Dateien auf einmal: je Datei ein Motiv (gleiche Grafik für helle und dunkle Stoffe)
  const uploadMany = async (fl: FileList | null) => {
    if (!fl?.length) return;
    const arr = Array.from(fl).slice(0, 60);
    setBulk({ done: 0, total: arr.length, error: "" });
    const added: Motif[] = [];
    for (const f of arr) {
      try {
        const url = await uploadImage(f, { trim: true, max: 1600 });
        const name = f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
        added.push({ id: newId(f.name), name: { de: name, ar: name }, light: url, dark: url, active: true });
      } catch (e) {
        setBulk((b) => (b ? { ...b, error: `${f.name}: ${e instanceof Error ? e.message : "فشل"}` } : b));
      }
      setBulk((b) => (b ? { ...b, done: b.done + 1 } : b));
    }
    change([...list, ...added]);
    setTimeout(() => setBulk((b) => (b && !b.error ? null : b)), 1500);
  };

  const onSave = async () => {
    const r = await saveMotifs(list);
    if (r.ok) {
      setDirty(false);
      router.refresh();
    }
    return r;
  };

  return (
    <div className="space-y-6 pb-24">
      <Card
        title={`التصاميم (${list.filter((m) => m.active).length} ظاهر من ${list.length})`}
        action={
          <div className="flex gap-2">
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => files.current?.click()} disabled={!!bulk && bulk.done < bulk.total}>
              {bulk && bulk.done < bulk.total ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              رفع عدة تصاميم
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-sm bg-[#054239] text-white hover:bg-[#0b6456]"
              onClick={() => change([...list, { id: newId("tasmim"), name: { de: "", ar: "" }, light: "", dark: "", active: true }])}
            >
              <Plus className="size-3.5" /> تصميم جديد
            </button>
          </div>
        }
      >
        <input ref={files} type="file" accept="image/png,image/webp" multiple className="hidden" onChange={(e) => void uploadMany(e.target.files)} />
        {bulk ? (
          <p className="mb-4 rounded-lg bg-[#daf2e6] px-3 py-2 text-sm text-[#054239]">
            {bulk.done < bulk.total ? `جارٍ الرفع… ${bulk.done} / ${bulk.total}` : `تم رفع ${bulk.total} – لا تنسَ الحفظ وتعديل الأسماء.`}
            {bulk.error ? <span className="block text-red-700">{bulk.error}</span> : null}
          </p>
        ) : null}
        <p className="mb-4 text-sm text-stone-dark">
          نصيحة: «للأقمشة الفاتحة» تصميم بألوان داكنة، و«للأقمشة الداكنة» نسخة فاتحة (مثلاً أبيض بدل أسود). إذا رفعت نسخة واحدة تُستخدم للجميع. الحواف الشفافة تُقص تلقائياً.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((m, i) => (
            <div key={m.id} className={`rounded-xl border p-4 transition ${m.active ? "border-ink/10" : "border-dashed border-ink/20 opacity-60"}`}>
              <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg">
                <div className="grid aspect-square place-items-center bg-[#f4f2ed] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.dark || m.light ? <img src={m.dark || m.light} alt="" className="max-h-full max-w-full object-contain" /> : null}
                </div>
                <div className="grid aspect-square place-items-center bg-[#1d1d1f] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.light || m.dark ? <img src={m.light || m.dark} alt="" className="max-h-full max-w-full object-contain" /> : null}
                </div>
              </div>
              <input className="adm-input mb-3 w-full" dir="rtl" placeholder="اسم التصميم" value={m.name.ar} onChange={(e) => set(i, { name: { ...m.name, ar: e.target.value } })} />
              <div className="divide-y divide-ink/[0.06] rounded-lg border border-ink/10">
                <SlotRow label="للأقمشة الفاتحة" swatch="#f4f2ed" value={m.dark} onChange={(dark) => set(i, { dark })} />
                <SlotRow label="للأقمشة الداكنة" swatch="#1d1d1f" value={m.light} onChange={(light) => set(i, { light })} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink/[0.06] pt-3">
                <Toggle checked={m.active} onChange={(active) => set(i, { active })} label="ظاهر" />
                <div className="flex gap-1">
                  <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => move(i, -1)} disabled={i === 0} title="للأعلى">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => move(i, 1)} disabled={i === list.length - 1} title="للأسفل">
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn-ghost adm-btn-sm text-red-700"
                    onClick={() => confirm(`حذف «${m.name.ar || "التصميم"}»؟`) && change(list.filter((_, j) => j !== i))}
                    title="حذف"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <SaveBar onSave={onSave} dirty={dirty} />
    </div>
  );
}

/** Eine Zeile je Fassung: Farbfeld, Bezeichnung, Hochladen/Ersetzen, Entfernen */
function SlotRow({ label, swatch, value, onChange }: { label: string; swatch: string; value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    setBusy(true);
    try {
      onChange(await uploadImage(f, { trim: true, max: 1600 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الرفع.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2.5">
        <span className="size-4 shrink-0 rounded-full ring-1 ring-ink/15" style={{ background: swatch }} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
        {!value ? <span className="text-xs text-stone-dark">النسخة الأخرى</span> : null}
        <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          {value ? "استبدال" : "رفع"}
        </button>
        {value ? (
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" onClick={() => onChange("")} title="حذف هذه النسخة">
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      <input ref={input} type="file" accept="image/png,image/webp" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
  );
}
