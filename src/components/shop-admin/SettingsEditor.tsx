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
      <Card title="Vorbestellung (Frühbucher-Rabatt)">
        <div className="space-y-5">
          <Toggle
            checked={s.preorder.enabled}
            onChange={(v) => up((x) => ({ ...x, preorder: { ...x.preorder, enabled: v } }))}
            label="Vorbestellrabatt aktiv"
            hint="Erscheint als Leiste oben im Shop, als Badge an jedem Produkt und als Rabatt an der Kasse."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="adm-label">Rabatt</p>
              <NumberInput value={s.preorder.pct} max={90} suffix="%" onChange={(pct) => up((x) => ({ ...x, preorder: { ...x.preorder, pct } }))} />
            </div>
            <div>
              <p className="adm-label">Gültig bis einschließlich</p>
              <input type="date" className="adm-input w-full" value={s.preorder.until} onChange={(e) => up((x) => ({ ...x, preorder: { ...x.preorder, until: e.target.value } }))} />
            </div>
          </div>
          <Toggle
            checked={s.preorder.combine}
            onChange={(v) => up((x) => ({ ...x, preorder: { ...x.preorder, combine: v } }))}
            label="Mit anderen Angeboten kombinierbar"
            hint="Aus: Der Kunde bekommt automatisch das günstigere – Vorbestellrabatt oder die anderen Angebote. An: Der Vorbestellrabatt kommt zusätzlich obendrauf."
          />
        </div>
      </Card>

      <Card title="Versand">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="adm-label">Standardversand</p>
            <MoneyInput cents={s.shipping.standardCents} onChange={(c) => up((x) => ({ ...x, shipping: { ...x.shipping, standardCents: c } }))} />
          </div>
          <div>
            <p className="adm-label">Kostenlos ab (0 = nie)</p>
            <MoneyInput cents={s.shipping.freeFromCents} onChange={(c) => up((x) => ({ ...x, shipping: { ...x.shipping, freeFromCents: c } }))} />
          </div>
          <div>
            <p className="adm-label">Lieferzeit (Werktage)</p>
            <input className="adm-input w-full" value={s.shipping.deliveryDays} onChange={(e) => up((x) => ({ ...x, shipping: { ...x.shipping, deliveryDays: e.target.value } }))} placeholder="3–5" />
          </div>
        </div>
      </Card>

      <Card title="Express">
        <div className="space-y-4">
          <Toggle checked={s.shipping.express.enabled} onChange={(v) => up((x) => ({ ...x, shipping: { ...x.shipping, express: { ...x.shipping.express, enabled: v } } }))} label="Express-Versand anbieten" hint="Bevorzugte Produktion + schneller Versand. Der Kunde wählt Express an der Kasse." />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="adm-label">Preis Express</p>
              <MoneyInput cents={s.shipping.express.cents} onChange={(c) => up((x) => ({ ...x, shipping: { ...x.shipping, express: { ...x.shipping.express, cents: c } } }))} />
            </div>
            <div>
              <p className="adm-label">Lieferzeit Express (Werktage)</p>
              <input className="adm-input w-full" value={s.shipping.express.days} onChange={(e) => up((x) => ({ ...x, shipping: { ...x.shipping, express: { ...x.shipping.express, days: e.target.value } } }))} placeholder="1–2" />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Abholung">
        <div className="space-y-4">
          <Toggle checked={s.shipping.pickup.enabled} onChange={(v) => up((x) => ({ ...x, shipping: { ...x.shipping, pickup: { ...x.shipping.pickup, enabled: v } } }))} label="Kostenlose Abholung anbieten" />
          <div>
            <p className="adm-label">Abholadresse</p>
            <input className="adm-input w-full" value={s.shipping.pickup.address} onChange={(e) => up((x) => ({ ...x, shipping: { ...x.shipping, pickup: { ...x.shipping.pickup, address: e.target.value } } }))} />
          </div>
        </div>
      </Card>

      <Card title="Termine & Kontakt">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="adm-label">Jahrestag (Countdown)</p>
            <input type="date" className="adm-input w-full" value={s.campaign.anniversary} onChange={(e) => up((x) => ({ ...x, campaign: { ...x.campaign, anniversary: e.target.value } }))} />
          </div>
          <div>
            <p className="adm-label">Letzter Bestelltag (Lieferung vor dem 8.12.)</p>
            <input type="date" className="adm-input w-full" value={s.campaign.lastOrderDay} onChange={(e) => up((x) => ({ ...x, campaign: { ...x.campaign, lastOrderDay: e.target.value } }))} />
          </div>
          <div>
            <p className="adm-label">WhatsApp-Nummer (nur Ziffern, mit 49)</p>
            <input className="adm-input w-full tabular-nums" value={s.whatsapp} onChange={(e) => up((x) => ({ ...x, whatsapp: e.target.value.replace(/\D/g, "") }))} />
          </div>
        </div>
      </Card>
    </>
  );

  const content = (
    <>
      <Card title="Startseite – großer Bereich oben (Hero)">
        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-5">
            <LField label="Zeile über dem Titel" value={s.hero.eyebrow} onChange={(v) => up((x) => ({ ...x, hero: { ...x.hero, eyebrow: v } }))} />
            <LField label="Titel" value={s.hero.title} onChange={(v) => up((x) => ({ ...x, hero: { ...x.hero, title: v } }))} />
            <LField label="Text" value={s.hero.text} onChange={(v) => up((x) => ({ ...x, hero: { ...x.hero, text: v } }))} multiline />
          </div>
          <div>
            <ImageField label="Großes Bild (optional)" value={s.hero.image} onChange={(image) => up((x) => ({ ...x, hero: { ...x.hero, image } }))} />
            <p className="mt-2 text-xs text-stone-dark">Optional: großes Bild unter dem Titel (z. B. Foto vom Laden oder von einer Feier). Ideal: Querformat, mindestens 2400 px breit.</p>
          </div>
        </div>
      </Card>

      <Card title="Geschichte – „Ein Tag, den wir nie vergessen“">
        <div className="space-y-5">
          <LField label="Zeile über dem Titel" value={s.story.eyebrow} onChange={(v) => up((x) => ({ ...x, story: { ...x.story, eyebrow: v } }))} />
          <LField label="Titel" value={s.story.title} onChange={(v) => up((x) => ({ ...x, story: { ...x.story, title: v } }))} />
          {s.story.paragraphs.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <LField label={`Absatz ${i + 1}`} value={p} multiline onChange={(v) => up((x) => ({ ...x, story: { ...x.story, paragraphs: x.story.paragraphs.map((y, j) => (j === i ? v : y)) } }))} />
              </div>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm mt-6 text-red-700" onClick={() => up((x) => ({ ...x, story: { ...x.story, paragraphs: x.story.paragraphs.filter((_, j) => j !== i) } }))}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up((x) => ({ ...x, story: { ...x.story, paragraphs: [...x.story.paragraphs, { de: "", ar: "" }] } }))}>
            <Plus className="size-3.5" /> Absatz
          </button>
          <LField label="Zitat" value={s.story.quote} onChange={(v) => up((x) => ({ ...x, story: { ...x.story, quote: v } }))} />
        </div>
      </Card>

      <Card
        title="Fotos der Geschichte (Demonstrationen, Feiern)"
        action={
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => up((x) => ({ ...x, story: { ...x.story, images: [...x.story.images, { url: "", caption: { de: "", ar: "" }, credit: "" }] } }))}>
            <Plus className="size-3.5" /> Foto
          </button>
        }
      >
        <p className="mb-4 text-sm text-stone-dark">Bis zu 6 Fotos werden als Collage gezeigt – das erste groß. Bitte nur Fotos mit Nutzungsrecht verwenden und den Urheber angeben.</p>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {s.story.images.map((im, i) => {
            const set = (patch: Partial<typeof im>) => up((x) => ({ ...x, story: { ...x.story, images: x.story.images.map((y, j) => (j === i ? { ...y, ...patch } : y)) } }));
            return (
              <div key={i} className="space-y-3 rounded-xl border border-ink/10 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">Foto {i + 1}{i === 0 ? " (groß)" : ""}</span>
                  <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm text-red-700" onClick={() => up((x) => ({ ...x, story: { ...x.story, images: x.story.images.filter((_, j) => j !== i) } }))}>
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <ImageField value={im.url} onChange={(url) => set({ url })} />
                <input className="adm-input w-full" placeholder="Bildunterschrift (DE)" value={im.caption.de} onChange={(e) => set({ caption: { ...im.caption, de: e.target.value } })} />
                <input className="adm-input w-full" dir="rtl" placeholder="التعليق (AR)" value={im.caption.ar} onChange={(e) => set({ caption: { ...im.caption, ar: e.target.value } })} />
                <input className="adm-input w-full text-xs" placeholder="Foto: Name, Lizenz" value={im.credit} onChange={(e) => set({ credit: e.target.value })} />
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
