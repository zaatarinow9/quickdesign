"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProjectVisual from "@/components/art/ProjectVisual";
import SplitText from "@/components/motion/SplitText";
import SectionLabel from "@/components/ui/SectionLabel";
import { projects } from "@/content/projects";

const FEATURED = projects.slice(0, 5);

function Card({ index }: { index: number }) {
  const project = FEATURED[index];
  return (
    <Link href="/projekte" className="group block w-[78vw] shrink-0 sm:w-[60vw] lg:w-[44vw] xl:w-[38vw]">
      <ProjectVisual project={project} className="aspect-[4/3] rounded-[1.75rem]" />
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow text-paper/45">{project.category}</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-medium tracking-tight sm:text-3xl">{project.title}</h3>
        </div>
        <span className="font-mono text-xs text-paper/40">{String(index + 1).padStart(2, "0")}</span>
      </div>
    </Link>
  );
}

/**
 * Pinned horizontal gallery on large screens: vertical scrolling drives the
 * track sideways. Touch devices and reduced motion get a native swipe row.
 */
export default function SelectedWork() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const measure = () => {
      const enabled = media.matches && !reduce;
      setPinned(enabled);
      if (trackRef.current) {
        setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    window.addEventListener("resize", measure);
    media.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      media.removeEventListener("change", measure);
    };
  }, [reduce]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const x = useSpring(rawX, { stiffness: 120, damping: 30, mass: 0.3 });
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="work-title"
      className="grain relative bg-ink text-paper"
      style={pinned ? { height: `calc(100vh + ${distance}px)` } : undefined}
    >
      <div className={pinned ? "sticky top-0 flex h-screen flex-col justify-center overflow-hidden" : "py-24 sm:py-32"}>
        <div className="container-x flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel index="02" className="text-paper/55">
              Ausgewählte Arbeiten
            </SectionLabel>
            <SplitText
            id="work-title" lines={["Arbeiten, die man", "nicht übersieht."]} className="display-md mt-6" />
          </div>
          <Link href="/projekte" className="group inline-flex items-center gap-3 text-paper/70 transition-colors hover:text-paper">
            <span className="link-underline">Alle Projekte</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className={pinned ? "mt-12" : "mt-12 overflow-x-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"}>
          <motion.div
            ref={trackRef}
            style={pinned ? { x } : undefined}
            className="flex w-max gap-6 px-[var(--gutter)] sm:gap-10"
          >
            {FEATURED.map((project, i) => (
              <Card key={project.slug} index={i} />
            ))}
            <Link
              href="/projekte"
              className="group flex w-[60vw] shrink-0 flex-col items-center justify-center gap-6 rounded-[1.75rem] border border-dashed border-paper/20 sm:w-[36vw] lg:w-[26vw]"
            >
              <span className="grid h-24 w-24 place-items-center rounded-full bg-accent text-paper transition-transform duration-700 group-hover:scale-110 group-hover:rotate-[-45deg]">
                <ArrowRight className="h-7 w-7" />
              </span>
              <span className="font-[family-name:var(--font-display)] text-2xl">Alle Projekte</span>
            </Link>
          </motion.div>
        </div>

        {pinned ? (
          <div className="container-x mt-12">
            <div className="h-px w-full bg-paper/10">
              <motion.div style={{ scaleX: progress }} className="bg-brand-gradient h-px origin-left" />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
