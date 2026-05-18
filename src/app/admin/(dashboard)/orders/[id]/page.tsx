import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Save,
  Download,
  Truck,
  UserCheck,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  addOrderInternalNote,
  assignOrder,
  claimOrder,
  updateOrderStatus,
} from "@/app/actions/order";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  canUpdateOrder,
  hasAdminPermission,
} from "@/lib/admin/permissions";
import {
  extractStoredOrderTextInputs,
  getPricingModelLabel,
  getSnapshotOrBuildLegacy,
  normalizeLegacySelectedOptions,
  type ServiceConfigurationSnapshot,
} from "@/lib/services/configuration/snapshot";

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

function formatCurrency(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

function OrderSnapshotDetails({
  snapshot,
}: {
  snapshot: ServiceConfigurationSnapshot;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-neutral-50 p-6 border border-neutral-100">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-950 mb-4">
          Konfigurations-Snapshot
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-xs font-bold text-neutral-600">
            <span className="text-neutral-400 block text-[9px] uppercase">
              Preismodell
            </span>
            {getPricingModelLabel(snapshot.pricingModel)}
          </div>
          <div className="text-xs font-bold text-neutral-600">
            <span className="text-neutral-400 block text-[9px] uppercase">
              Berechneter Gesamtpreis
            </span>
            {formatCurrency(snapshot.calculatedPrice.total)}
          </div>
          {snapshot.selectedPricingTier && (
            <div className="text-xs font-bold text-neutral-600">
              <span className="text-neutral-400 block text-[9px] uppercase">
                Mengenstaffel
              </span>
              {snapshot.selectedPricingTier.label}
            </div>
          )}
          {snapshot.size && (
            <div className="text-xs font-bold text-neutral-600">
              <span className="text-neutral-400 block text-[9px] uppercase">
                {snapshot.size.fieldLabel}
              </span>
              {snapshot.size.value}
            </div>
          )}
          {snapshot.color && (
            <div className="text-xs font-bold text-neutral-600">
              <span className="text-neutral-400 block text-[9px] uppercase">
                {snapshot.color.fieldLabel}
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full border border-neutral-300"
                  style={{ backgroundColor: snapshot.color.hex }}
                ></span>
                {snapshot.color.value}
              </span>
            </div>
          )}
          {snapshot.customQuote && (
            <div className="text-xs font-bold text-amber-700">
              <span className="text-amber-500 block text-[9px] uppercase">
                Preisstatus
              </span>
              Preis auf Anfrage
            </div>
          )}
        </div>
      </div>

      {snapshot.area && (
        <div className="bg-white border border-neutral-200 p-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-950 mb-4">
            Flaechenberechnung
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-xs font-bold text-neutral-600">
              <span className="text-neutral-400 block text-[9px] uppercase">
                Breite
              </span>
              {snapshot.area.widthCm.toFixed(1)} cm
            </div>
            <div className="text-xs font-bold text-neutral-600">
              <span className="text-neutral-400 block text-[9px] uppercase">
                Hoehe
              </span>
              {snapshot.area.heightCm.toFixed(1)} cm
            </div>
            <div className="text-xs font-bold text-neutral-600">
              <span className="text-neutral-400 block text-[9px] uppercase">
                Flaeche
              </span>
              {snapshot.area.areaSqm.toFixed(3)} m2
            </div>
            <div className="text-xs font-bold text-neutral-600">
              <span className="text-neutral-400 block text-[9px] uppercase">
                Preis pro m2
              </span>
              {formatCurrency(snapshot.area.pricePerSqm)}
            </div>
          </div>
        </div>
      )}

      {snapshot.selectedOptions.length > 0 && (
        <div className="bg-white border border-neutral-200 p-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-950 mb-4">
            Gewaehlte Optionen
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {snapshot.selectedOptions.map((option) => (
              <div key={`${option.fieldKey}-${option.valueLabel}`} className="text-xs font-bold text-neutral-600">
                <span className="text-neutral-400 block text-[9px] uppercase">
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
              className="flex items-center justify-between bg-white border border-neutral-200 p-4"
            >
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
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
                className="flex items-center justify-between bg-white border border-neutral-200 p-4"
              >
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                    {field.fieldLabel}
                  </span>
                  <span className="text-xs font-bold text-neutral-950 block">
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
                    className="flex items-center gap-2 bg-neutral-950 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                )}
              </div>
            )),
          )}
        </div>
      )}

      {snapshot.orderNotes && (
        <div className="bg-yellow-50/50 border border-yellow-100 p-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-yellow-800 mb-2">
            Kundenanmerkung
          </h4>
          <p className="text-xs text-neutral-700 font-bold leading-relaxed">
            {snapshot.orderNotes}
          </p>
        </div>
      )}
    </div>
  );
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireAdminPermission("canManageOrders");
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          username: true,
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

  const canAssignOrders = hasAdminPermission(currentUser, "canAssignOrders");
  const canClaimOrders = hasAdminPermission(currentUser, "canClaimOrders");
  const canEditOrder = canUpdateOrder(currentUser, {
    assignedToId: order.assignedToId,
  });
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

  return (
    <div className="p-12 space-y-8 max-w-7xl mx-auto">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-950 transition-colors mb-4"
      >
        <ArrowLeft className="w-3 h-3" /> Zurueck zur Uebersicht
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">
            Bestellung #{order.orderNumber}
          </h1>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-2">
            Eingegangen am {format(new Date(order.createdAt), "dd.MM.yyyy 'um' HH:mm")}
          </p>
        </div>
        <div className="bg-neutral-950 text-white px-8 py-4 text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">
            Gesamtbetrag
          </p>
          <p className="text-3xl font-bold tracking-tighter">
            {formatCurrency(order.totalAmount)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border border-neutral-200 p-8 shadow-sm space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Zustaendigkeit
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

          {canAssignOrders && (
            <form action={assignOrder} className="space-y-4">
              <input type="hidden" name="orderId" value={order.id} />
              <select
                name="assignedToId"
                defaultValue={order.assignedToId ?? ""}
                className="w-full border border-neutral-200 p-4 text-xs font-bold uppercase tracking-widest bg-neutral-50 outline-none focus:border-neutral-950"
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
                className="w-full bg-neutral-950 text-white p-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all"
              >
                Zuweisung speichern
              </button>
            </form>
          )}

          {!order.assignedToId && canClaimOrders && !canAssignOrders && (
            <form action={claimOrder}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="w-full bg-neutral-950 text-white p-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all"
              >
                Auftrag uebernehmen
              </button>
            </form>
          )}
        </div>

        <div className="bg-white border border-neutral-200 p-8 shadow-sm space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Interne Steuerung
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
          {!canEditOrder && (
            <p className="text-xs font-bold leading-relaxed text-amber-700 bg-amber-50 border border-amber-100 p-4">
              Statusaenderungen sind nur fuer Super Admins oder den zugewiesenen
              Mitarbeiter moeglich.
            </p>
          )}
        </div>

        <div className="bg-white border border-neutral-200 p-8 shadow-sm space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Interne Notiz
          </h2>
          {canEditOrder ? (
            <form action={addOrderInternalNote} className="space-y-4">
              <input type="hidden" name="orderId" value={order.id} />
              <textarea
                name="message"
                required
                rows={4}
                placeholder="Interne Notiz hinzufuegen..."
                className="w-full border border-neutral-200 p-4 text-xs bg-neutral-50 outline-none focus:border-neutral-950 resize-none"
              />
              <button
                type="submit"
                className="w-full bg-neutral-950 text-white p-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all"
              >
                Notiz speichern
              </button>
            </form>
          ) : (
            <p className="text-xs font-bold leading-relaxed text-neutral-500">
              Uebernehmen Sie den Auftrag zuerst oder lassen Sie ihn durch einen
              Super Admin zuweisen.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border border-neutral-200 p-8 shadow-sm space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-4">
            Kundeninformationen
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center rounded-full shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-950">
                  {order.customerName}
                </p>
                <p className="text-[11px] font-bold text-neutral-500 mt-1">
                  {order.customerEmail}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 pt-4 border-t border-neutral-50">
              <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center rounded-full shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-950">Zahlungsstatus</p>
                <p className="text-[11px] font-bold text-green-600 mt-1 uppercase tracking-widest">
                  Erfolgreich bezahlt
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-neutral-200 p-8 shadow-sm space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-4 flex items-center gap-2">
            <Truck className="w-4 h-4" /> Auftragsstatus & Tracking
          </h2>
          <form
            action={updateOrderStatus}
            className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end"
          >
            <input type="hidden" name="orderId" value={order.id} />
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest block">
                Status
              </label>
              <select
                name="status"
                defaultValue={order.status}
                disabled={!canEditOrder}
                className="w-full border border-neutral-200 p-4 text-xs font-bold uppercase tracking-widest bg-neutral-50 outline-none focus:border-neutral-950"
              >
                <option value="PAID">Neu / Bezahlt</option>
                <option value="PROCESSING">In Produktion</option>
                <option value="SHIPPED">Versendet</option>
                <option value="DELIVERED">Zugestellt</option>
                <option value="CANCELED">Storniert</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest block">
                Interner Status
              </label>
              <select
                name="internalStatus"
                defaultValue={order.internalStatus}
                disabled={!canEditOrder}
                className="w-full border border-neutral-200 p-4 text-xs font-bold uppercase tracking-widest bg-neutral-50 outline-none focus:border-neutral-950"
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
              <label className="text-[10px] font-bold uppercase tracking-widest block">
                Prioritaet
              </label>
              <select
                name="priority"
                defaultValue={order.priority}
                disabled={!canEditOrder}
                className="w-full border border-neutral-200 p-4 text-xs font-bold uppercase tracking-widest bg-neutral-50 outline-none focus:border-neutral-950"
              >
                <option value="LOW">Niedrig</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Hoch</option>
                <option value="URGENT">Dringend</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest block">
                Sendungsnummer (Tracking)
              </label>
              <input
                name="trackingNumber"
                defaultValue={order.trackingNumber ?? ""}
                placeholder="z.B. DHL12345678"
                disabled={!canEditOrder}
                className="w-full border border-neutral-200 p-4 text-xs font-bold bg-neutral-50 outline-none focus:border-neutral-950"
              />
            </div>
            <button
              type="submit"
              disabled={!canEditOrder}
              className="bg-neutral-950 text-white p-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all h-[50px] disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" /> Speichern
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 p-8 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-4 mb-8">
          Bestellte Artikel & Druckdaten
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
                className={`pb-12 ${index !== order.items.length - 1 ? "border-b border-neutral-100" : ""}`}
              >
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold uppercase tracking-tighter text-neutral-950">
                          {item.serviceName}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-2">
                          Menge: {item.quantity} | Preis: {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>

                    <OrderSnapshotDetails snapshot={snapshot} />
                  </div>

                  {designPreview && (
                    <div className="w-full md:w-72 bg-neutral-50 border border-neutral-200 p-6">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-950 mb-4 text-center">
                        Design Vorschau
                      </h4>
                      <div className="aspect-square bg-white border border-neutral-200 flex flex-col items-center justify-center p-4 relative mb-4">
                        <span className="absolute top-2 left-2 text-[9px] font-bold uppercase text-neutral-400">
                          Modell: {designPreview.model}
                        </span>
                        <div
                          className="w-12 h-12 rounded-full border border-neutral-200 shadow-inner mt-4"
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
                            className="flex items-center justify-between border border-neutral-200 p-3 bg-white hover:bg-neutral-50 text-[10px] font-bold uppercase"
                          >
                            Front Logo {logoIndex + 1}
                            <Download className="w-3 h-3 text-neutral-400" />
                          </a>
                        ))}
                        {designPreview.backLogos.map((logo, logoIndex) => (
                          <a
                            key={logo.id}
                            href={logo.url}
                            download={`back_logo_${logoIndex + 1}.png`}
                            className="flex items-center justify-between border border-neutral-200 p-3 bg-white hover:bg-neutral-50 text-[10px] font-bold uppercase"
                          >
                            Back Logo {logoIndex + 1}
                            <Download className="w-3 h-3 text-neutral-400" />
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

      <div className="bg-white border border-neutral-200 p-8 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-4 mb-8 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Interner Verlauf
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
