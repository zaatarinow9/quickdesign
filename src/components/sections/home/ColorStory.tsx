"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import Reveal from "@/components/motion/Reveal";
import SplitText from "@/components/motion/SplitText";
import SectionLabel from "@/components/ui/SectionLabel";

const INKS = [
  { name: "Cyan", color: "var(--color-accent-2)", from: { x: -90, y: -60 } },
  { name: "Magenta", color: "var(--color-accent)", from: { x: 90, y: -60 } },
  { name: "Gelb", color: "var(--color-brand-yellow)", from: { x: 0, y: 90 } },
];

/**
 * The logo's ring uses the process colours of print. Three translucent ink
 * discs drift together on scroll and mix subtractively – exactly like
 * colours on paper.
 */
export default function ColorStory({ index }: { index?: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const spread = useTransform(scrollYProgress, [0, 1], [reduce ? 0.32 : 0.95, 0.32]);
  const rotate = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -40, 0]);

  return (
    <section ref={ref} aria-labelledby="color-title" className="relative overflow-hidden bg-paper py-24 sm:py-36">
      <div className="container-x grid items-center gap-16 lg:grid-cols-12">
        <div className="order-2 lg:order-1 lg:col-span-6">
          <motion.div style={{ rotate }} className="relative mx-auto aspect-square w-full max-w-[460px]">
            {INKS.map((ink) => (
              <Disc key={ink.name} color={ink.color} from={ink.from} spread={spread} />
            ))}
            <span className="absolute inset-0 grid place-items-center">
              <span className="h-3 w-3 rounded-full bg-ink" />
            </span>
          </motion.div>
        </div>
        <div className="order-1 lg:order-2 lg:col-span-5 lg:col-start-8">
          <SectionLabel index={index} className="text-stone-dark">
            Farbe ist unser Handwerk
          </SectionLabel>
          <SplitText
            id="color-title"
            lines={["Vier Farben.", { text: "Unendlich viele", className: "text-brand-gradient" }, { text: "Möglichkeiten.", className: "text-brand-gradient" }]}
            className="display-md mt-8"
          />
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-stone-dark">
              Cyan, Magenta, Gelb und Schwarz – die Druckfarben stecken in unserem Logo. Aus ihnen entsteht nahezu
              jedes Motiv, das gedruckt wird. Wir sorgen dafür, dass Ihre Farben auf Papier, Folie und Textil so
              wirken, wie Sie es sich vorstellen.
            </p>
            <ul className="mt-8 flex flex-wrap gap-3">
              {[
                { label: "Cyan", cls: "bg-accent-2" },
                { label: "Magenta", cls: "bg-accent" },
                { label: "Gelb", cls: "bg-brand-yellow" },
                { label: "Schwarz", cls: "bg-ink" },
              ].map((item) => (
                <li key={item.label} className="inline-flex items-center gap-2 rounded-full bg-paper-2 px-4 py-2 text-sm">
                  <span className={`h-3 w-3 rounded-full ${item.cls}`} />
                  {item.label}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Disc({
  color,
  from,
  spread,
}: {
  color: string;
  from: { x: number; y: number };
  spread: ReturnType<typeof useTransform<number, number>>;
}) {
  const x = useTransform(spread, (s) => `${from.x * s}%`);
  const y = useTransform(spread, (s) => `${from.y * s}%`);
  return (
    <motion.span
      style={{ x, y, backgroundColor: color }}
      className="absolute left-[20%] top-[20%] h-[60%] w-[60%] rounded-full opacity-90 mix-blend-multiply"
    />
  );
}
