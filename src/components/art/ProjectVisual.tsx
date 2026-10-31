import Image from "next/image";
import ServiceArt from "@/components/art/ServiceArt";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/utils";

/**
 * Visual for a portfolio entry: the real photo when provided, otherwise an
 * illustration with an explicit "Platzhalter" badge so it is never mistaken
 * for a finished reference.
 */
export default function ProjectVisual({ project, className, sizes = "(min-width: 1024px) 50vw, 100vw" }: { project: Project; className?: string; sizes?: string }) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-ink-2 text-paper", className)}>
      {project.image ? (
        <Image
          src={project.image.src}
          alt={project.image.alt}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
      ) : (
        <>
          <div aria-hidden className="hairline-grid absolute inset-0 -z-10 text-paper/[0.04]" />
          <div className="absolute inset-0 flex items-center justify-center p-[8%] transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]">
            <ServiceArt variant={project.art} />
          </div>
        </>
      )}
      {project.placeholder ? (
        <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-paper/10 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-paper/80 ring-1 ring-paper/15 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Platzhalter · Projektfoto folgt
        </span>
      ) : null}
    </div>
  );
}
