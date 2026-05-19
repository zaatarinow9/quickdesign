import { format } from "date-fns";
import {
  Archive,
  ArrowLeft,
  CreditCard,
  Download,
  FileText,
  MapPin,
  MessageSquare,
  RotateCcw,
  Save,
  ShieldCheck,
  Truck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addOrderInternalNote,
  archiveOrder,
  assignOrder,
  claimOrder,
  restoreArchivedOrder,
  updateOrderFinancials,
  updateOrderStatus,
} from "@/app/actions/order";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  canUpdateOrder,
  hasAdminPermission,
  isSuperAdmin,
} from "@/lib/admin/permissions";
import { formatCustomerLocation } from "@/lib/customers";
import {
  getOrderFinancials,
  getOrderPaymentStatus,
  normalizeDocumentType,
} from "@/lib/orders/finance";
import { canArchiveOrder as canArchiveOrderRecord } from "@/lib/orders/reporting";
import { prisma } from "@/lib/prisma";
import {
  extractStoredOrderTextInputs,
  getPricingModelLabel,
  getSnapshotOrBuildLegacy,
  normalizeLegacySelectedOptions,
  type ServiceConfigurationSnapshot,
} from "@/lib/services/configuration/snapshot";

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unbezahlt",
  PARTIALLY_PAID: "Teilweise bezahlt",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ORDER: "Auftrag",
  OFFER: "Angebot",
  INVOICE: "Rechnung",
};

type DesignPreviewLogo = {
  id: string;
  url: string;
};

type OrderDesignPreview = {
  model: string;
  color: string;
  frontLogos: DesignPreviewLogo[];
  backLogos: DesignPreviewLogo[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function parseDesignPreviewLogos(value: unknown): DesignPreviewLogo[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const id = normalizeOptionalString(entry.id);
      const url = normalizeOptionalString(entry.url);

      if (!id || !url) {
        return null;
      }

      return { id, url };
    })
    .filter((entry): entry is DesignPreviewLogo => entry !== null);
}

function parseStoredDesignPreview(value: unknown): OrderDesignPreview | null {
  if (!isRecord(value)) {
    return null;
  }

  const model = normalizeOptionalString(value.model);
  const color = normalizeOptionalString(value.color);

  if (!model || !color) {
    return null;
  }

  return {
    model,
    color,
    frontLogos: parseDesignPreviewLogos(value.frontLogos),
    backLogos: parseDesignPreviewLogos(value.backLogos),
  };
}

function formatCurrency(value: number, currency = "EUR"): string {
  return `${value.toFixed(2)} ${currency}`;
}

function formatDateInputValue(value: Date | null): string {
  return value ? format(new Date(value), "yyyy-MM-dd") : "";
}

