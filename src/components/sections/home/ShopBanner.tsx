/**
 * Startseite: Auftritt der Kollektion zum Tag der Befreiung (shop.quickdesign24.de).
 * Reines Server-Markup + CSS/SMIL-Animation – lädt kein Shop-JavaScript.
 * TODO(Inhaber): Nach dem 8.12.2026 wieder aus src/app/(site)/page.tsx entfernen.
 */
import Image from "next/image";
import { WavingFlag } from "@/components/brand/WavingFlag";

const SHOP = "https://shop.quickdesign24.de";
const items = [
  { src: "/shop/tshirt-hurriya-weiss.webp", alt: "T-Shirt „Hurriya – Freiheit“", r: "-6deg", cls: "left-[2%] top-[18%] w-[38%]", delay: "0s" },
  { src: "/shop/hoodie-wahid-schwarz.webp", alt: "Hoodie „Wahid, wahid, wahid“", r: "5deg", cls: "right-[0%] top-[4%] w-[42%]", delay: "-2.5s" },
  { src: "/shop/sticker.webp", alt: "Sticker-Set 8.12.", r: "-3deg", cls: "right-[14%] bottom-[0%] w-[34%]", delay: "-5s" },
];

export default function ShopBanner() {
  return (
    <section aria-label="Kollektion zum Tag der Befreiung" className="relative overflow-hidden bg-[#070807] text-paper">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(11,122,62,0.28),transparent_55%),radial-gradient(ellipse_at_90%_80%,rgba(206,17,38,0.12),transparent_50%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 flex h-1">
        <span className="flex-1 bg-[#0b7a3e]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-black" />
      </div>

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-20 sm:px-9 md:py-28 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <a href={SHOP} className="inline-flex items-center gap-3 rounded-full bg-paper/[0.06] py-1.5 pl-2 pr-4 text-sm text-paper/80 ring-1 ring-paper/15 hover:text-paper">
            <WavingFlag className="h-5 w-auto" amp={5} dur={2.6} />
            Tag der Befreiung · 8. Dezember
          </a>
          <h2 className="mt-7 font-[family-name:var(--font-display)] text-[2.8rem] font-medium leading-[1.02] tracking-tight sm:text-7xl">
            Zwei Jahre
            <br />
            <span className="bg-gradient-to-r from-[#3fbf7a] via-paper to-paper bg-clip-text text-transparent">freies Syrien.</span>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-paper/70">
            Unsere Kollektion zum zweiten Jahrestag: T-Shirts, Hoodies, Fahnen, Banner, Folien und Sticker – gestaltet und gedruckt hier in Saarbrücken. Jetzt vorbestellen und sparen.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href={SHOP} className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 font-medium text-ink transition hover:bg-[#3fbf7a]">
              Zur Kollektion <span aria-hidden>→</span>
            </a>
            <a href={`${SHOP}/ar`} lang="ar" className="inline-flex h-12 items-center rounded-full px-6 font-medium text-paper ring-1 ring-paper/25 transition hover:bg-paper/10">
              المتجر بالعربي
            </a>
          </div>
          <ul className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-paper/10 pt-6 text-sm text-paper/60">
            <li>
              <span className="block text-2xl font-medium text-paper">2 + 1</span>
              auf Textilien
            </li>
            <li>
              <span className="block text-2xl font-medium text-paper">Express</span>
              in 1–2 Tagen
            </li>
            <li>
              <span className="block text-2xl font-medium text-paper">Abholung</span>
              in Saarbrücken
            </li>
          </ul>
        </div>

        <a href={SHOP} className="relative block aspect-square w-full" aria-label="Zum Shop">
          <WavingFlag className="absolute left-[8%] top-[30%] w-[84%] opacity-90 drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]" amp={6} dur={3.6} />
          {items.map((it) => (
            <span
              key={it.src}
              className={`qd-float absolute overflow-hidden rounded-2xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-paper/10 ${it.cls}`}
              style={{ ["--r" as string]: it.r, animationDelay: it.delay }}
            >
              <Image src={it.src} alt={it.alt} width={600} height={600} sizes="(min-width: 1024px) 280px, 40vw" className="h-auto w-full" />
            </span>
          ))}
        </a>
      </div>
    </section>
  );
}
