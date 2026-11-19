/**
 * Startseite: ruhiger Hinweis auf die Kollektion zum Tag der Befreiung (shop.quickdesign24.de).
 * Reines Server-Markup – lädt kein Shop-JavaScript.
 * TODO(Inhaber): Nach dem 8.12.2026 wieder aus src/app/(site)/page.tsx entfernen.
 */
import Image from "next/image";
import { WavingFlag } from "@/components/brand/WavingFlag";

const SHOP = "https://shop.quickdesign24.de";
const items = [
  { src: "/shop/tshirt-hurriya-weiss.webp", label: "T-Shirts", href: `${SHOP}/ar#kollektion` },
  { src: "/shop/hoodie-wahid-schwarz.webp", label: "Hoodies", href: `${SHOP}/ar#kollektion` },
  { src: "/shop/fahne.webp", label: "Fahnen & Banner", href: `${SHOP}/ar/produkt/fahne-revolution` },
  { src: "/shop/sticker.webp", label: "Sticker", href: `${SHOP}/ar/produkt/sticker-set` },
];

export default function ShopBanner() {
  return (
    <section aria-label="Kollektion zum Tag der Befreiung" className="bg-ink px-5 py-16 text-paper sm:px-9 md:py-24">
      <div className="mx-auto max-w-[1200px] rounded-[2rem] bg-paper/[0.04] p-6 ring-1 ring-paper/10 sm:p-10 md:p-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="flex items-center gap-2.5 text-sm text-paper/60">
              <WavingFlag className="h-4 w-auto" amp={4} dur={3} />
              Tag der Befreiung · 8. Dezember
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              Zwei Jahre freies Syrien.
            </h2>
            <p className="mt-4 text-paper/65">Unsere kleine Kollektion zum Jahrestag – gedruckt in Saarbrücken.</p>
          </div>
          <a href={SHOP} className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full bg-paper px-6 font-medium text-ink transition-colors hover:bg-[#3fbf7a] md:self-auto">
            Zum Shop <span aria-hidden>→</span>
          </a>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {items.map((it) => (
            <li key={it.label}>
              <a href={it.href} className="group block">
                <span className="block overflow-hidden rounded-2xl bg-paper/[0.06]">
                  <Image
                    src={it.src}
                    alt={it.label}
                    width={600}
                    height={600}
                    sizes="(min-width: 768px) 280px, 45vw"
                    className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </span>
                <span className="mt-3 block text-sm text-paper/70 transition-colors group-hover:text-paper">{it.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
