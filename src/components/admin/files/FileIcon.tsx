import { File, FileArchive, FileImage, FileSpreadsheet, FileText, FileVideo, PenTool } from "lucide-react";
import { fileKind } from "@/lib/files/shared";
import { cn } from "@/lib/utils";

const map = { bild: FileImage, pdf: FileText, grafik: PenTool, dokument: FileSpreadsheet, archiv: FileArchive, video: FileVideo, sonstiges: File } as const;
const tone = {
  bild: "bg-sky-500/10 text-sky-700",
  pdf: "bg-red-500/10 text-red-700",
  grafik: "bg-accent/10 text-accent",
  dokument: "bg-emerald-500/10 text-emerald-700",
  archiv: "bg-amber-500/10 text-amber-700",
  video: "bg-violet-500/10 text-violet-700",
  sonstiges: "bg-ink/[0.06] text-stone-dark",
} as const;

export function FileIcon({ name, type, className }: { name: string; type?: string | null; className?: string }) {
  const k = fileKind(name, type);
  const Icon = map[k];
  const ext = name.includes(".") ? name.split(".").pop()!.slice(0, 4).toUpperCase() : "";
  return (
    <span className={cn("relative grid size-11 shrink-0 place-items-center rounded-xl", tone[k], className)}>
      <Icon className="size-5" aria-hidden />
      {ext ? <span className="absolute -bottom-1 rounded bg-white px-1 text-[0.58rem] font-bold leading-tight ring-1 ring-current/20">{ext}</span> : null}
    </span>
  );
}
