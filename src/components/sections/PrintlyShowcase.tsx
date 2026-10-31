"use client";

import { Check, Lock, Upload } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import SplitText from "@/components/motion/SplitText";
import Reveal from "@/components/motion/Reveal";
import Button from "@/components/ui/Button";
import SectionLabel from "@/components/ui/SectionLabel";
import { printly } from "@/content/site";

/**
 * Schematic "configurator" loop shown inside the browser mockup. It is an
 * illustration of the ordering flow, not a screenshot of QuickPrintly.
 */
const SCENES = [
  { product: "Visitenkarten", options: ["85 × 55 mm", "350 g", "Matt"], qty: "500" },
  { product: "Flyer", options: ["DIN A5", "170 g", "Glänzend"], qty: "1.000" },
  { product: "Aufkleber", options: ["Rund", "Folie", "Laminiert"], qty: "250" },
  { product: "Banner", options: ["200 × 100 cm", "PVC", "Ösen"], qty: "2" },
];

function MockupScreen({ step }: { step: number }) {
  const scene = SCENES[step % SCENES.length];
  return (
    <div className="grid h-full grid-cols-[38%_1fr] gap-3 p-3 sm:gap-4 sm:p-5">
      {/* Product grid */}
      <div className="grid grid-rows-4 gap-2 sm:gap-3">
        {SCENES.map((item, i) => {
          const selected = i === step % SCENES.length;
          return (
            <div
              key={item.product}
              className={`relative flex items-center gap-2 overflow-hidden rounded-lg px-2 transition-all duration-500 sm:gap-3 sm:rounded-xl sm:px-3 ${
                selected ? "bg-ink text-paper" : "bg-paper-2 text-ink/60"
              }`}
            >
              <span className={`h-5 w-5 shrink-0 rounded-md sm:h-7 sm:w-7 ${selected ? "bg-accent" : "bg-ink/10"}`} />
              <span className="truncate text-[0.6rem] font-medium sm:text-xs">{item.product}</span>
              {selected ? (
                <motion.span layoutId="mock-check" className="ml-auto grid h-4 w-4 place-items-center rounded-full bg-accent text-ink sm:h-5 sm:w-5">
                  <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </motion.span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Configuration panel */}
      <div className="flex flex-col rounded-xl bg-paper-2 p-3 sm:rounded-2xl sm:p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.product}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex flex-1 flex-col"
          >
            <p className="font-[family-name:var(--font-display)] text-sm font-medium text-ink sm:text-lg">{scene.product}</p>
            <div className="mt-1 h-1.5 w-2/3 rounded-full bg-ink/10" />
            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
              {scene.options.map((option, i) => (
                <motion.span
                  key={option}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                  className="rounded-full bg-paper px-2 py-1 text-[0.55rem] text-ink ring-1 ring-ink/10 sm:px-3 sm:text-[0.7rem]"
                >
                  {option}
                </motion.span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-paper px-2 py-1.5 ring-1 ring-ink/10 sm:mt-4 sm:px-3 sm:py-2">
              <span className="text-[0.55rem] text-ink/50 sm:text-[0.7rem]">Auflage</span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <span className="grid h-4 w-4 place-items-center rounded bg-ink/10 text-[0.6rem] text-ink sm:h-5 sm:w-5">–</span>
                <motion.span
                  key={scene.qty}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="min-w-8 text-center font-mono text-[0.6rem] text-ink sm:text-xs"
                >
                  {scene.qty}
                </motion.span>
                <span className="grid h-4 w-4 place-items-center rounded bg-ink text-[0.6rem] text-paper sm:h-5 sm:w-5">+</span>
              </span>
            </div>
            <div className="mt-2 flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-ink/20 py-2 sm:mt-3 sm:gap-1.5">
              <Upload className="h-3.5 w-3.5 text-ink/50 sm:h-4 sm:w-4" />
              <span className="text-[0.5rem] text-ink/50 sm:text-[0.65rem]">Druckdaten hochladen</span>
              <span className="mt-1 block h-1 w-1/2 overflow-hidden rounded-full bg-ink/10">
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.4, delay: 0.7, ease: [0.76, 0, 0.24, 1] }}
                  className="block h-full origin-left rounded-full bg-accent"
                />
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-ink px-3 py-2 text-paper sm:mt-4 sm:rounded-xl sm:py-3">
          <span className="text-[0.6rem] text-paper/60 sm:text-xs">Online bestellen</span>
          <motion.span
            key={step}
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.5 }}
            className="grid h-5 w-5 place-items-center rounded-full bg-accent text-ink sm:h-7 sm:w-7"
          >
            <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </motion.span>
        </div>
      </div>
    </div>
  );
}

function BrowserMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.4 });
  const [step, setStep] = useState(0);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 80, damping: 18 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 80, damping: 18 });

  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => setStep((s) => s + 1), 2600);
    return () => window.clearInterval(id);
  }, [inView, reduce]);

  return (
    <div
      ref={ref}
      className="relative [perspective:1600px]"
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== "mouse" || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        mx.set((event.clientX - rect.left) / rect.width - 0.5);
        my.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 80, rotateX: 18 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative overflow-hidden rounded-2xl bg-paper shadow-[0_60px_120px_-30px_rgba(0,0,0,0.75)] ring-1 ring-paper/10 sm:rounded-[1.4rem]"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-3 border-b border-ink/10 bg-paper-2 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            </div>
            <div className="mx-auto flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-[0.65rem] text-ink/70 ring-1 ring-ink/10 sm:px-4 sm:text-xs">
              <Lock className="h-3 w-3" />
              {printly.displayUrl}
            </div>
            <span className="w-10" />
          </div>
          {/* Faux top bar */}
          <div className="flex items-center justify-between px-3 pt-3 sm:px-5 sm:pt-4">
            <span className="flex items-center gap-2 text-ink">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="font-[family-name:var(--font-display)] text-xs font-semibold sm:text-sm">{printly.name}</span>
            </span>
            <span className="flex gap-1.5">
              <span className="h-1.5 w-8 rounded-full bg-ink/10 sm:w-10" />
              <span className="h-1.5 w-8 rounded-full bg-ink/10 sm:w-10" />
            </span>
          </div>
          <div className="aspect-[16/10]">
            <MockupScreen step={step} />
          </div>
        </motion.div>
      </motion.div>
      <p className="mt-4 text-center font-mono text-[0.68rem] uppercase tracking-[0.14em] text-paper/35">
        Schematische Darstellung
      </p>
    </div>
  );
}

