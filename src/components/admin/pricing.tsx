"use client";

import { useMemo, useState } from "react";
import { Clock, GripVertical, Hash, Layers, Plus, Ruler, Search, Square, Star, Tag, type LucideIcon } from "lucide-react";
import { priceLabel, type CalcType } from "@/lib/documents/calc";
import type { CatalogService } from "@/lib/documents/queries";
import { cn } from "@/lib/utils";

/** MIME-Typ für Drag & Drop von Katalogleistungen */
export const DND_SERVICE = "application/x-qd-service";
export const DND_ROW = "application/x-qd-row";

export const calcTypeIcons: Record<CalcType, LucideIcon> = {
  stueck: Hash,
  menge: Layers,
  flaeche: Square,
  laenge: Ruler,
  stunde: Clock,
  pauschal: Tag,
};

export function CalcTypeIcon({ type, className }: { type: CalcType; className?: string }) {
  const Icon = calcTypeIcons[type];
  return <Icon className={className} aria-hidden />;
}

export function hasServiceDrag(e: React.DragEvent) {
  return Array.from(e.dataTransfer.types).includes(DND_SERVICE);
}

/** Ziehbarer Baustein (Klick fügt ebenfalls hinzu – wichtig für Touch-Geräte) */
export function ServiceChip({ service, onClick, compact }: { service: CatalogService; onClick?: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_SERVICE, service.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onClick}
      title={`${priceLabel(service)} – ziehen oder klicken zum Hinzufügen`}
      className={cn(
        "group/chip inline-flex max-w-full cursor-grab items-center gap-1.5 rounded-full bg-white text-left ring-1 ring-ink/10 transition hover:ring-accent active:cursor-grabbing",
        compact ? "h-8 px-2.5 text-[0.78rem]" : "h-9 px-3 text-[0.82rem]",
      )}
    >
      <GripVertical className="size-3.5 shrink-0 text-stone-light group-hover/chip:text-accent" aria-hidden />
      <CalcTypeIcon type={service.calc_type} className="size-3.5 shrink-0 text-stone-dark" />
      <span className="truncate">{service.name}</span>
      {!compact ? <span className="shrink-0 text-xs tabular-nums text-stone-dark">· {priceLabel(service)}</span> : null}
      <Plus className="size-3.5 shrink-0 text-stone group-hover/chip:text-accent" aria-hidden />
    </button>
  );
}

/** Suchbare Palette mit ziehbaren Leistungen */
export function ServicePalette({
  catalog,
  onPick,
  exclude = [],
  limit = 14,
  compact,
  placeholder = "Baustein suchen …",
}: {
  catalog: CatalogService[];
  onPick: (s: CatalogService) => void;
  exclude?: string[];
  limit?: number;
  compact?: boolean;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const pool = catalog.filter((s) => s.active !== false && !exclude.includes(s.id));
    const hits = t ? pool.filter((s) => `${s.name} ${s.category ?? ""}`.toLowerCase().includes(t)) : pool;
    return hits.slice(0, limit);
  }, [catalog, q, exclude, limit]);

  return (
    <div className="space-y-2">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="adm-input h-8 pl-8 text-sm" aria-label={placeholder} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {list.map((s) => (
          <span key={s.id} className="inline-flex items-center">
            {s.is_favorite && !compact ? <Star className="mr-0.5 size-3 fill-amber-400 text-amber-400" aria-hidden /> : null}
            <ServiceChip service={s} compact={compact} onClick={() => onPick(s)} />
          </span>
        ))}
        {!list.length ? <span className="text-xs text-stone-dark">Keine passende Leistung.</span> : null}
      </div>
    </div>
  );
}
