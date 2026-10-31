"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import Reveal from "@/components/motion/Reveal";
import SplitText from "@/components/motion/SplitText";
import SectionLabel from "@/components/ui/SectionLabel";
import { STEPS } from "@/content/process";



/** Sticky heading with a progress rail that fills as the steps scroll past. */
export default function Approach({ index = "03" }: { index?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.7", "end 0.6"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section aria-labelledby="approach-title" className="relative bg-paper-2 py-24 sm:py-36">
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <SectionLabel index={index} className="text-stone-dark">
              Arbeitsweise
            </SectionLabel>
            <SplitText
            id="approach-title" lines={["Von der Idee", "bis zum Ergebnis."]} className="display-md mt-8" />
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-md text-lg leading-relaxed text-stone-dark">
                Ein klarer Ablauf, persönliche Betreuung und ehrliche Beratung. So bleibt Ihr Projekt planbar – vom
                ersten Gespräch bis zur Übergabe.
              </p>
            </Reveal>
          </div>
        </div>

        <ol ref={ref} className="relative lg:col-span-6 lg:col-start-7">
          <div aria-hidden className="absolute bottom-0 left-[1.15rem] top-0 w-px bg-ink/10 sm:left-[1.4rem]">
            <motion.div style={{ scaleY }} className="h-full w-px origin-top bg-accent" />
          </div>
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative pb-16 pl-16 last:pb-0 sm:pl-24">
              <Reveal amount={0.6}>
                <span className="absolute left-0 top-0 grid h-[2.3rem] w-[2.3rem] place-items-center rounded-full bg-paper-2 font-mono text-xs ring-1 ring-ink/15 sm:h-[2.8rem] sm:w-[2.8rem]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight sm:text-5xl">{step.title}</h3>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-stone-dark">{step.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