/** Dedicated promotion of the separate online print platform. */
export default function PrintlyShowcase({ index = "04" }: { index?: string }) {
  return (
    <section
      id="online-druck"
      aria-labelledby="printly-title"
      className="grain relative isolate overflow-hidden bg-ink py-24 text-paper sm:py-36"
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,79,31,0.16)_0%,transparent_55%)]"
      />
      <div className="container-x grid items-center gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionLabel index={index} className="text-paper/55">
            Online-Druck
          </SectionLabel>
          <SplitText
            id="printly-title"
            lines={["Druckprodukte?", { text: "Einfach online", className: "text-paper/45" }, { text: "bestellen.", className: "text-paper/45" }]}
            className="display-md mt-8"
          />
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-paper/65">
              Für Druckprodukte gibt es unsere eigene Plattform{" "}
              <strong className="font-medium text-paper">{printly.name}</strong>. Dort stellen Sie Ihr Produkt selbst
              zusammen und bestellen direkt online – rund um die Uhr.
            </p>
            <ul className="mt-8 space-y-3 text-paper/80">
              {["Produkt auswählen", "Optionen festlegen", "Online bestellen"].map((item, i) => (
                <li key={item} className="flex items-center gap-4">
                  <span className="font-mono text-xs text-accent">0{i + 1}</span>
                  <span className="h-px w-6 bg-paper/20" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col items-start gap-5">
              <Button href={printly.url} external size="lg">
                {printly.cta}
              </Button>
              <p className="text-sm text-paper/45">
                Individuelles Projekt oder Beratung gewünscht?{" "}
                <a href="/kontakt" className="text-paper/80 underline underline-offset-4 hover:text-paper">
                  Sprechen Sie mit uns.
                </a>
              </p>
            </div>
          </Reveal>
        </div>
        <div className="lg:col-span-7">
          <BrowserMockup />
        </div>
      </div>
    </section>
  );
}
