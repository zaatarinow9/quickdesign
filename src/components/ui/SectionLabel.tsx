import { cn } from "@/lib/utils";

/** Small label that opens a section ("— Leistungen"). `index` is accepted for compatibility but not shown. */
export default function SectionLabel({ children, className }: { index?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow flex items-center gap-3", className)}>
      <span aria-hidden className="h-px w-8 bg-gradient-to-r from-accent to-accent-2" />
      <span>{children}</span>
    </p>
  );
}
