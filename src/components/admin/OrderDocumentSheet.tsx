import Image from "next/image";
import Link from "next/link";
import {
  buildCustomerAddressLines,
  buildOrderDocumentItemSummary,
  formatCurrency,
  getOrderDocumentBranding,
  getOrderDocumentDetails,
  type OrderDocumentRecord,
} from "@/lib/orders/document-content";
import { type OrderDocumentQueryType } from "@/lib/orders/documents";

export function OrderDocumentPageStyles() {
  return (
    <style>{`
      @page {
        size: A4;
        margin: 12mm;
      }

      html {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      @media print {
        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff !important;
          color: #111111 !important;
        }

        .order-document-shell {
          padding: 0 !important;
          background: #ffffff !important;
        }

        .order-document-sheet {
          width: 100%;
          max-width: none !important;
          min-height: auto !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }

        .order-document-table thead {
          display: table-header-group;
        }

        .order-document-table tr,
        .order-document-metadata,
        .order-document-totals,
        .order-document-block {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `}</style>
  );
}

export function OrderDocumentSheet({
  order,
  documentQueryType,
  viewer,
  currentAdminName,
}: {
  order: OrderDocumentRecord;
  documentQueryType: OrderDocumentQueryType;
  viewer: "admin" | "shared";
  currentAdminName?: string | null;
}) {
  const branding = getOrderDocumentBranding();
  const documentDetails = getOrderDocumentDetails(order, documentQueryType);
  const customerAddressLines = buildCustomerAddressLines(order);

  return (
    <article className="order-document-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] border border-neutral-200 bg-white px-[14mm] py-[16mm] shadow-[0_24px_70px_rgba(15,23,42,0.12)] print:min-h-0 print:border-0 print:px-0 print:py-0 print:shadow-none">
      <header className="border-b border-neutral-300 pb-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {branding.logoSrc ? (
                <div className="flex h-14 w-44 items-center justify-start">
                  <Image
                    src={branding.logoSrc}
                    alt={`${branding.companyName} Logo`}
                    width={176}
                    height={56}
                    className="max-h-14 w-auto object-contain"
                    priority
                    unoptimized
                  />
                </div>
              ) : (
                <div className="border border-neutral-950 px-4 py-3 text-sm font-bold uppercase tracking-[0.35em] text-neutral-950">
                  {branding.logoFallbackText}
                </div>
              )}
            </div>

            <div className="space-y-1 text-sm leading-6 text-neutral-700">
              <p className="text-xl font-bold uppercase tracking-tight text-neutral-950">
                {branding.companyName}
              </p>
              {branding.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {branding.contactLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="space-y-5 md:text-right">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-neutral-400">
                {documentDetails.definition.label}
              </p>
              <h1 className="mt-3 text-4xl font-bold uppercase tracking-tight text-neutral-950">
                {documentDetails.definition.label}
              </h1>
            </div>

            <div className="grid gap-3 text-sm text-neutral-700 md:justify-items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  {documentDetails.definition.numberLabel}
                </p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {documentDetails.documentNumber}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Datum
                </p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {documentDetails.documentDate ?? "Entwurf"}
                </p>
              </div>
              {documentDetails.dueDate && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Faellig am
                  </p>
                  <p className="mt-1 font-semibold text-neutral-950">
                    {documentDetails.dueDate}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="order-document-block grid gap-7 border-b border-neutral-200 py-8 md:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
              Kunde
            </p>
            <div className="mt-3 space-y-1 text-sm leading-6 text-neutral-700">
              <p className="text-lg font-bold text-neutral-950">
                {order.customer?.name || order.customerName}
              </p>
              {order.customer?.companyName && <p>{order.customer.companyName}</p>}
              {customerAddressLines.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
              {viewer === "admin" && (
                <p>
                  {order.customer?.email ||
                    order.customerEmail ||
                    "Keine E-Mail hinterlegt"}
                </p>
              )}
              {viewer === "admin" && order.customer?.phone && (
                <p>{order.customer.phone}</p>
              )}
              {viewer === "admin" && order.customer?.taxId && (
                <p>Steuer-ID: {order.customer.taxId}</p>
              )}
            </div>
          </div>
        </div>

        <div className="order-document-metadata grid gap-4 border border-neutral-300 bg-neutral-50 p-5 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Bestellnummer
            </p>
            <p className="mt-1 font-semibold text-neutral-950">#{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Zahlungsstatus
            </p>
            <p className="mt-1 font-semibold text-neutral-950">
              {documentDetails.paymentStatusLabel}
            </p>
          </div>
          {viewer === "admin" && order.paymentMethod && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Zahlungsmethode
              </p>
              <p className="mt-1 font-semibold text-neutral-950">
                {order.paymentMethod}
              </p>
            </div>
          )}
          {viewer === "admin" && order.assignedTo && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Bearbeitet von
              </p>
              <p className="mt-1 font-semibold text-neutral-950">
                {order.assignedTo.name} ({order.assignedTo.role})
              </p>
            </div>
          )}
          {viewer === "admin" && order.isArchived && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Archivstatus
              </p>
              <p className="mt-1 font-semibold text-neutral-950">Archiviert</p>
            </div>
          )}
        </div>
      </section>

      <section className="order-document-block border-b border-neutral-200 py-8">
        <table className="order-document-table min-w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-300 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              <th className="w-[7%] py-3 pr-3">Pos.</th>
              <th className="w-[21%] py-3 pr-3">Leistung</th>
              <th className="w-[34%] py-3 pr-3">Beschreibung</th>
              <th className="w-[10%] py-3 pr-3 text-right">Menge</th>
              <th className="w-[14%] py-3 pr-3 text-right">Einzelpreis netto</th>
              <th className="w-[14%] py-3 text-right">Gesamt netto</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => {
              const itemSummary = buildOrderDocumentItemSummary(item);
              const unitNetPrice =
                item.quantity > 0 ? item.price / item.quantity : item.price;

              return (
                <tr
                  key={item.id}
                  className="border-b border-neutral-200 align-top text-sm text-neutral-700"
                >
                  <td className="py-4 pr-3 font-semibold text-neutral-950">
                    {index + 1}
                  </td>
                  <td className="py-4 pr-3">
                    <p className="font-semibold text-neutral-950">{item.serviceName}</p>
                  </td>
                  <td className="py-4 pr-3">
                    <div className="space-y-1.5 text-[11px] leading-5 text-neutral-600">
                      {itemSummary.description ? (
                        <p className="font-medium text-neutral-800">
                          {itemSummary.description}
                        </p>
                      ) : null}
                      {itemSummary.detailLines.map((line, lineIndex) => (
                        <p key={`${item.id}-${lineIndex}`}>{line}</p>
                      ))}
                      {!itemSummary.description &&
                      itemSummary.detailLines.length === 0 ? (
                        <p className="text-neutral-400">Standardposition</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-4 pr-3 text-right font-medium text-neutral-950">
                    {item.quantity}
                  </td>
                  <td className="py-4 pr-3 text-right font-medium text-neutral-950">
                    {formatCurrency(unitNetPrice, documentDetails.financials.currency)}
                  </td>
                  <td className="py-4 text-right font-semibold text-neutral-950">
                    {formatCurrency(item.price, documentDetails.financials.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-8 py-8 md:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          {order.customerNotes && (
            <div className="order-document-block">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
                Kundenhinweis
              </p>
              <p className="mt-3 text-sm leading-7 text-neutral-700">
                {order.customerNotes}
              </p>
            </div>
          )}

          {viewer === "admin" && order.paymentNotes && (
            <div className="order-document-block">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
                Zahlungsnotiz
              </p>
              <p className="mt-3 text-sm leading-7 text-neutral-700">
                {order.paymentNotes}
              </p>
            </div>
          )}

          {!order.customerNotes &&
          !(viewer === "admin" && order.paymentNotes) && (
            <p className="text-sm leading-7 text-neutral-500">
              {viewer === "admin"
                ? 'Dieses Dokument ist fuer Vorschau, Druck und "Als PDF speichern" optimiert.'
                : "Dieses Dokument wurde digital fuer die sichere Weitergabe bereitgestellt."}
            </p>
          )}
        </div>

        <div className="order-document-totals space-y-3 border border-neutral-300 bg-neutral-50 p-5">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3 text-sm">
            <span className="font-medium text-neutral-600">Zwischensumme netto</span>
            <span className="font-semibold text-neutral-950">
              {formatCurrency(
                documentDetails.financials.subtotalNet,
                documentDetails.financials.currency,
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3 text-sm">
            <span className="font-medium text-neutral-600">
              {documentDetails.discountLabel}
            </span>
            <span className="font-semibold text-neutral-950">
              -{formatCurrency(
                documentDetails.financials.discountAmount,
                documentDetails.financials.currency,
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3 text-sm">
            <span className="font-medium text-neutral-600">Gesamt netto</span>
            <span className="font-semibold text-neutral-950">
              {formatCurrency(
                documentDetails.financials.totalNet,
                documentDetails.financials.currency,
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3 text-sm">
            <span className="font-medium text-neutral-600">
              MwSt ({documentDetails.financials.taxRate.toFixed(2)} %)
            </span>
            <span className="font-semibold text-neutral-950">
              {formatCurrency(
                documentDetails.financials.taxAmount,
                documentDetails.financials.currency,
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-base">
            <span className="font-bold uppercase tracking-widest text-neutral-950">
              Gesamt brutto
            </span>
            <span className="text-xl font-bold text-neutral-950">
              {formatCurrency(
                documentDetails.financials.totalGross,
                documentDetails.financials.currency,
              )}
            </span>
          </div>
          <div className="border-t border-neutral-200 pt-3 text-xs leading-6 text-neutral-500">
            <p>Zahlungsstatus: {documentDetails.paymentStatusLabel}</p>
            <p>
              Bezahlt:{" "}
              {formatCurrency(
                order.paidAmount ?? 0,
                documentDetails.financials.currency,
              )}
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-300 pt-8 text-xs leading-6 text-neutral-500">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-bold uppercase tracking-[0.3em] text-neutral-400">
              Kontakt
            </p>
            <p className="mt-2 font-semibold text-neutral-700">
              {branding.companyName}
            </p>
            {branding.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {branding.contactLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="md:text-right">
            <p className="font-bold uppercase tracking-[0.3em] text-neutral-400">
              Rechtliche Angaben
            </p>
            <div className="mt-2 space-y-0.5">
              {branding.legalLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        {viewer === "admin" ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-dashed border-neutral-200 pt-4 print:hidden">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Admin-Dokument
            </span>
            <Link
              href={`/admin/orders/${order.id}`}
              className="text-[11px] font-semibold text-neutral-700 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-950"
            >
              /admin/orders/{order.id}
            </Link>
            {currentAdminName ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Bearbeiter: {currentAdminName}
              </span>
            ) : null}
          </div>
        ) : null}
      </footer>
    </article>
  );
}