function OrderSnapshotDetails({
  snapshot,
}: {
  snapshot: ServiceConfigurationSnapshot;
}) {
  return (
    <div className="space-y-6">
      <div className="border border-neutral-100 bg-neutral-50 p-6">
        <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-neutral-950">
          Konfigurations-Snapshot
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="text-xs font-bold text-neutral-600">
            <span className="block text-[9px] uppercase text-neutral-400">
              Preismodell
            </span>
            {getPricingModelLabel(snapshot.pricingModel)}
          </div>
          <div className="text-xs font-bold text-neutral-600">
            <span className="block text-[9px] uppercase text-neutral-400">
              Berechneter Gesamtpreis
            </span>
            {formatCurrency(snapshot.calculatedPrice.total)}
          </div>
          {snapshot.selectedPricingTier && (
            <div className="text-xs font-bold text-neutral-600">
              <span className="block text-[9px] uppercase text-neutral-400">
                Mengenstaffel
              </span>
              {snapshot.selectedPricingTier.label}
            </div>
          )}
          {snapshot.size && (
            <div className="text-xs font-bold text-neutral-600">
              <span className="block text-[9px] uppercase text-neutral-400">
                {snapshot.size.fieldLabel}
              </span>
              {snapshot.size.value}
            </div>
          )}
          {snapshot.color && (
            <div className="text-xs font-bold text-neutral-600">
              <span className="block text-[9px] uppercase text-neutral-400">
                {snapshot.color.fieldLabel}
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-neutral-300"
                  style={{ backgroundColor: snapshot.color.hex }}
                ></span>
                {snapshot.color.value}
              </span>
            </div>
          )}
          {snapshot.customQuote && (
            <div className="text-xs font-bold text-amber-700">
              <span className="block text-[9px] uppercase text-amber-500">
                Preisstatus
              </span>
              Preis auf Anfrage
            </div>
          )}
        </div>
      </div>

      {snapshot.area && (
        <div className="border border-neutral-200 bg-white p-6">
          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-neutral-950">
            Flaechenberechnung
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-xs font-bold text-neutral-600">
              <span className="block text-[9px] uppercase text-neutral-400">
                Breite
              </span>
              {snapshot.area.widthCm.toFixed(1)} cm
            </div>
            <div className="text-xs font-bold text-neutral-600">
              <span className="block text-[9px] uppercase text-neutral-400">
                Hoehe
              </span>
              {snapshot.area.heightCm.toFixed(1)} cm
            </div>
            <div className="text-xs font-bold text-neutral-600">
              <span className="block text-[9px] uppercase text-neutral-400">
                Flaeche
              </span>
              {snapshot.area.areaSqm.toFixed(3)} m2
            </div>
            <div className="text-xs font-bold text-neutral-600">
              <span className="block text-[9px] uppercase text-neutral-400">
                Preis pro m2
              </span>
              {formatCurrency(snapshot.area.pricePerSqm)}
            </div>
          </div>
        </div>
      )}

      {snapshot.selectedOptions.length > 0 && (
        <div className="border border-neutral-200 bg-white p-6">
          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-neutral-950">
            Gewaehlte Optionen
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {snapshot.selectedOptions.map((option) => (
              <div
                key={`${option.fieldKey}-${option.valueLabel}`}
                className="text-xs font-bold text-neutral-600"
              >
                <span className="block text-[9px] uppercase text-neutral-400">
                  {option.fieldLabel}
                </span>
                {option.valueLabel}
                {option.priceImpact > 0
                  ? ` (+${option.priceImpact.toFixed(2)} EUR)`
                  : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshot.textFields.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-950">
            Zusatzangaben
          </h4>
          {snapshot.textFields.map((field) => (
            <div
              key={field.fieldKey}
              className="flex items-center justify-between border border-neutral-200 bg-white p-4"
            >
              <div>
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                  {field.fieldLabel}
                </span>
                <span className="text-xs font-bold text-neutral-950">
                  {field.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {snapshot.uploadFields.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-950">
            Uploads
          </h4>
          {snapshot.uploadFields.flatMap((field) =>
            field.files.map((file, index) => (
              <div
                key={`${field.fieldKey}-${index}`}
                className="flex items-center justify-between border border-neutral-200 bg-white p-4"
              >
                <div>
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                    {field.fieldLabel}
                  </span>
                  <span className="block text-xs font-bold text-neutral-950">
                    {file.fileName}
                  </span>
                  {file.customerLabel && (
                    <span className="text-[11px] text-neutral-500">
                      Label: {file.customerLabel}
                    </span>
                  )}
                </div>
                {file.fileUrl && (
                  <a
                    href={file.fileUrl}
                    download={file.fileName}
                    className="flex items-center gap-2 bg-neutral-950 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                )}
              </div>
            )),
          )}
        </div>
      )}

      {snapshot.orderNotes && (
        <div className="border border-yellow-100 bg-yellow-50/50 p-6">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-yellow-800">
            Kundenanmerkung
          </h4>
          <p className="text-xs font-bold leading-relaxed text-neutral-700">
            {snapshot.orderNotes}
          </p>
        </div>
      )}
    </div>
  );
}

export default async function OrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    archiveError?: string;
    archived?: string;
    created?: string;
    forbidden?: string;
    restored?: string;
  }>;
}) {
  const { id } = await params;
  const pageParams = searchParams ? await searchParams : {};
  const currentUser = await requireAdminPermission("canManageOrders");
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
      archivedBy: {
        select: {
          name: true,
          role: true,
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          adminUser: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return notFound();
  }

  const financials = getOrderFinancials(order);
  const canAssignOrders = hasAdminPermission(currentUser, "canAssignOrders");
  const canClaimOrders = hasAdminPermission(currentUser, "canClaimOrders");
  const canEditOrder = canUpdateOrder(currentUser, {
    assignedToId: order.assignedToId,
  });
  const canEditOrderFinancials = hasAdminPermission(
    currentUser,
    "canEditFinancials",
  );
  const canUseArchiveWorkflow = hasAdminPermission(
    currentUser,
    "canArchiveOrders",
  );
  const canArchiveCurrentOrder =
    canUseArchiveWorkflow && canArchiveOrderRecord(order);
  const canRestoreArchivedOrder =
    isSuperAdmin(currentUser) && Boolean(order.isArchived);
  const isArchivedOrder = Boolean(order.isArchived);
  const activeStaff = canAssignOrders
    ? await prisma.adminUser.findMany({
        where: { isActive: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          role: true,
        },
      })
    : [];
  const customerLocation = order.customer
    ? formatCustomerLocation(order.customer)
    : "";
  const paymentStatus = getOrderPaymentStatus(order);
  const documentType = normalizeDocumentType(order.documentType);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:text-neutral-950"
      >
        <ArrowLeft className="h-3 w-3" /> Zurueck zur Uebersicht
      </Link>

      {pageParams.created && (
        <div className="border border-green-100 bg-green-50 p-4 text-xs font-bold uppercase tracking-widest text-green-700">
          Auftrag wurde erstellt.
        </div>
      )}
      {pageParams.archived && (
        <div className="border border-amber-100 bg-amber-50 p-4 text-xs font-bold uppercase tracking-widest text-amber-800">
          Auftrag wurde archiviert.
        </div>
      )}
      {pageParams.restored && (
        <div className="border border-green-100 bg-green-50 p-4 text-xs font-bold uppercase tracking-widest text-green-700">
          Auftrag wurde aus dem Archiv wiederhergestellt.
        </div>
      )}
      {pageParams.archiveError && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Archivieren ist erst moeglich, wenn der Auftrag abgeschlossen oder storniert ist.
        </div>
      )}
      {pageParams.forbidden && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Sie haben fuer diese Aktion keine Berechtigung.
        </div>
      )}
      {isArchivedOrder && (
        <div className="border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
            Archivierter Auftrag
          </p>
          <p className="mt-2 font-medium">
            Dieser Auftrag befindet sich im Archiv und bleibt in der Admin-Oberflaeche
            schreibgeschuetzt.
          </p>
          {(order.archivedAt || order.archivedBy) && (
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-700">
              {order.archivedAt
                ? `Archiviert am ${format(new Date(order.archivedAt), "dd.MM.yyyy HH:mm")}`
                : "Archiviert"}
              {order.archivedBy ? ` von ${order.archivedBy.name}` : ""}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 border-b border-neutral-100 pb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">
            Bestellung #{order.orderNumber}
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
            Eingegangen am {format(new Date(order.createdAt), "dd.MM.yyyy 'um' HH:mm")}
          </p>
        </div>
        <div className="bg-neutral-950 px-8 py-4 text-center text-white">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Brutto gesamt
          </p>
          <p className="text-3xl font-bold tracking-tighter">
            {formatCurrency(financials.totalGross, financials.currency)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-5 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-neutral-100 pb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <MapPin className="h-4 w-4" /> Kunde
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold text-neutral-950">
                {order.customerName}
              </p>
              <p className="mt-1 text-[11px] font-bold text-neutral-500">
                {order.customerEmail || "Keine E-Mail hinterlegt"}
              </p>
              {order.customer?.companyName && (
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                  {order.customer.companyName}
                </p>
              )}
            </div>

            {order.customer && (
              <div className="space-y-2 border-t border-neutral-100 pt-4">
                <p className="text-xs font-bold text-neutral-950">
                  {order.customer.phone || "Kein Telefon hinterlegt"}
                </p>
                <p className="text-sm text-neutral-600">
                  {order.customer.address || "Keine Adresse hinterlegt"}
                </p>
                {customerLocation && (
                  <p className="text-sm text-neutral-600">{customerLocation}</p>
                )}
                {order.customer.taxId && (
                  <p className="text-[11px] font-bold text-neutral-500">
                    Steuer-ID: {order.customer.taxId}
                  </p>
                )}
                <Link
                  href={`/admin/customers/${order.customer.id}`}
                  className="inline-flex items-center gap-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-950"
                >
                  Kundenprofil oeffnen
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-neutral-100 pb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <UserCheck className="h-4 w-4" /> Zustaendigkeit
          </h2>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Zugewiesen an
            </p>
            <p className="text-lg font-bold text-neutral-950">
              {order.assignedTo
                ? `${order.assignedTo.name} (${order.assignedTo.role})`
                : "Nicht zugewiesen"}
            </p>
            {order.assignedAt && (
              <p className="text-[11px] font-bold text-neutral-500">
                Seit {format(new Date(order.assignedAt), "dd.MM.yyyy HH:mm")}
              </p>
            )}
          </div>

          {canAssignOrders && !isArchivedOrder && (
            <form action={assignOrder} className="space-y-4">
              <input type="hidden" name="orderId" value={order.id} />
              <select
                name="assignedToId"
                defaultValue={order.assignedToId ?? ""}
                className="w-full border border-neutral-200 bg-neutral-50 p-4 text-xs font-bold uppercase tracking-widest outline-none focus:border-neutral-950"
              >
                <option value="">Nicht zugewiesen</option>
                {activeStaff.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full bg-neutral-950 p-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800"
              >
                Zuweisung speichern
              </button>
            </form>
          )}

          {!order.assignedToId &&
            canClaimOrders &&
            !canAssignOrders &&
            !isArchivedOrder && (
            <form action={claimOrder}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="w-full bg-neutral-950 p-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800"
              >
                Auftrag uebernehmen
              </button>
            </form>
          )}

          {isArchivedOrder && (
            <p className="border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-relaxed text-amber-700">
              Archivierte Auftraege koennen nicht neu zugewiesen oder uebernommen werden.
            </p>
          )}
        </div>

        <div className="space-y-5 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-neutral-100 pb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <ShieldCheck className="h-4 w-4" /> Interne Steuerung
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Interner Status
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-950">
                {order.internalStatus}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Prioritaet
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-950">
                {order.priority}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 pt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Archivstatus
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-950">
                {isArchivedOrder ? "Archiviert" : "Aktiv"}
              </p>
              {order.archivedAt && (
                <p className="mt-1 text-[11px] font-bold text-neutral-500">
                  {format(new Date(order.archivedAt), "dd.MM.yyyy HH:mm")}
                </p>
              )}
              {order.archivedBy && (
                <p className="mt-1 text-[11px] font-bold text-neutral-500">
                  Durch {order.archivedBy.name} ({order.archivedBy.role})
                </p>
              )}
            </div>
          </div>
          {!canEditOrder && (
            <p className="border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-relaxed text-amber-700">
              Statusaenderungen sind nur fuer Super Admins oder den zugewiesenen
              Mitarbeiter moeglich.
            </p>
          )}
          {canArchiveCurrentOrder && (
            <form action={archiveOrder}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 border border-amber-200 bg-amber-50 p-4 text-xs font-bold uppercase tracking-widest text-amber-900 transition-colors hover:bg-amber-100"
              >
                <Archive className="h-4 w-4" /> Auftrag archivieren
              </button>
            </form>
          )}
          {canRestoreArchivedOrder && (
            <form action={restoreArchivedOrder}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 border border-neutral-200 bg-white p-4 text-xs font-bold uppercase tracking-widest text-neutral-950 transition-colors hover:border-neutral-950"
              >
                <RotateCcw className="h-4 w-4" /> Aus Archiv wiederherstellen
              </button>
            </form>
          )}
          {!isArchivedOrder && canUseArchiveWorkflow && !canArchiveCurrentOrder && (
            <p className="text-xs font-bold leading-relaxed text-neutral-500">
              Archivierung ist verfuegbar, sobald der Auftrag abgeschlossen oder
              storniert wurde.
            </p>
          )}
          {!isArchivedOrder && !canUseArchiveWorkflow && (
            <p className="text-xs font-bold leading-relaxed text-neutral-500">
              Archivierung und Wiederherstellung stehen nur Admins und Super Admins
              zur Verfuegung.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-neutral-100 pb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <Truck className="h-4 w-4" /> Auftragsstatus & Tracking
          </h2>
          <form
            action={updateOrderStatus}
            className="grid grid-cols-1 gap-6 md:grid-cols-5 md:items-end"
          >
            <input type="hidden" name="orderId" value={order.id} />
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest">
                Status
              </label>
              <select
                name="status"
                defaultValue={order.status}
                disabled={!canEditOrder || isArchivedOrder}
                className="w-full border border-neutral-200 bg-neutral-50 p-4 text-xs font-bold uppercase tracking-widest outline-none focus:border-neutral-950"
              >
                <option value="PAID">Neu</option>
                <option value="PROCESSING">In Produktion</option>
                <option value="SHIPPED">Versendet</option>
                <option value="DELIVERED">Zugestellt</option>
                <option value="CANCELED">Storniert</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest">
                Interner Status
              </label>
              <select
                name="internalStatus"
                defaultValue={order.internalStatus}
                disabled={!canEditOrder || isArchivedOrder}
                className="w-full border border-neutral-200 bg-neutral-50 p-4 text-xs font-bold uppercase tracking-widest outline-none focus:border-neutral-950"
              >
                <option value="NEW">Neu</option>
                <option value="IN_REVIEW">In Pruefung</option>
                <option value="IN_PRODUCTION">In Produktion</option>
                <option value="WAITING_CUSTOMER">Wartet auf Kunde</option>
                <option value="READY">Bereit</option>
                <option value="DONE">Erledigt</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest">
                Prioritaet
              </label>
              <select
                name="priority"
                defaultValue={order.priority}
                disabled={!canEditOrder || isArchivedOrder}
                className="w-full border border-neutral-200 bg-neutral-50 p-4 text-xs font-bold uppercase tracking-widest outline-none focus:border-neutral-950"
              >
                <option value="LOW">Niedrig</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Hoch</option>
                <option value="URGENT">Dringend</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest">
                Sendungsnummer
              </label>
              <input
                name="trackingNumber"
                defaultValue={order.trackingNumber ?? ""}
                placeholder="z. B. DHL12345678"
                disabled={!canEditOrder || isArchivedOrder}
                className="w-full border border-neutral-200 bg-neutral-50 p-4 text-xs font-bold outline-none focus:border-neutral-950"
              />
            </div>
            <button
              type="submit"
              disabled={!canEditOrder || isArchivedOrder}
              className="flex h-[50px] items-center justify-center gap-2 bg-neutral-950 p-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
            >
              <Save className="h-4 w-4" /> Speichern
            </button>
          </form>
          {isArchivedOrder && (
            <p className="border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-relaxed text-amber-700">
              Archivierte Auftraege koennen nicht mehr in Status oder Tracking
              veraendert werden.
            </p>
          )}
        </div>

        <div className="space-y-6 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-neutral-100 pb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <MessageSquare className="h-4 w-4" /> Interne Notiz
          </h2>
          {canEditOrder && !isArchivedOrder ? (
            <form action={addOrderInternalNote} className="space-y-4">
              <input type="hidden" name="orderId" value={order.id} />
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Interne Notiz hinzufuegen..."
                className="w-full resize-none border border-neutral-200 bg-neutral-50 p-4 text-xs outline-none focus:border-neutral-950"
              />
              <button
                type="submit"
                className="w-full bg-neutral-950 p-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800"
              >
                Notiz speichern
              </button>
            </form>
          ) : isArchivedOrder ? (
            <p className="text-xs font-bold leading-relaxed text-neutral-500">
              Archivierte Auftraege bleiben im Verlauf sichtbar, koennen aber nicht
              mehr mit neuen internen Notizen erweitert werden.
            </p>
          ) : (
            <p className="text-xs font-bold leading-relaxed text-neutral-500">
              Uebernehmen Sie den Auftrag zuerst oder lassen Sie ihn durch einen
              Super Admin zuweisen.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <div className="space-y-6 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-neutral-100 pb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <CreditCard className="h-4 w-4" /> Zahlung, Netto / Brutto & Dokument
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Zwischensumme netto
              </p>
              <p className="mt-3 text-lg font-bold text-neutral-950">
                {formatCurrency(financials.subtotalNet, financials.currency)}
              </p>
            </div>
            <div className="border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Rabatt
              </p>
              <p className="mt-3 text-lg font-bold text-neutral-950">
                {order.discountType ?? "NONE"} / {financials.discountAmount.toFixed(2)}{" "}
                {financials.currency}
              </p>
            </div>
            <div className="border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Netto gesamt
              </p>
              <p className="mt-3 text-lg font-bold text-neutral-950">
                {formatCurrency(financials.totalNet, financials.currency)}
              </p>
            </div>
            <div className="border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                MwSt
              </p>
              <p className="mt-3 text-lg font-bold text-neutral-950">
                {financials.taxRate.toFixed(2)}% /{" "}
                {formatCurrency(financials.taxAmount, financials.currency)}
              </p>
            </div>
            <div className="border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Brutto gesamt
              </p>
              <p className="mt-3 text-lg font-bold text-neutral-950">
                {formatCurrency(financials.totalGross, financials.currency)}
              </p>
            </div>
            <div className="border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Zahlungsstatus
              </p>
              <p className="mt-3 text-lg font-bold text-neutral-950">
                {PAYMENT_STATUS_LABELS[paymentStatus]}
              </p>
              <p className="mt-1 text-[11px] font-bold text-neutral-500">
                Bezahlt: {formatCurrency(order.paidAmount ?? 0, financials.currency)}
              </p>
            </div>
            <div className="border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Dokumenttyp
              </p>
              <p className="mt-3 text-lg font-bold text-neutral-950">
                {DOCUMENT_TYPE_LABELS[documentType]}
              </p>
            </div>
            <div className="border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Belegnummer
              </p>
              <p className="mt-3 text-lg font-bold text-neutral-950">
                {order.invoiceNumber || "Nicht gesetzt"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Rechnungsdatum
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-950">
                {order.invoiceDate
                  ? format(new Date(order.invoiceDate), "dd.MM.yyyy")
                  : "Nicht gesetzt"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Faelligkeit
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-950">
                {order.dueDate
                  ? format(new Date(order.dueDate), "dd.MM.yyyy")
                  : "Nicht gesetzt"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Zahlungsmethode
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-950">
                {order.paymentMethod || "Nicht gesetzt"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Zahlungsnotizen
              </p>
              <p className="mt-2 text-sm text-neutral-700">
                {order.paymentNotes || "Keine Notizen"}
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t border-neutral-100 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Kundenhinweis
            </p>
            <p className="text-sm leading-7 text-neutral-700">
              {order.customerNotes || "Kein Kundenhinweis hinterlegt."}
            </p>
          </div>

          <div className="space-y-3 border-t border-neutral-100 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Interne Auftragsnotiz
            </p>
            <p className="text-sm leading-7 text-neutral-700">
              {order.internalNotes || "Keine interne Auftragsnotiz hinterlegt."}
            </p>
          </div>
        </div>

        <div className="space-y-6 border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-neutral-100 pb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <FileText className="h-4 w-4" /> Finanzdaten aktualisieren
          </h2>

          {canEditOrderFinancials && !isArchivedOrder ? (
            <form action={updateOrderFinancials} className="space-y-4">
              <input type="hidden" name="orderId" value={order.id} />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <select
                  name="discountType"
                  defaultValue={order.discountType ?? "NONE"}
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                >
                  <option value="NONE">Kein Rabatt</option>
                  <option value="PERCENTAGE">Rabatt in %</option>
                  <option value="FIXED">Fixer Rabatt</option>
                </select>
                <input
                  name="discountValue"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={order.discountValue ?? 0}
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                />
                <input
                  name="taxRate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={order.taxRate ?? financials.taxRate}
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                />
                <select
                  name="paymentStatus"
                  defaultValue={paymentStatus}
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                >
                  <option value="UNPAID">Unbezahlt</option>
                  <option value="PARTIALLY_PAID">Teilweise bezahlt</option>
                  <option value="PAID">Bezahlt</option>
                  <option value="REFUNDED">Erstattet</option>
                </select>
                <input
                  name="paidAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={order.paidAmount ?? 0}
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                />
                <input
                  name="paymentMethod"
                  defaultValue={order.paymentMethod ?? ""}
                  placeholder="Zahlungsmethode"
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                />
                <select
                  name="documentType"
                  defaultValue={documentType}
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                >
                  <option value="ORDER">Auftrag</option>
                  <option value="OFFER">Angebot</option>
                  <option value="INVOICE">Rechnung</option>
                </select>
                <input
                  name="invoiceNumber"
                  defaultValue={order.invoiceNumber ?? ""}
                  placeholder="Belegnummer"
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                />
                <input
                  name="invoiceDate"
                  type="date"
                  defaultValue={formatDateInputValue(order.invoiceDate)}
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                />
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={formatDateInputValue(order.dueDate)}
                  className="border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
                />
              </div>

              <textarea
                name="paymentNotes"
                rows={3}
                defaultValue={order.paymentNotes ?? ""}
                placeholder="Zahlungsnotizen"
                className="w-full resize-none border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
              />
              <textarea
                name="customerNotes"
                rows={4}
                defaultValue={order.customerNotes ?? ""}
                placeholder="Hinweis fuer Kunde / Angebot / Rechnung"
                className="w-full resize-none border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
              />
              <textarea
                name="internalNotes"
                rows={4}
                defaultValue={order.internalNotes ?? ""}
                placeholder="Interne Auftragsnotiz"
                className="w-full resize-none border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-neutral-950"
              />

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 bg-neutral-950 p-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800"
              >
                <Save className="h-4 w-4" /> Finanzdaten speichern
              </button>
            </form>
          ) : isArchivedOrder ? (
            <p className="text-sm leading-7 text-neutral-500">
              Archivierte Auftraege sind finanziell eingefroren. Stellen Sie den
              Auftrag erst wieder her, wenn weitere Anpassungen notwendig sind.
            </p>
          ) : (
            <p className="text-sm leading-7 text-neutral-500">
              Diese Felder koennen nur von Super Admins und Admins mit
              Finanzfreigabe bearbeitet werden.
            </p>
          )}
        </div>
      </div>

      <div className="border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="mb-8 border-b border-neutral-100 pb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
          Bestellte Artikel & Konfiguration
        </h2>
        <div className="space-y-12">
          {order.items.map((item, index) => {
            const selectedOptions = normalizeLegacySelectedOptions(
              item.selectedOptions,
            );
            const storedTextInputs = extractStoredOrderTextInputs(item.textInputs);
            const designPreview = parseStoredDesignPreview(item.designData);
            const snapshot = getSnapshotOrBuildLegacy({
              serviceId: item.serviceId,
              serviceName: item.serviceName,
              basePrice: item.price,
              totalPrice: item.price,
              quantity: item.quantity,
              selectedOptions,
              textInputs: storedTextInputs.textInputs,
              designData: item.designData,
              orderNotes: item.orderNotes,
              configurationSnapshot: storedTextInputs.configurationSnapshot,
            });

            return (
              <div
                key={item.id}
                className={`pb-12 ${
                  index !== order.items.length - 1 ? "border-b border-neutral-100" : ""
                }`}
              >
                <div className="flex flex-col gap-8 md:flex-row">
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold uppercase tracking-tighter text-neutral-950">
                          {item.serviceName}
                        </h3>
                        {item.itemDescription && (
                          <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                            {item.itemDescription}
                          </p>
                        )}
                        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-neutral-400">
                          Menge: {item.quantity} | Positionspreis: {formatCurrency(item.price, financials.currency)}
                        </p>
                      </div>
                    </div>

                    <OrderSnapshotDetails snapshot={snapshot} />
                  </div>

                  {designPreview && (
                    <div className="w-full border border-neutral-200 bg-neutral-50 p-6 md:w-72">
                      <h4 className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-950">
                        Design Vorschau
                      </h4>
                      <div className="relative mb-4 flex aspect-square flex-col items-center justify-center border border-neutral-200 bg-white p-4">
                        <span className="absolute left-2 top-2 text-[9px] font-bold uppercase text-neutral-400">
                          Modell: {designPreview.model}
                        </span>
                        <div
                          className="mt-4 h-12 w-12 rounded-full border border-neutral-200 shadow-inner"
                          style={{ backgroundColor: designPreview.color }}
                        ></div>
                        <span className="mt-4 text-[9px] font-bold uppercase tracking-widest">
                          Farbe
                        </span>
                      </div>

                      <div className="space-y-2">
                        {designPreview.frontLogos.map((logo, logoIndex) => (
                          <a
                            key={logo.id}
                            href={logo.url}
                            download={`front_logo_${logoIndex + 1}.png`}
                            className="flex items-center justify-between border border-neutral-200 bg-white p-3 text-[10px] font-bold uppercase hover:bg-neutral-50"
                          >
                            Front Logo {logoIndex + 1}
                            <Download className="h-3 w-3 text-neutral-400" />
                          </a>
                        ))}
                        {designPreview.backLogos.map((logo, logoIndex) => (
                          <a
                            key={logo.id}
                            href={logo.url}
                            download={`back_logo_${logoIndex + 1}.png`}
                            className="flex items-center justify-between border border-neutral-200 bg-white p-3 text-[10px] font-bold uppercase hover:bg-neutral-50"
                          >
                            Back Logo {logoIndex + 1}
                            <Download className="h-3 w-3 text-neutral-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="mb-8 flex items-center gap-2 border-b border-neutral-100 pb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
          <MessageSquare className="h-4 w-4" /> Interner Verlauf
        </h2>
        <div className="space-y-4">
          {order.activities.map((activity) => (
            <div
              key={activity.id}
              className="border border-neutral-200 bg-neutral-50 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    {activity.type}
                  </p>
                  <p className="mt-2 text-sm font-bold text-neutral-950">
                    {activity.adminUser
                      ? `${activity.adminUser.name} (${activity.adminUser.role})`
                      : "System"}
                  </p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  {format(new Date(activity.createdAt), "dd.MM.yyyy HH:mm")}
                </p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                {activity.message}
              </p>
            </div>
          ))}

          {order.activities.length === 0 && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">
              Noch keine internen Aktivitaeten vorhanden.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
