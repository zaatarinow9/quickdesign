"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Slide = { image: string; title: string; text: string; href: string; credit?: string };

/** Breiter Bild-Slider mit Titel in der Mitte (wechselt automatisch, pausiert bei Hover) */
export function HeroSlider({ slides, cta }: { slides: Slide[]; cta: string }) {
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const n = slides.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    if (n < 2 || pause || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => go(1), 5500);
    return () => clearInterval(t);
  }, [n, pause, go]);
  if (!n) return null;

  return (
    <section className="relative h-[320px] overflow-hidden bg-[var(--green)] sm:h-[440px] lg:h-[540px]" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)} aria-roledescription="carousel">
      {slides.map((s, k) => (
        <div key={k} className={cn("absolute inset-0 transition-opacity duration-1000", k === i ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={k !== i}>
          <Image src={s.image} alt="" fill priority={k === 0} sizes="100vw" className={cn("object-cover", k === i && "ken")} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,40,35,0.45),rgba(5,25,22,0.72))]" />
          {s.credit ? <span className="absolute end-3 top-2 z-10 max-w-[70%] truncate text-[0.6rem] text-white/60" dir="ltr">{s.credit}</span> : null}
          <div className="relative flex h-full flex-col items-center justify-center px-14 text-center text-white">
            <h2 className={cn("text-3xl leading-tight drop-shadow-sm sm:text-5xl lg:text-6xl", k === i && "rise")}>{s.title}</h2>
            {s.text ? <p className={cn("mt-3 max-w-xl text-base text-white/85 sm:text-lg", k === i && "rise")} style={{ animationDelay: "150ms" }}>{s.text}</p> : null}
            <Link href={s.href} tabIndex={k === i ? 0 : -1} className={cn("mt-7 inline-flex h-11 items-center rounded-full bg-white px-6 text-[0.95rem] font-medium text-[var(--green)] transition-colors hover:bg-[var(--mint)]", k === i && "rise")} style={{ animationDelay: "300ms" }}>
              {cta}
            </Link>
          </div>
        </div>
      ))}
      {n > 1 ? (
        <>
          <button type="button" onClick={() => go(-1)} className="absolute start-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[var(--green)] shadow-md transition hover:bg-white" aria-label="السابق">
            <ChevronRight className="size-5 rtl:rotate-0 ltr:rotate-180" />
          </button>
          <button type="button" onClick={() => go(1)} className="absolute end-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[var(--green)] shadow-md transition hover:bg-white" aria-label="التالي">
            <ChevronLeft className="size-5 rtl:rotate-0 ltr:rotate-180" />
          </button>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {slides.map((_, k) => (
              <button key={k} type="button" onClick={() => setI(k)} aria-label={`${k + 1}`} className={cn("h-1.5 rounded-full bg-white transition-all", k === i ? "w-7 opacity-100" : "w-1.5 opacity-60")} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
