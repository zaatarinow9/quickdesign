"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import ProjectVisual from "@/components/art/ProjectVisual";
import { projects } from "@/content/projects";
import { cn } from "@/lib/utils";

const ALL = "Alle";

/** Filterable project grid with layout animations between filter states. */
export default function ProjectGrid() {
  const categories = useMemo(() => [ALL, ...Array.from(new Set(projects.map((project) => project.category)))], []);
  const [filter, setFilter] = useState(ALL);
  const visible = filter === ALL ? projects : projects.filter((project) => project.category === filter);

  return (
    <LayoutGroup>
      <div role="group" aria-label="Projekte filtern" className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const active = category === filter;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(category)}
              className={cn(
                "relative h-11 rounded-full px-5 text-sm transition-colors duration-300",
                active ? "text-paper" : "text-ink/70 ring-1 ring-ink/15 hover:text-ink hover:ring-ink/40",
              )}
            >
              {active ? (
                <motion.span layoutId="project-filter" className="absolute inset-0 -z-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
              ) : null}
              <span className="relative">{category}</span>
            </button>
          );
        })}
      </div>

      <motion.ul layout className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {visible.map((project, i) => (
            <motion.li
              key={project.slug}
              layout
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={cn(i % 2 === 1 ? "md:mt-24" : "")}
            >
              <Link href={`/leistungen/${project.serviceSlug}`} className="group block">
                <ProjectVisual project={project} className={cn("rounded-[1.75rem]", i % 3 === 0 ? "aspect-[4/5]" : "aspect-[4/3]")} />
                <div className="mt-5 flex items-start justify-between gap-6">
                  <div>
                    <p className="eyebrow text-stone">{project.category}</p>
                    <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-medium tracking-tight sm:text-3xl">{project.title}</h2>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-dark">{project.summary}</p>
                  </div>
                  {project.year ? <span className="font-mono text-xs text-stone">{project.year}</span> : null}
                </div>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </LayoutGroup>
  );
}
