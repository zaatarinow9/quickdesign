import Link from "next/link";
import { Plus, Ruler } from "lucide-react";
import { listMeasurements } from "@/lib/measure/server";
import { areaM2, fmtM2 } from "@/lib/measure/shared";
import { formatDateDE } from "@/lib/documents/format";
import { EmptyState } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/** Aufmaße als Karten – für die Übersicht und den Reiter in der Kundenakte */
export async function MeasurementList({ customerId, q }: { customerId?: string; q?: string }) {
  const list = await listMeasurements({ customerId, q });
  const newHref = customerId ? `/admin/aufmass/neu?kunde=${customerId}` : "/admin/aufmass/neu";
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Link href={newHref} className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-5 transition hover:border-accent hover:bg-accent/[0.04]">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30">
          <Plus className="size-6" aria-hidden />
        </span>
        <span>
          <span className="block font-semibold">Neues Aufmaß</span>
          <span className="block text-sm text-stone-dark">Vor Ort messen und fotografieren</span>
        </span>
      </Link>
      {list.map((m) => {
        const total = m.items.reduce((s, i) => s + areaM2({ width_cm: i.width_cm == null ? null : Number(i.width_cm), height_cm: i.height_cm == null ? null : Number(i.height_cm), quantity: i.quantity }), 0);
        const photos = m.items.filter((i) => i.photo_key).length;
        return (
          <Link key={m.id} href={`/admin/aufmass/${m.id}`} className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/[0.07] transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink/[0.05] text-stone-dark group-hover:bg-accent/10 group-hover:text-accent">
                <Ruler className="size-5" aria-hidden />
              </span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", m.status === "fertig" ? "bg-emerald-500/12 text-emerald-700" : "bg-amber-500/14 text-amber-800")}>
                {m.status === "fertig" ? "Abgeschlossen" : "Offen"}
              </span>
            </div>
            <p className="mt-3 text-xs tabular-nums text-stone-dark">
              {m.number} · {formatDateDE(m.measured_at)}
            </p>
            <p className="truncate font-semibold">{m.title}</p>
            {!customerId && m.customer ? <p className="truncate text-sm text-stone-dark">{m.customer.company_name || m.customer.name}</p> : null}
            {m.site_address ? <p className="truncate text-sm text-stone-dark">{m.site_address}</p> : null}
            <p className="mt-3 flex flex-wrap gap-x-3 text-sm">
              <span className="font-semibold">{m.items.length} Position{m.items.length === 1 ? "" : "en"}</span>
              {photos ? <span className="text-stone-dark">{photos} Foto{photos === 1 ? "" : "s"}</span> : null}
              {total ? <span className="font-semibold text-accent">{fmtM2(total)}</span> : null}
            </p>
          </Link>
        );
      })}
      {!list.length && !customerId ? (
        <div className="sm:col-span-2 xl:col-span-2">
          <EmptyState icon={Ruler} title="Noch keine Aufmaße" text="Beim Kunden vor Ort: Foto machen, Breite und Höhe eintragen – fertig." />
        </div>
      ) : null}
    </div>
  );
}
