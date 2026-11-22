"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveProduct } from "@/app/shop-admin/actions";
import { kinds, type Product } from "@/lib/shop/schema";
import { Card } from "@/components/admin/ui";
import { ImageField, LField, MoneyInput, NumberInput, SaveBar, Toggle } from "./fields";

const kindLabel: Record<string, string> = { tshirt: "تيشرت", polo: "بولو", hoodie: "هودي", sweatshirt: "سويتشيرت (بدون قبّعة)", flag: "علم", banner: "لافتة", foil: "ملصق فينيل / سيارة", sticker: "ستيكر", other: "أخرى" };
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
      <Card title="البيانات الأساسية">
        <div className="space-y-5">
          <LField label="اسم المنتج" value={p.name} onChange={(name) => up({ name })} />
          <LField label="وصف قصير (تحت الاسم)" value={p.tagline} onChange={(tagline) => up({ tagline })} />
          <LField label="الوصف" value={p.description} onChange={(description) => up({ description })} multiline rows={4} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="adm-label">النوع الرئيسي</label>
              <select className="adm-input w-full" value={p.category} onChange={(e) => up({ category: e.target.value as Product["category"] })}>
                <option value="textil">ملابس (مقاسات)</option>
                <option value="druck">مطبوعات (أحجام)</option>
              </select>
            </div>
            <div>
              <label className="adm-label">الصنف</label>
              <select className="adm-input w-full" value={p.kind} onChange={(e) => up({ kind: e.target.value as Product["kind"] })}>
                {kinds.map((k) => (
                  <option key={k} value={k}>{kindLabel[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="adm-label">رابط المنتج</label>
              <input dir="ltr" className="adm-input w-full font-mono text-sm" value={p.id} onChange={(e) => up({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) })} />
              <p className="ltr mt-1 text-xs text-stone-dark">/produkt/{p.id}</p>
            </div>
            <div>
              <label className="adm-label">أقصى كمية بالطلب</label>
              <NumberInput value={p.maxQty} onChange={(maxQty) => up({ maxQty })} min={1} max={1000} />
            </div>
          </div>
          <div className="flex flex-wrap gap-8">
            <Toggle checked={p.active} onChange={(active) => up({ active })} label="ظاهر في المتجر" />
            <Toggle checked={p.featured} onChange={(featured) => up({ featured })} label="منتج مميز" />
          </div>
        </div>
      </Card>

      {/* Bilder */}
      {["tshirt", "polo", "hoodie", "sweatshirt"].includes(p.kind) ? (
        <Card title="التصميم الحر (الزبون يختار التصميم ومكان الطباعة)">
          <div className="space-y-4">
            <Toggle
              checked={p.custom.enabled}
              onChange={(enabled) => up({ custom: { ...p.custom, enabled } })}
              label="تفعيل اختيار التصميم"
              hint="يختار الزبون اللون، ثم الأمام أو الخلف أو الجهتين، ثم أي تصميم من «تصاميم الطباعة» ويراه فوراً على القطعة."
            />
            {p.custom.enabled ? (
              <>
                <label className="block max-w-xs">
                  <span className="adm-label">إضافة سعر للطباعة على الجهتين</span>
                  <MoneyInput cents={p.custom.extraSideCents} onChange={(extraSideCents) => up({ custom: { ...p.custom, extraSideCents } })} />
                </label>
                <p className="text-sm text-stone-dark">ارفع لكل لون صورة للقطعة فارغة من الأمام ومن الخلف (في قسم الألوان أدناه) – عليها يُركّب التصميم.</p>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card
        title={p.colors.length ? "الألوان والصور" : "الصور"}
        action={
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => up({ colors: [...p.colors, { id: `farbe-${Date.now().toString(36)}`, name: { ...empty }, hex: "#1d1d1f", image: "", detail: "", blankFront: "", blankBack: "" }] })}
          >
            <Plus className="size-3.5" /> لون
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
                    <input className="adm-input flex-1" dir="rtl" placeholder="اسم اللون" value={c.name.ar} onChange={(e) => set({ name: { ...c.name, ar: e.target.value } })} />
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" onClick={() => up({ colors: p.colors.filter((_, j) => j !== i) })} title="حذف اللون">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <ImageField label="الصورة الرئيسية" value={c.image} onChange={(image) => set({ image })} fallback={fallbackColor(c.id)?.image} />
                    <ImageField label="صورة قريبة للتصميم" value={c.detail} onChange={(detail) => set({ detail })} fallback={fallbackColor(c.id)?.detail} />
                    {p.custom.enabled ? (
                      <>
                        <ImageField label="القطعة فارغة – من الأمام" value={c.blankFront} onChange={(blankFront) => set({ blankFront })} fallback={fallbackColor(c.id)?.blankFront} />
                        <ImageField label="القطعة فارغة – من الخلف" value={c.blankBack} onChange={(blankBack) => set({ blankBack })} fallback={fallbackColor(c.id)?.blankBack} />
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid max-w-md grid-cols-2 gap-4">
            <ImageField label="صورة المنتج" value={p.image} onChange={(image) => up({ image })} fallback={defaults?.image} />
            <ImageField label="صورة قريبة" value={p.detail} onChange={(detail) => up({ detail })} fallback={defaults?.detail} />
          </div>
        )}
        <div className="mt-6 border-t border-ink/[0.06] pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">صور إضافية (معرض)</p>
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up({ gallery: [...p.gallery, ""] })}>
              <Plus className="size-3.5" /> صورة
            </button>
          </div>
          {p.gallery.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {p.gallery.map((g, i) => (
                <ImageField key={i} value={g} onChange={(v) => up({ gallery: v ? p.gallery.map((x, j) => (j === i ? v : x)) : p.gallery.filter((_, j) => j !== i) })} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-dark">مثلاً صور حقيقية للقطعة، أو صور قريبة، أو صور أثناء اللبس.</p>
          )}
        </div>
      </Card>

      {/* Größen / Formate */}
      <Card
        title={textile ? "المقاسات والأسعار" : "الأحجام والأسعار والصور"}
        action={
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => up({ variants: [...p.variants, { id: `v${p.variants.length + 1}`, label: { ...empty }, priceCents: p.variants.at(-1)?.priceCents ?? 0, image: "", active: true }] })}
          >
            <Plus className="size-3.5" /> {textile ? "مقاس" : "حجم"}
          </button>
        }
      >
        {textile ? (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-ink/[0.03] p-3">
            <div>
              <p className="adm-label">إضافة سريعة للمقاسات</p>
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
                <p className="adm-label">سعر موحّد للكل</p>
                <MoneyInput cents={allPrice} onChange={setAllPrice} />
              </div>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={() => up({ variants: p.variants.map((v) => ({ ...v, priceCents: allPrice })) })}>
                تطبيق
              </button>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="adm-table w-full min-w-[640px]">
            <thead>
              <tr>
                <th>المعرّف</th>
                <th>الاسم</th>
                <th className="w-32">السعر</th>
                {!textile ? <th>الصورة</th> : null}
                <th>فعّال</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {p.variants.map((v, i) => {
                const set = (patch: Partial<typeof v>) => up({ variants: p.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <tr key={i}>
                    <td><input dir="ltr" className="adm-input w-24 font-mono text-sm" value={v.id} onChange={(e) => set({ id: e.target.value.replace(/\s/g, "").slice(0, 30) })} /></td>
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
        {!textile ? <p className="mt-3 text-xs text-stone-dark">ملاحظة: كل حجم ممكن تكون إله صورة خاصة (مثلاً علم يدوي، 90 × 150، علم كبير). بدون صورة خاصة تظهر صورة المنتج.</p> : null}
      </Card>

      {textile ? (
        <Card
          title="جدول المقاسات (سم)"
          action={
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up({ sizeChart: [...p.sizeChart, { size: "", width: 0, length: 0 }] })}>
              <Plus className="size-3.5" /> سطر
            </button>
          }
        >
          {p.sizeChart.length ? (
            <table className="adm-table w-full max-w-2xl">
              <thead>
                <tr><th>المقاس</th><th>العرض</th><th>الطول</th><th>الكم</th><th /></tr>
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
            <p className="text-sm text-stone-dark">لا يوجد جدول مقاسات – لن يظهر في المتجر.</p>
          )}
        </Card>
      ) : null}

      <Card
        title="التفاصيل (الخامة، العناية، الحجم …)"
        action={
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up({ details: [...p.details, { ...empty }] })}>
            <Plus className="size-3.5" /> نقطة
          </button>
        }
      >
        <div className="space-y-3">
          {p.details.map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <LField label={`نقطة ${i + 1}`} value={d} onChange={(v) => up({ details: p.details.map((x, j) => (j === i ? v : x)) })} />
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
