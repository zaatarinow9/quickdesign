import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSettings } from "@/lib/settings/server";
import { customerOptions, listCatalog, newDraft } from "@/lib/documents/queries";
import { kindLabels, type DocumentKind } from "@/lib/documents/format";
import { DocumentEditor } from "./DocumentEditor";
import { PageHeader } from "@/components/admin/ui";

const isUuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/.test(v);

export async function NewDocumentPage({ kind, searchParams }: { kind: DocumentKind; searchParams: Record<string, string | undefined> }) {
  const label = kindLabels[kind];
  const [draft, catalog, customers, settings] = await Promise.all([
    newDraft(kind, { customerId: isUuid(searchParams.kunde) ? searchParams.kunde : null, inquiryId: isUuid(searchParams.anfrage) ? searchParams.anfrage : null }),
    listCatalog(),
    customerOptions(),
    getSettings(),
  ]);
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
