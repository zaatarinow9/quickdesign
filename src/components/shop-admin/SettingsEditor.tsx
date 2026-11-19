"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveSettings } from "@/app/shop-admin/actions";
import type { ShopSettings } from "@/lib/shop/schema";
import { Card } from "@/components/admin/ui";
import { ImageField, LField, MoneyInput, NumberInput, SaveBar, Toggle } from "./fields";

export function SettingsEditor({ initial, mode }: { initial: ShopSettings; mode: "shipping" | "content" }) {
  const router = useRouter();
  const [s, setS] = useState<ShopSettings>(initial);
  const [dirty, setDirty] = useState(false);
  const up = (fn: (x: ShopSettings) => ShopSettings) => {
    setS((x) => fn(structuredClone(x)));
    setDirty(true);
  };

  const shipping = (
    <>
      <Card title="الطلب المسبق (خصم الحجز المبكر)">
        <div className="space-y-5">
          <Toggle
            checked={s.preorder.enabled}
            onChange={(v) => up((x) => ({ ...x, preorder: { ...x.preorder, enabled: v } }))}
            label="تفعيل خصم الطلب المسبق"
            hint="يظهر بشريط أعلى المتجر، وكشارة على كل منتج، وكخصم عند الدفع."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="adm-label">نسبة الخصم</p>
              <NumberInput value={s.preorder.pct} max={90} suffix="%" onChange={(pct) => up((x) => ({ ...x, preorder: { ...x.preorder, pct } }))} />
            </div>
            <div>
              <p className="adm-label">صالح حتى تاريخ (شاملاً)</p>
              <input type="date" className="adm-input w-full" value={s.preorder.until} onChange={(e) => up((x) => ({ ...x, preorder: { ...x.preorder, until: e.target.value } }))} />
            </div>
          </div>
          <Toggle
            checked={s.preorder.combine}
            onChange={(v) => up((x) => ({ ...x, preorder: { ...x.preorder, combine: v } }))}
            label="يُجمع مع العروض الأخرى"
            hint="مطفأ: يحصل الزبون تلقائياً على الأفضل له – خصم الطلب المسبق أو العروض الأخرى. مفعّل: يُضاف خصم الطلب المسبق فوق العروض."
          />
        </div>
      </Card>

      <Card title="الشحن">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="adm-label">الشحن العادي</p>
            <MoneyInput cents={s.shipping.standardCents} onChange={(c) => up((x) => ({ ...x, shipping: { ...x.shipping, standardCents: c } }))} />
          </div>
          <div>
            <p className="adm-label">مجاني فوق (0 = أبداً)</p>
            <MoneyInput cents={s.shipping.freeFromCents} onChange={(c) => up((x) => ({ ...x, shipping: { ...x.shipping, freeFromCents: c } }))} />
          </div>
          <div>
            <p className="adm-label">مدة التوصيل (أيام عمل)</p>
            <input className="adm-input w-full" value={s.shipping.deliveryDays} onChange={(e) => up((x) => ({ ...x, shipping: { ...x.shipping, deliveryDays: e.target.value } }))} placeholder="3–5" />
          </div>
        </div>
      </Card>

      <Card title="الشحن السريع (Express)">
        <div className="space-y-4">
          <Toggle checked={s.shipping.express.enabled} onChange={(v) => up((x) => ({ ...x, shipping: { ...x.shipping, express: { ...x.shipping.express, enabled: v } } }))} label="تفعيل الشحن السريع" hint="أولوية بالطباعة + شحن سريع. الزبون يختاره عند الدفع." />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="adm-label">سعر الشحن السريع</p>
              <MoneyInput cents={s.shipping.express.cents} onChange={(c) => up((x) => ({ ...x, shipping: { ...x.shipping, express: { ...x.shipping.express, cents: c } } }))} />
            </div>
            <div>
              <p className="adm-label">مدة الشحن السريع (أيام عمل)</p>
              <input className="adm-input w-full" value={s.shipping.express.days} onChange={(e) => up((x) => ({ ...x, shipping: { ...x.shipping, express: { ...x.shipping.express, days: e.target.value } } }))} placeholder="1–2" />
            </div>
          </div>
        </div>
      </Card>

      <Card title="الاستلام من المحل">
        <div className="space-y-4">
          <Toggle checked={s.shipping.pickup.enabled} onChange={(v) => up((x) => ({ ...x, shipping: { ...x.shipping, pickup: { ...x.shipping.pickup, enabled: v } } }))} label="تفعيل الاستلام المجاني" />
          <div>
            <p className="adm-label">عنوان الاستلام</p>
            <input className="adm-input w-full" value={s.shipping.pickup.address} onChange={(e) => up((x) => ({ ...x, shipping: { ...x.shipping, pickup: { ...x.shipping.pickup, address: e.target.value } } }))} />
          </div>
        </div>
      </Card>

      <Card title="المواعيد والتواصل">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="adm-label">تاريخ الذكرى (العدّاد)</p>
            <input type="date" className="adm-input w-full" value={s.campaign.anniversary} onChange={(e) => up((x) => ({ ...x, campaign: { ...x.campaign, anniversary: e.target.value } }))} />
          </div>
          <div>
            <p className="adm-label">آخر يوم للطلب (للتوصيل قبل 8.12)</p>
            <input type="date" className="adm-input w-full" value={s.campaign.lastOrderDay} onChange={(e) => up((x) => ({ ...x, campaign: { ...x.campaign, lastOrderDay: e.target.value } }))} />
          </div>
          <div>
            <p className="adm-label">رقم واتساب (أرقام فقط، مع 49)</p>
            <input className="adm-input w-full tabular-nums" value={s.whatsapp} onChange={(e) => up((x) => ({ ...x, whatsapp: e.target.value.replace(/\D/g, "") }))} />
          </div>
        </div>
      </Card>
    </>
  );

  const sectionNames: Record<string, string> = { tshirts: "تيشرتات", hoodies: "هوديات", flags: "أعلام ولافتات", stickers: "ستيكرات وملصقات" };
  const content = (
    <>
      <Card
        title="صور السلايدر بالصفحة الرئيسية"
        action={
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            disabled={s.slides.length >= 6}
            onClick={() => up((x) => ({ ...x, slides: [...x.slides, { image: "", title: { de: "", ar: "" }, text: { de: "", ar: "" }, link: "", credit: "" }] }))}
          >
            <Plus className="size-3.5" /> صورة
          </button>
        }
      >
        <p className="mb-4 text-sm text-stone-dark">صور عريضة (الأفضل 2400 × 1000 بكسل) مع عنوان بالنص. تتبدل تلقائياً كل 5 ثوانٍ. استخدم فقط صوراً لديك حق استخدامها واذكر المصوّر.</p>
        <div className="space-y-5">
          {s.slides.map((sl, i) => {
            const set = (patch: Partial<typeof sl>) => up((x) => ({ ...x, slides: x.slides.map((y, j) => (j === i ? { ...y, ...patch } : y)) }));
            return (
              <div key={i} className="grid gap-4 rounded-xl border border-ink/10 p-4 lg:grid-cols-[14rem_1fr]">
                <ImageField value={sl.image} onChange={(image) => set({ image })} />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">صورة {i + 1}</span>
                    <div className="flex gap-1">
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" disabled={i === 0} onClick={() => up((x) => { const n = [...x.slides]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return { ...x, slides: n }; })}>↑</button>
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" onClick={() => up((x) => ({ ...x, slides: x.slides.filter((_, j) => j !== i) }))}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <LField label="العنوان" value={sl.title} onChange={(title) => set({ title })} />
                  <LField label="العنوان الفرعي" value={sl.text} onChange={(text) => set({ text })} />
                  <label className="block">
                    <span className="adm-label">المصوّر / الرخصة (يظهر صغيراً على الصورة)</span>
                    <input className="adm-input w-full" dir="ltr" value={sl.credit ?? ""} onChange={(e) => set({ credit: e.target.value })} />
                  </label>
                  <div>
                    <p className="adm-label">وجهة الزر</p>
                    <select className="adm-input w-full" value={sl.link} onChange={(e) => set({ link: e.target.value })}>
                      <option value="">الصفحة الرئيسية – المنتجات</option>
                      {Object.entries(sectionNames).map(([k, v]) => (
                        <option key={k} value={`/qism/${k}`}>قسم: {v}</option>
                      ))}
                      <option value="/hikaya">الحكاية</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="الأقسام (البطاقات وصفحات الأقسام)">
        <div className="grid gap-5 md:grid-cols-2">
          {s.sections.map((sec, i) => {
            const set = (patch: Partial<typeof sec>) => up((x) => ({ ...x, sections: x.sections.map((y, j) => (j === i ? { ...y, ...patch } : y)) }));
            return (
              <div key={sec.slug} className="space-y-3 rounded-xl border border-ink/10 p-4">
                <p className="text-sm font-medium">{sectionNames[sec.slug]}</p>
                <ImageField label="صورة القسم (عريضة)" value={sec.image} onChange={(image) => set({ image })} />
                <LField label="العنوان" value={sec.title} onChange={(title) => set({ title })} />
                <LField label="العنوان الفرعي" value={sec.text} onChange={(text) => set({ text })} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="الحكاية – «يومٌ لن ننساه»">
        <div className="space-y-5">
          <LField label="سطر فوق العنوان" value={s.story.eyebrow} onChange={(v) => up((x) => ({ ...x, story: { ...x.story, eyebrow: v } }))} />
          <LField label="العنوان" value={s.story.title} onChange={(v) => up((x) => ({ ...x, story: { ...x.story, title: v } }))} />
          {s.story.paragraphs.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <LField label={`فقرة ${i + 1}`} value={p} multiline onChange={(v) => up((x) => ({ ...x, story: { ...x.story, paragraphs: x.story.paragraphs.map((y, j) => (j === i ? v : y)) } }))} />
              </div>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm mt-6 text-red-700" onClick={() => up((x) => ({ ...x, story: { ...x.story, paragraphs: x.story.paragraphs.filter((_, j) => j !== i) } }))}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up((x) => ({ ...x, story: { ...x.story, paragraphs: [...x.story.paragraphs, { de: "", ar: "" }] } }))}>
            <Plus className="size-3.5" /> فقرة
          </button>
          <LField label="الاقتباس" value={s.story.quote} onChange={(v) => up((x) => ({ ...x, story: { ...x.story, quote: v } }))} />
          <div className="max-w-xs">
            <ImageField label="صورة بجانب الحكاية (الرئيسية)" value={s.story.image} onChange={(image) => up((x) => ({ ...x, story: { ...x.story, image } }))} />
          </div>
        </div>
      </Card>

      <Card
        title="صور الحكاية (المظاهرات والاحتفالات)"
        action={
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up((x) => ({ ...x, story: { ...x.story, images: [...x.story.images, { url: "", caption: { de: "", ar: "" }, credit: "" }] } }))}>
            <Plus className="size-3.5" /> صورة
          </button>
        }
      >
        <p className="mb-4 text-sm text-stone-dark">تظهر الصور كمجموعة في صفحة الحكاية – الأولى كبيرة. استخدم فقط صوراً لديك حق استخدامها واذكر المصوّر.</p>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {s.story.images.map((im, i) => {
            const set = (patch: Partial<typeof im>) => up((x) => ({ ...x, story: { ...x.story, images: x.story.images.map((y, j) => (j === i ? { ...y, ...patch } : y)) } }));
            return (
              <div key={i} className="space-y-3 rounded-xl border border-ink/10 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">صورة {i + 1}{i === 0 ? " (كبيرة)" : ""}</span>
                  <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" onClick={() => up((x) => ({ ...x, story: { ...x.story, images: x.story.images.filter((_, j) => j !== i) } }))}>
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <ImageField value={im.url} onChange={(url) => set({ url })} />
                <input className="adm-input w-full" dir="rtl" placeholder="تعليق الصورة" value={im.caption.ar} onChange={(e) => set({ caption: { ...im.caption, ar: e.target.value } })} />
                <input className="adm-input w-full text-xs" placeholder="المصوّر والرخصة" value={im.credit} onChange={(e) => set({ credit: e.target.value })} />
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );

  return (
    <div className="space-y-6">
      {mode === "shipping" ? shipping : content}
      <SaveBar
        dirty={dirty}
        onSave={async () => {
          const clean = { ...s, story: { ...s.story, images: s.story.images.filter((im) => im.url) } };
          const r = await saveSettings(clean);
          if (r.ok) {
            setDirty(false);
            router.refresh();
          }
          return r;
        }}
      />
    </div>
  );
}
