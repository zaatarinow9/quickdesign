"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveProduct } from "@/app/shop-admin/actions";
import { kinds, type Product } from "@/lib/shop/schema";
import { Card } from "@/components/admin/ui";
import { ImageField, LField, MoneyInput, NumberInput, SaveBar, Toggle } from "./fields";

const kindLabel: Record<string, string> = { tshirt: "T-Shirt", hoodie: "Hoodie", flag: "Fahne", banner: "Banner", foil: "Folie / Aufkleber", sticker: "Sticker", other: "Sonstiges" };
const SIZE_PRESET = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
const empty = { de: "", ar: "" };

export function ProductEditor({ initial, isNew, base, defaults }: { initial: Product; isNew: boolean; base: string; defaults: Product | null }) {
  const router = useRouter();
  const [p, setP] = useState<Product>(initial);
  const [dirty, setDirty] = useState(false);
  const [allPrice, setAllPrice] = useState(initial.variants[0]?.priceCents ?? 0);
  const up = (patch: Partial<Product>) => {
    setP((x) => ({ ...x, ...patch }));
    setDirty(true);
  };
  const textile = p.category === "textil";
  const fallbackColor = (id: string) => defaults?.colors.find((c) => c.id === id);
  const fallbackVariant = (id: string) => defaults?.variants.find((v) => v.id === id)?.image;

  const onSave = async () => {
    const r = await saveProduct(p, isNew ? null : initial.id);
    if (r.ok) {
      setDirty(false);
      if (isNew || initial.id !== p.id) router.replace(`${base}/produkte/${p.id}`);
      else router.refresh();
    }
    return r;
  };

  return (
    <div className="space-y-6">
      <Card title="Grunddaten">
        <div className="space-y-5">
          <LField label="Name" value={p.name} onChange={(name) => up({ name })} />
          <LField label="Kurzbeschreibung (unter dem Namen)" value={p.tagline} onChange={(tagline) => up({ tagline })} />
          <LField label="Beschreibung" value={p.description} onChange={(description) => up({ description })} multiline rows={4} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="adm-label">Kategorie</label>
              <select className="adm-input w-full" value={p.category} onChange={(e) => up({ category: e.target.value as Product["category"] })}>
                <option value="textil">Textilien (Größen)</option>
                <option value="druck">Druck (Formate)</option>
              </select>
            </div>
            <div>
              <label className="adm-label">Art</label>
              <select className="adm-input w-full" value={p.kind} onChange={(e) => up({ kind: e.target.value as Product["kind"] })}>
                {kinds.map((k) => (
                  <option key={k} value={k}>{kindLabel[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="adm-label">Adresse (URL-Kennung)</label>
              <input className="adm-input w-full font-mono text-sm" value={p.id} onChange={(e) => up({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) })} />
              <p className="mt-1 text-xs text-stone-dark">/produkt/{p.id}</p>
            </div>
            <div>
              <label className="adm-label">Max. Menge je Bestellung</label>
              <NumberInput value={p.maxQty} onChange={(maxQty) => up({ maxQty })} min={1} max={1000} />
            </div>
          </div>
          <div className="flex flex-wrap gap-8">
            <Toggle checked={p.active} onChange={(active) => up({ active })} label="Im Shop sichtbar" />
            <Toggle checked={p.featured} onChange={(featured) => up({ featured })} label="Hervorheben" />
          </div>
        </div>
      </Card>

      {/* Bilder */}
      <Card
        title={p.colors.length ? "Farben & Bilder" : "Bilder"}
        action={
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => up({ colors: [...p.colors, { id: `farbe-${p.colors.length + 1}`, name: { ...empty }, hex: "#1d1d1f", image: "", detail: "" }] })}
          >
            <Plus className="size-3.5" /> Farbe
          </button>
        }
      >
        {p.colors.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {p.colors.map((c, i) => {
              const set = (patch: Partial<typeof c>) => up({ colors: p.colors.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="rounded-xl border border-ink/10 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <input type="color" value={c.hex} onChange={(e) => set({ hex: e.target.value })} className="size-9 cursor-pointer rounded-lg border border-ink/10" />
                    <input className="adm-input flex-1" placeholder="Farbe (DE)" value={c.name.de} onChange={(e) => set({ name: { ...c.name, de: e.target.value }, id: c.id.startsWith("farbe-") ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || c.id : c.id })} />
                    <input className="adm-input w-28" dir="rtl" placeholder="اللون" value={c.name.ar} onChange={(e) => set({ name: { ...c.name, ar: e.target.value } })} />
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" onClick={() => up({ colors: p.colors.filter((_, j) => j !== i) })} title="Farbe entfernen">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <ImageField label="Hauptbild" value={c.image} onChange={(image) => set({ image })} fallback={fallbackColor(c.id)?.image} />
                    <ImageField label="Nahaufnahme (Motiv)" value={c.detail} onChange={(detail) => set({ detail })} fallback={fallbackColor(c.id)?.detail} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid max-w-md grid-cols-2 gap-4">
            <ImageField label="Produktbild" value={p.image} onChange={(image) => up({ image })} fallback={defaults?.image} />
            <ImageField label="Nahaufnahme" value={p.detail} onChange={(detail) => up({ detail })} fallback={defaults?.detail} />
          </div>
        )}
        <div className="mt-6 border-t border-ink/[0.06] pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Weitere Bilder (Galerie)</p>
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up({ gallery: [...p.gallery, ""] })}>
              <Plus className="size-3.5" /> Bild
            </button>
          </div>
          {p.gallery.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {p.gallery.map((g, i) => (
                <ImageField key={i} value={g} onChange={(v) => up({ gallery: v ? p.gallery.map((x, j) => (j === i ? v : x)) : p.gallery.filter((_, j) => j !== i) })} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-dark">Z. B. echte Fotos, Detailaufnahmen oder Fotos vom Tragen.</p>
          )}
        </div>
      </Card>

      {/* Größen / Formate */}
      <Card
        title={textile ? "Größen & Preise" : "Formate, Preise & Bilder"}
        action={
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => up({ variants: [...p.variants, { id: `v${p.variants.length + 1}`, label: { ...empty }, priceCents: p.variants.at(-1)?.priceCents ?? 0, image: "", active: true }] })}
          >
            <Plus className="size-3.5" /> {textile ? "Größe" : "Format"}
          </button>
        }
      >
        {textile ? (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-ink/[0.03] p-3">
            <div>
              <p className="adm-label">Größen schnell hinzufügen</p>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_PRESET.map((s) => {
                  const has = p.variants.some((v) => v.id === s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`h-8 min-w-10 rounded-lg px-2 text-sm ring-1 ${has ? "bg-[#0b6b3a] text-white ring-[#0b6b3a]" : "ring-ink/15 hover:ring-ink/40"}`}
                      onClick={() =>
                        up({
                          variants: has
                            ? p.variants.filter((v) => v.id !== s)
                            : [...p.variants, { id: s, label: { de: s, ar: s }, priceCents: allPrice, image: "", active: true }].sort((a, b) => SIZE_PRESET.indexOf(a.id) - SIZE_PRESET.indexOf(b.id)),
                        })
                      }
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="w-32">
                <p className="adm-label">Preis für alle</p>
                <MoneyInput cents={allPrice} onChange={setAllPrice} />
              </div>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={() => up({ variants: p.variants.map((v) => ({ ...v, priceCents: allPrice })) })}>
                Übernehmen
              </button>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="adm-table w-full min-w-[640px]">
            <thead>
              <tr>
                <th>Kennung</th>
                <th>Bezeichnung (DE)</th>
                <th>Bezeichnung (AR)</th>
                <th className="w-32">Preis</th>
                {!textile ? <th>Bild</th> : null}
                <th>Aktiv</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {p.variants.map((v, i) => {
                const set = (patch: Partial<typeof v>) => up({ variants: p.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <tr key={i}>
                    <td><input className="adm-input w-24 font-mono text-sm" value={v.id} onChange={(e) => set({ id: e.target.value.replace(/\s/g, "").slice(0, 30) })} /></td>
                    <td><input className="adm-input w-full" value={v.label.de} onChange={(e) => set({ label: { ...v.label, de: e.target.value } })} /></td>
                    <td><input className="adm-input w-full" dir="rtl" value={v.label.ar} onChange={(e) => set({ label: { ...v.label, ar: e.target.value } })} /></td>
                    <td><MoneyInput cents={v.priceCents} onChange={(priceCents) => set({ priceCents })} /></td>
                    {!textile ? (
                      <td><ImageField size="sm" value={v.image} onChange={(image) => set({ image })} fallback={fallbackVariant(v.id)} /></td>
                    ) : null}
                    <td><Toggle checked={v.active} onChange={(active) => set({ active })} label="" /></td>
                    <td>
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" disabled={p.variants.length <= 1} onClick={() => up({ variants: p.variants.filter((_, j) => j !== i) })}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!textile ? <p className="mt-3 text-xs text-stone-dark">Tipp: Jedes Format kann ein eigenes Bild haben (z. B. Handfahne, 90 × 150, Großfahne). Ohne eigenes Bild wird das Produktbild gezeigt.</p> : null}
      </Card>

      {textile ? (
        <Card
          title="Maßtabelle (cm)"
          action={
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up({ sizeChart: [...p.sizeChart, { size: "", width: 0, length: 0 }] })}>
              <Plus className="size-3.5" /> Zeile
            </button>
          }
        >
          {p.sizeChart.length ? (
            <table className="adm-table w-full max-w-2xl">
              <thead>
                <tr><th>Größe</th><th>Breite</th><th>Länge</th><th>Ärmel</th><th /></tr>
              </thead>
              <tbody>
                {p.sizeChart.map((r, i) => {
                  const set = (patch: Partial<typeof r>) => up({ sizeChart: p.sizeChart.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                  return (
                    <tr key={i}>
                      <td><input className="adm-input w-20" value={r.size} onChange={(e) => set({ size: e.target.value.slice(0, 10) })} /></td>
                      <td><NumberInput value={r.width} onChange={(width) => set({ width })} max={500} /></td>
                      <td><NumberInput value={r.length} onChange={(length) => set({ length })} max={500} /></td>
                      <td><NumberInput value={r.sleeve ?? 0} onChange={(sleeve) => set({ sleeve: sleeve || undefined })} max={500} /></td>
                      <td>
                        <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" onClick={() => up({ sizeChart: p.sizeChart.filter((_, j) => j !== i) })}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-stone-dark">Keine Maßtabelle – im Shop wird dann keine angezeigt.</p>
          )}
        </Card>
      ) : null}

      <Card
        title="Details (Material, Pflege, Format …)"
        action={
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up({ details: [...p.details, { ...empty }] })}>
            <Plus className="size-3.5" /> Punkt
          </button>
        }
      >
        <div className="space-y-3">
          {p.details.map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <LField label={`Punkt ${i + 1}`} value={d} onChange={(v) => up({ details: p.details.map((x, j) => (j === i ? v : x)) })} />
              </div>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm mt-6 text-red-700" onClick={() => up({ details: p.details.filter((_, j) => j !== i) })}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <SaveBar onSave={onSave} dirty={dirty} />
    </div>
  );
}
