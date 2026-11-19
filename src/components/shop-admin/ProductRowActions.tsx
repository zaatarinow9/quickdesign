"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Loader2, Star, Trash2 } from "lucide-react";
import { productAction } from "@/app/shop-admin/actions";
import { cn } from "@/lib/utils";

export function ProductRowActions({ id, active, featured, first, last }: { id: string; active: boolean; featured: boolean; first: boolean; last: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (a: Parameters<typeof productAction>[1]) =>
    start(async () => {
      if (a === "delete" && !confirm("Produkt wirklich löschen? Das kann nicht rückgängig gemacht werden.")) return;
      const r = await productAction(id, a);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  const btn = "grid size-8 place-items-center rounded-lg text-stone-dark hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30";
  return (
    <div className="flex items-center gap-0.5">
      {pending ? <Loader2 className="me-1 size-4 animate-spin text-stone-dark" /> : null}
      <button type="button" className={btn} onClick={() => run("toggle")} title={active ? "Im Shop ausblenden" : "Im Shop anzeigen"} disabled={pending}>
        {active ? <Eye className="size-4" /> : <EyeOff className="size-4 text-red-600" />}
      </button>
      <button type="button" className={btn} onClick={() => run("feature")} title="Hervorheben" disabled={pending}>
        <Star className={cn("size-4", featured && "fill-amber-400 text-amber-500")} />
      </button>
      <button type="button" className={btn} onClick={() => run("up")} title="Nach oben" disabled={pending || first}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" className={btn} onClick={() => run("down")} title="Nach unten" disabled={pending || last}>
        <ArrowDown className="size-4" />
      </button>
      <button type="button" className={btn} onClick={() => run("duplicate")} title="Duplizieren" disabled={pending}>
        <Copy className="size-4" />
      </button>
      <button type="button" className={cn(btn, "hover:text-red-700")} onClick={() => run("delete")} title="Löschen" disabled={pending}>
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
