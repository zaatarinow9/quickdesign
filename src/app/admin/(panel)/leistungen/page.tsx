import { BookOpen, Star, Trash2 } from "lucide-react";
import { requireFullAccess } from "@/lib/auth";
import { listCatalog } from "@/lib/documents/queries";
import { formatEuro, grossFromNet } from "@/lib/documents/format";
import { deleteService, toggleServiceFlag } from "@/app/admin/service-actions";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { ConfirmSubmit } from "@/components/admin/documents/panels";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Leistungskatalog" };

export default async function ServicesPage() {
  await requireFullAccess();
  const services = await listCatalog(true);
  const categories = [...new Set(services.map((s) => s.category).filter((c): c is string => !!c))].sort();

  return (
    <>
      <PageHeader
        title="Leistungskatalog"
        description="Vordefinierte Leistungen mit Netto- und Bruttopreis. Favoriten erscheinen im Angebots- und Rechnungseditor als Schnellauswahl; die Sortierung passt sich automatisch an die Nutzung an."
      />
      <Card title="Neue Leistung">
        <ServiceForm categories={categories} />
      </Card>

      <Card className="mt-6" title={`${services.length} Leistungen`} padded={false}>
        {services.length ? (
          <ul className="divide-y divide-ink/[0.06]">
            {services.map((s) => (
              <li key={s.id} className={s.active ? "" : "opacity-60"}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-3.5 hover:bg-ink/[0.02]">
                    <form action={toggleServiceFlag} className="shrink-0">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="field" value="is_favorite" />
                      <input type="hidden" name="value" value={String(!s.is_favorite)} />
                      <button type="submit" aria-label={s.is_favorite ? "Aus Schnellauswahl entfernen" : "Zur Schnellauswahl"} title="Häufig genutzt">
                        <Star className={`size-4 ${s.is_favorite ? "fill-amber-400 text-amber-400" : "text-stone-light"}`} aria-hidden />
                      </button>
                    </form>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="block truncate text-xs text-stone-dark">
                        {[s.category, s.unit, s.usage_count ? `${s.usage_count}× verwendet` : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {!s.active ? <Badge>inaktiv</Badge> : null}
                    <span className="text-right text-sm tabular-nums">
                      <span className="block font-semibold">{formatEuro(s.price_net)} netto</span>
                      <span className="block text-xs text-stone-dark">
                        {formatEuro(grossFromNet(s.price_net, s.vat_rate))} brutto · {s.vat_rate} %
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-ink/[0.06] bg-[#fbfaf8] px-5 py-5">
                    <ServiceForm service={s} categories={categories} />
                    <form action={deleteService} className="mt-4 border-t border-ink/[0.06] pt-4">
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmSubmit className="adm-btn adm-btn-danger adm-btn-sm" message={`„${s.name}“ aus dem Katalog löschen? Bestehende Angebote/Rechnungen bleiben unverändert.`}>
                        <Trash2 className="size-3.5" aria-hidden /> Löschen
                      </ConfirmSubmit>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={BookOpen} title="Noch keine Leistungen" />
        )}
      </Card>
    </>
  );
}
