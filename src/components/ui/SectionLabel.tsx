import { cn } from "@/lib/utils";

/** "(01) — Leistungen" style label used to open every section. */
export default function SectionLabel({ index, children, className }: { index?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow flex items-center gap-3", className)}>
      {index ? <span className="text-accent">({index})</span> : null}
      <span aria-hidden className="h-px w-8 bg-current opacity-40" />
      <span>{children}</span>
    </p>
  );
}
