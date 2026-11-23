"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { fileStatuses, fileStatusInfo, fileTypeGroups } from "@/lib/files/shared";
import { cn } from "@/lib/utils";

const ranges: [string, string][] = [
  ["", "Jederzeit"],
  ["heute", "Heute"],
  ["7", "7 Tage"],
  ["30", "30 Tage"],
  ["jahr", "Dieses Jahr"],
];

/** Tiefensuche: Begriff + Filter (Typ, Zeitraum, Status, nur in diesem Ordner) – sofort beim Tippen */
export function FileSearch({ folder }: { folder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typ = sp.get("typ") ?? "";
  const seit = sp.get("seit") ?? "";
  const status = sp.get("status") ?? "";
  const inside = sp.get("in") ?? "";
  const active = !!(sp.get("q") || typ || seit || status);

  const push = (patch: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    // Suche ist ordnerübergreifend – außer „nur hier“
    if ((p.get("q") || p.get("typ") || p.get("seit") || p.get("status")) && !p.get("in")) p.delete("ordner");
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  };

  const onType = (v: string) => {
    setQ(v);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => push({ q: v.trim() }), 260);
  };

  return (
    <div className="space-y-2.5">
      <div className="relative">
        {pending ? <Loader2 className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-accent" aria-hidden /> : <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone" aria-hidden />}
        <input
          value={q}
          onChange={(e) => onType(e.target.value)}
          placeholder="Suchen: Dateiname, Kunde, Ordner, Notiz, Mitarbeiter …"
          className="h-12 w-full rounded-2xl border-0 bg-white pl-10 pr-10 text-[0.95rem] shadow-sm outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-accent/50"
          aria-label="Dateien durchsuchen"
        />
        {active ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              push({ q: "", typ: "", seit: "", status: "", in: "" });
            }}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-xl text-stone-dark hover:bg-ink/[0.06]"
            aria-label="Suche zurücksetzen"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {[["", "Alle Typen"] as [string, string], ...Object.entries(fileTypeGroups).map(([k, v]) => [k, v.label] as [string, string])].map(([k, label]) => (
          <Chip key={k || "alle"} on={typ === k} onClick={() => push({ typ: k })}>
            {label}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-ink/10" />
        {ranges.map(([k, label]) => (
          <Chip key={k || "immer"} on={seit === k} onClick={() => push({ seit: k })}>
            {label}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-ink/10" />
        {fileStatuses.map((s) => (
          <Chip key={s} on={status === s} onClick={() => push({ status: status === s ? "" : s })}>
            <span className={cn("size-1.5 rounded-full", fileStatusInfo[s].dot)} /> {fileStatusInfo[s].label}
          </Chip>
        ))}
        {folder ? (
          <>
            <span className="mx-1 h-4 w-px bg-ink/10" />
            <Chip on={inside === "1"} onClick={() => push({ in: inside ? "" : "1", ordner: folder })}>
              Nur in „{folder.split("/").pop()}“
            </Chip>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 transition", on ? "bg-ink text-white" : "bg-white text-stone-dark ring-1 ring-ink/10 hover:ring-ink/25")}>
      {children}
    </button>
  );
}
