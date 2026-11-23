import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSettings } from "@/lib/settings/server";
import { customerOptions, listCatalog, newDraft } from "@/lib/documents/queries";
import { kindLabels, type DocumentKind } from "@/lib/documents/format";
import { DocumentEditor } from "./DocumentEditor";
import { PageHeader } from "@/components/admin/ui";
import { getMeasurement } from "@/lib/measure/server";
import { areaM2, fmtCm } from "@/lib/measure/shared";

const isUuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/.test(v);

export async function NewDocumentPage({ kind, searchParams }: { kind: DocumentKind; searchParams: Record<string, string | undefined> }) {
  const label = kindLabels[kind];
  const [draft, catalog, customers, settings] = await Promise.all([
    newDraft(kind, { customerId: isUuid(searchParams.kunde) ? searchParams.kunde : null, inquiryId: isUuid(searchParams.anfrage) ? searchParams.anfrage : null }),
    listCatalog(),
    customerOptions(),
    getSettings(),
  ]);
  // Aus einem Aufmaß: jede Position als Zeile (Menge = Fläche in m²)
  if (kind === "angebot" && isUuid(searchParams.aufmass)) {
    const am = await getMeasurement(searchParams.aufmass!);
    if (am) {
      draft.title = `Angebot – ${am.m.title}`;
      draft.reference = `Aufmaß ${am.m.number}`;
      draft.items = am.items.map((i) => {
        const area = Math.round(areaM2(i) * 100) / 100;
        return {
          description: `Pos. ${i.position}: ${i.label || "Position"}`,
          details: [`${fmtCm(i.width_cm)} × ${fmtCm(i.height_cm)}${i.quantity > 1 ? ` · ${i.quantity} Stück` : ""}`, i.material, i.notes].filter(Boolean).join("\n"),
          quantity: area || i.quantity,
          unit: area ? "m²" : "Stk.",
          unit_price: 0,
          vat_rate: settings.tax.defaultVatRate,
        };
      }) as typeof draft.items;
    }
  }
  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/admin/${label.path}`} className="inline-flex items-center gap-1.5 hover:text-accent">
            <ArrowLeft className="size-4" aria-hidden /> {label.many}
          </Link>
        }
        title={kind === "angebot" ? "Neues Angebot" : "Neue Rechnung"}
        description={kind === "angebot" ? "Die Angebotsnummer wird beim Anlegen automatisch vergeben." : "Die Rechnung wird als Entwurf angelegt. Die fortlaufende Rechnungsnummer wird beim Festschreiben bzw. Versand vergeben."}
      />
      <DocumentEditor kind={kind} initial={draft} catalog={catalog} customers={customers} smallBusiness={settings.tax.smallBusiness} defaultVat={settings.tax.defaultVatRate} />
    </>
  );
}
