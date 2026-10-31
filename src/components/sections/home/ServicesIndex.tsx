"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import ServiceArt from "@/components/art/ServiceArt";
import Reveal from "@/components/motion/Reveal";
import SplitText from "@/components/motion/SplitText";
import SectionLabel from "@/components/ui/SectionLabel";
import { services } from "@/content/services";

/**
 * Editorial index of services. On desktop, hovering a row floods it with ink
 * and a preview card with the matching illustration follows the cursor.
 */
export default function ServicesIndex() {
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [pointerFine, setPointerFine] = useState(false);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 26, mass: 0.6 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 26, mass: 0.6 });

  return (
    <section aria-labelledby="services-title" className="relative bg-paper py-24 sm:py-36">
      <div className="container-x">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel index="01" className="text-stone-dark">
              Leistungen
            </SectionLabel>
            <SplitText
            id="services-title"
              lines={["Alles rund um Werbung.", { text: "Aus einer Hand.", className: "text-stone" }]}
              className="display-lg mt-8"
            />
          </div>
          <Reveal className="lg:col-span-4" delay={0.2}>
            <p className="text-lg leading-relaxed text-stone-dark">
              Wir verbinden Gestaltung und Produktion. So entstehen Lösungen, die nicht nur gut aussehen, sondern
              auch im Alltag funktionieren – auf Papier, Folie, Textil oder an der Fassade.
            </p>
          </Reveal>
        </div>

        <ul
          ref={listRef}
          className="relative mt-16 border-b border-ink/10 sm:mt-24"
          onPointerMove={(event) => {
            if (event.pointerType !== "mouse" || !listRef.current) return;
            setPointerFine(true);
            const rect = listRef.current.getBoundingClientRect();
            x.set(event.clientX - rect.left);
            y.set(event.clientY - rect.top);
          }}
          onPointerLeave={() => setActive(null)}
        >
          {services.map((service, i) => (
            <li key={service.slug} className="relative border-t border-ink/10">
              <Link
                href={`/leistungen/${service.slug}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="group relative isolate grid grid-cols-[auto_1fr_auto] items-center gap-4 overflow-hidden py-6 sm:gap-8 sm:py-8 lg:grid-cols-[6rem_1fr_minmax(0,22rem)_auto]"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-[-100vw] inset-y-0 -z-10 origin-bottom scale-y-0 bg-ink transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100 group-focus-visible:scale-y-100"
                />
                <span className="font-mono text-xs text-stone transition-colors duration-500 group-hover:text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4vw,3.4rem)] font-medium leading-none tracking-[-0.035em] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-3 group-hover:text-paper">
                  {service.title}
                </span>
                <span className="hidden text-sm leading-relaxed text-stone-dark transition-colors duration-500 group-hover:text-paper/60 lg:block">
                  {service.claim}
                </span>
                <span className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 transition-all duration-500 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-ink sm:h-14 sm:w-14">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </Link>
            </li>
          ))}

          {/* Cursor-following preview (desktop, mouse only) */}
          <AnimatePresence>
            {pointerFine && active !== null ? (
              <motion.div
                key="preview"
                aria-hidden
                style={{ x, y }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute left-0 top-0 z-10 hidden lg:block"
              >
                <div className="-translate-x-1/2 -translate-y-[115%]">
                  <div className="relative h-[220px] w-[300px] overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-ink/10">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div
                        key={active}
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "-100%" }}
                        transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                        className="absolute inset-0 p-4"
                      >
                        <ServiceArt variant={services[active].art} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </ul>
      </div>
    </section>
  );
}
