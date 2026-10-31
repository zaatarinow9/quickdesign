"use client";

import { ArrowUpRight } from "lucide-react";
import {
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import { LOGO_CORE, LOGO_SEGMENTS } from "@/components/brand/logo-paths";
import SplitText from "@/components/motion/SplitText";
import Button from "@/components/ui/Button";
import CropMarks from "@/components/ui/CropMarks";
import { printly } from "@/content/site";

/** Square viewBox centred on the logo core so rotations pivot correctly. */
const MARK_VIEWBOX = "46 120 660 660";
const EASE = [0.16, 1, 0.3, 1] as const;

function HeroMark({ rotate }: { rotate: MotionValue<number> }) {
  return (
    <div className="relative aspect-square w-full">
      {/* Orbit with a travelling accent dot */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, delay: 1, ease: EASE }}
        className="absolute inset-[-6%] rounded-full border border-dashed border-paper/10"
      >
        <div className="absolute inset-0 animate-[spin_24s_linear_infinite] motion-reduce:animate-none">
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_24px_4px_rgba(255,79,31,0.6)]" />
        </div>
      </motion.div>

      {/* Segmented ring — assembles, then turns with scroll */}
      <motion.div className="absolute inset-0" style={{ rotate }}>
        <svg viewBox={MARK_VIEWBOX} className="h-full w-full" aria-hidden>
          {LOGO_SEGMENTS.map((d, i) => (
            <motion.path
              key={d.slice(0, 24)}
              d={d}
              fill="currentColor"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              initial={{ opacity: 0, scale: 0.4, rotate: -35 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.3, delay: 0.35 + i * 0.07, ease: EASE }}
            />
          ))}
        </svg>
      </motion.div>

      {/* Core mark */}
      <motion.svg
        viewBox={MARK_VIEWBOX}
        className="absolute inset-0 h-full w-full"
        aria-hidden
        initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1.6, delay: 0.2, ease: EASE }}
      >
        <path d={LOGO_CORE} fill="currentColor" fillRule="evenodd" />
      </motion.svg>
    </div>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  const markScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.25]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "35%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Pointer parallax for the mark
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20 });
  const sy = useSpring(py, { stiffness: 60, damping: 20 });

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-paper"
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== "mouse") return;
        px.set((event.clientX / window.innerWidth - 0.5) * 40);
        py.set((event.clientY / window.innerHeight - 0.5) * 40);
      }}
    >
      {/* Background: hairline grid fading out, accent glow */}
      <div
        aria-hidden
        className="hairline-grid absolute inset-0 -z-10 text-paper/[0.05] [mask-image:radial-gradient(ellipse_at_70%_45%,black_10%,transparent_70%)]"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.4, delay: 0.6 }}
        className="absolute right-[-10%] top-[10%] -z-10 h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle,rgba(255,79,31,0.22)_0%,transparent_60%)] blur-2xl"
      />
      <CropMarks className="[&>span]:border-paper/25" inset={18} />

      {/* Logo mark */}
      <motion.div
        aria-hidden
        style={{ x: sx, y: sy, scale: markScale }}
        className="pointer-events-none absolute right-[-28%] top-[16%] w-[95vw] max-w-[760px] text-paper sm:right-[-18%] sm:w-[75vw] lg:right-[-3%] lg:top-[7.5rem] lg:w-[min(42vw,calc(100svh-19rem))]"
      >
        <div className="opacity-[0.16] lg:opacity-100">
          <HeroMark rotate={ringRotate} />
        </div>
      </motion.div>

      {/* Copy */}
      <motion.div style={{ y: copyY, opacity: copyOpacity }} className="container-x relative flex flex-1 flex-col justify-end pb-10 pt-32 sm:pb-14">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: EASE }}
          className="eyebrow flex items-center gap-3 text-paper/60"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Grafikdesign · Druck · Werbetechnik
        </motion.p>

        <SplitText
            id="hero-title"
          as="h1"
          immediate
          delay={0.05}
          stagger={0.06}
          duration={0.9}
          lines={["Wir machen", "Marken", { text: "sichtbar.", className: "text-accent" }]}
          className="display-xl mt-6 max-w-[11ch] max-sm:text-[3.6rem]"
        />

        <div className="mt-10 flex flex-col gap-8 border-t border-paper/10 pt-8 lg:mt-14 lg:flex-row lg:items-end lg:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.45, ease: EASE }}
            className="max-w-xl text-lg leading-relaxed text-paper/65"
          >
            QuickDesign gestaltet und produziert Werbung, die auffällt: vom Logo über Schilder und
            Fahrzeugbeschriftungen bis zu 3D-Buchstaben an der Fassade. Alles rund um Werbung – aus einer Hand.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.55, ease: EASE }}
            className="flex flex-wrap items-center gap-3"
          >
            <Button href="/kontakt" size="lg">
              Projekt anfragen
            </Button>
            <Button href="/leistungen" variant="outline-light" size="lg">
              Leistungen
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-8 flex items-center justify-between gap-6 text-sm text-paper/50"
        >
          <a
            href={printly.url}
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-2 transition-colors hover:text-paper"
          >
            <span className="rounded-full bg-paper/10 px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-paper/70">
              Online
            </span>
            <span className="hidden sm:inline">Druckprodukte bestellen auf</span>
            <span className="text-paper/80 underline-offset-4 group-hover:underline">{printly.displayUrl}</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            <span className="sr-only">(öffnet in neuem Tab)</span>
          </a>
          <span aria-hidden className="hidden items-center gap-3 sm:flex">
            Scrollen
            <span className="relative block h-10 w-px overflow-hidden bg-paper/15">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2s_cubic-bezier(0.76,0,0.24,1)_infinite] bg-paper motion-reduce:animate-none" />
            </span>
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}
