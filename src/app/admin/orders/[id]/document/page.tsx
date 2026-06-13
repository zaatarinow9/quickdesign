import { ArrowLeft, Download, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDocumentAutoPrint } from "@/components/admin/OrderDocumentAutoPrint";
import { OrderDocumentEmailForm } from "@/components/admin/OrderDocumentEmailForm";
import { OrderDocumentPrintButton } from "@/components/admin/OrderDocumentPrintButton";
import {
  OrderDocumentPageStyles,
  OrderDocumentSheet,
} from "@/components/admin/OrderDocumentSheet";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  getOrderDocumentDetails,
  getOrderDocumentRecord,
} from "@/lib/orders/document-content";
import {
  buildOrderDocumentDownloadHref,
  buildOrderDocumentHref,
  normalizeOrderDocumentQueryType,
  ORDER_DOCUMENT_LINKS,
  type OrderDocumentQueryType,
} from "@/lib/orders/documents";

export default async function OrderDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    type?: string;
    download?: string;
    autoprint?: string;
  }>;
}) {
  const currentUser = await requireAdminPermission("canManageOrders");
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const order = await getOrderDocumentRecord(id);

  if (!order) {
    return notFound();
  }

  const documentQueryType = normalizeOrderDocumentQueryType(
    resolvedSearchParams.type,
    order.documentType,
  );
  const documentDetails = getOrderDocumentDetails(order, documentQueryType);
  const autoPrint = resolvedSearchParams.autoprint === "1";
  const browserDownloadMode = resolvedSearchParams.download === "browser";
  const defaultSubjectByType = ORDER_DOCUMENT_LINKS.reduce(
    (subjectMap, documentLink) => {
      const nextDocumentDetails = getOrderDocumentDetails(order, documentLink.type);

      return {
        ...subjectMap,
        [documentLink.type]: nextDocumentDetails.defaultEmailSubject,
      };
    },
    {} as Record<OrderDocumentQueryType, string>,
  );

  return (
    <div className="order-document-shell min-h-screen bg-neutral-100 px-4 py-8 text-neutral-950 print:bg-white print:px-0 print:py-0">
      <OrderDocumentPageStyles />
      <OrderDocumentAutoPrint enabled={autoPrint} />

      <div className="mx-auto flex w-full max-w-[220mm] flex-col gap-4">
        <div className="flex flex-col gap-3 print:hidden md:flex-row md:items-center md:justify-between">
          <Link
            href={`/admin/orders/${order.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück zur Bestellung
          </Link>
          <div className="flex flex-wrap gap-2">
            {ORDER_DOCUMENT_LINKS.map((documentLink) => {
              const href = buildOrderDocumentHref(order.id, documentLink.type);
              const isActive = documentLink.type === documentQueryType;

              return (
                <Link
                  key={documentLink.type}
                  href={href}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-neutral-950 text-white"
                      : "border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950"
                  }`}
                >
                  <FileText className="h-4 w-4" /> {documentLink.label}
                </Link>
              );
            })}
            <Link
              href={buildOrderDocumentDownloadHref(order.id, documentQueryType)}
              className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950"
            >
              <Download className="h-4 w-4" /> PDF herunterladen
            </Link>
            <OrderDocumentPrintButton />
          </div>
        </div>

        {browserDownloadMode ? (
          <div className="border border-neutral-200 bg-white p-4 text-sm text-neutral-700 print:hidden">
            Für Phase 8B nutzt "PDF herunterladen" den Browser-Druckdialog. Wählen
            Sie dort bitte "Als PDF speichern", damit Vorschau und Ausgabe möglichst
            gleich bleiben.
          </div>
        ) : null}

        <OrderDocumentEmailForm
          orderId={order.id}
          defaultRecipient={order.customer?.email || order.customerEmail || ""}
          defaultDocumentType={documentQueryType}
          defaultSubjectByType={defaultSubjectByType}
          compact
        />

        <OrderDocumentSheet
          order={order}
          documentQueryType={documentQueryType}
          viewer="admin"
          currentAdminName={currentUser.name}
        />

        <p className="px-2 text-xs text-neutral-500 print:hidden">
          Aktuelles Dokument: {documentDetails.definition.label}{" "}
          {documentDetails.documentNumber}
        </p>
      </div>
    </div>
  );
}
