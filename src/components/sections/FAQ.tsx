"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import Reveal from "@/components/motion/Reveal";
import SplitText from "@/components/motion/SplitText";
import SectionLabel from "@/components/ui/SectionLabel";
import { FAQ as ITEMS } from "@/content/faq";
import { cn } from "@/lib/utils";

/** Accordion of frequent questions. The JSON-LD is emitted by the page. */
export default function FAQ({ index, className }: { index?: string; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section aria-labelledby={`${baseId}-title`} className={cn("bg-paper py-24 sm:py-32", className)}>
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionLabel index={index} className="text-stone-dark">
            Häufige Fragen
          </SectionLabel>
          <SplitText id={`${baseId}-title`} lines={["Gut zu", "wissen."]} className="display-md mt-8" />
        </div>
        <Reveal className="lg:col-span-7 lg:col-start-6">
          <ul className="border-b border-ink/10">
            {ITEMS.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={item.q} className="border-t border-ink/10">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`${baseId}-panel-${i}`}
                      id={`${baseId}-button-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span className="font-[family-name:var(--font-display)] text-xl font-medium tracking-tight transition-colors group-hover:text-accent sm:text-2xl">
                        {item.q}
                      </span>
                      <span
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ring-ink/15 transition-all duration-500",
                          isOpen ? "rotate-45 bg-ink text-paper ring-ink" : "group-hover:ring-ink/40",
                        )}
                      >
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        id={`${baseId}-panel-${i}`}
                        role="region"
                        aria-labelledby={`${baseId}-button-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-2xl pb-7 text-lg leading-relaxed text-stone-dark">{item.a}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
