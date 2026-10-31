import { cn } from "@/lib/utils";

/** Printer's crop marks in the four corners of a container — a nod to the print trade. */
export default function CropMarks({ className, inset = 16 }: { className?: string; inset?: number }) {
  const mark = "absolute h-5 w-5";
  const style = { margin: inset };
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(mark, "left-0 top-0 border-l border-t")} style={style} />
      <span className={cn(mark, "right-0 top-0 border-r border-t")} style={style} />
      <span className={cn(mark, "bottom-0 left-0 border-b border-l")} style={style} />
      <span className={cn(mark, "bottom-0 right-0 border-b border-r")} style={style} />
    </div>
  );
}
