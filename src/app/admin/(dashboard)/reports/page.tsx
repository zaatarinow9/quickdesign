import { addMonths, format } from "date-fns";
import {
  BarChart3,
  CreditCard,
  FolderArchive,
  Package,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdminPermission } from "@/lib/admin/auth";
import { hasAdminPermission } from "@/lib/admin/permissions";
import { formatCurrencyAmount } from "@/lib/orders/finance";
import {
  buildOrdersSummary,
  buildPaymentStatusBreakdown,
  buildStaffWorkloadSummary,
  buildStatusBreakdown,
  buildTopCustomers,
  buildTopServices,
  getMonthRange,
  type ReportableOrder,
  type StaffWorkloadUser,
} from "@/lib/orders/reporting";
import { prisma } from "@/lib/prisma";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PAID: "Neu",
  PROCESSING: "In Produktion",
  SHIPPED: "Versendet",
  DELIVERED: "Zugestellt",
  CANCELED: "Storniert",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unbezahlt",
  PARTIALLY_PAID: "Teilweise bezahlt",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
};

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        {label}
      </p>
      <p className="mt-4 text-4xl font-bold tracking-tighter text-neutral-950">
        {value}
      </p>
      {hint && (
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="mb-6 border-b border-neutral-100 pb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-neutral-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const currentUser = await requireAdminPermission("canViewReports");
  const params = searchParams ? await searchParams : {};
  const monthRange = getMonthRange(params.month);
  const canViewAllReports = hasAdminPermission(currentUser, "canViewAllReports");
  const fallbackStaffUsers: StaffWorkloadUser[] = [
    {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
    },
  ];

  const previousMonthValue = format(addMonths(monthRange.from, -1), "yyyy-MM");
  const nextMonthValue = format(addMonths(monthRange.from, 1), "yyyy-MM");
  const monthEnd = new Date(monthRange.toExclusive.getTime() - 1);

  const [orders, staffUsers] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: monthRange.from,
          lt: monthRange.toExclusive,
        },
        ...(canViewAllReports ? {} : { assignedToId: currentUser.id }),
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        customerId: true,
        status: true,
        internalStatus: true,
        paymentStatus: true,
        totalAmount: true,
        subtotalNet: true,
        discountType: true,
        discountValue: true,
        discountAmount: true,
        taxRate: true,
        taxAmount: true,
        totalNet: true,
        totalGross: true,
        currency: true,
        paidAmount: true,
        documentType: true,
        priority: true,
        assignedToId: true,
        createdAt: true,
        isArchived: true,
        customer: {
          select: {
            companyName: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            role: true,
          },
        },
        items: {
          select: {
            serviceId: true,
            serviceName: true,
            quantity: true,
            price: true,
          },
        },
      },
      orderBy: [{ isArchived: "desc" }, { createdAt: "desc" }],
    }),
    canViewAllReports
      ? prisma.adminUser.findMany({
          where: { isActive: true },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            role: true,
          },
        })
      : Promise.resolve(fallbackStaffUsers),
  ]);

  const reportableOrders = orders as ReportableOrder[];
  const summary = buildOrdersSummary(reportableOrders);
  const statusBreakdown = buildStatusBreakdown(reportableOrders);
  const paymentBreakdown = buildPaymentStatusBreakdown(reportableOrders);
  const topServices = canViewAllReports ? buildTopServices(reportableOrders) : [];
  const topCustomers = canViewAllReports ? buildTopCustomers(reportableOrders) : [];
  const workloadRows = buildStaffWorkloadSummary(reportableOrders, staffUsers).filter(
    (row) => canViewAllReports || row.adminUserId === currentUser.id,
  );
  const archivedOrdersCount = reportableOrders.filter(
    (order) => Boolean(order.isArchived),
  ).length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-neutral-100 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-4 text-4xl font-bold uppercase tracking-tighter text-neutral-950">
            <BarChart3 className="h-10 w-10" /> Reports
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Monatsuebersicht fuer {monthRange.monthLabel}.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Link
            href={`/admin/reports?month=${previousMonthValue}`}
            className="inline-flex items-center justify-center border border-neutral-200 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:border-neutral-950 hover:text-neutral-950"
          >
            Vorheriger Monat
          </Link>
          <form className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="month"
              name="month"
              defaultValue={monthRange.monthValue}
              className="border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-neutral-950"
            />
            <button
              type="submit"
              className="bg-neutral-950 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
            >
              Monat laden
            </button>
          </form>
          <Link
            href={`/admin/reports?month=${nextMonthValue}`}
            className="inline-flex items-center justify-center border border-neutral-200 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:border-neutral-950 hover:text-neutral-950"
          >
            Naechster Monat
          </Link>
        </div>
      </div>

      {!canViewAllReports && (
        <div className="border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
            Eingeschraenkte Sicht
          </p>
          <p className="mt-2">
            Fuer Ihre Rolle werden nur eigene zugewiesene Auftraege und operative
            Kennzahlen angezeigt. Finanzsummen des Gesamtunternehmens bleiben
            verborgen.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={canViewAllReports ? "Auftraege im Monat" : "Meine Auftraege"}
          value={summary.totalOrders}
          hint={monthRange.monthValue}
        />
        <SummaryCard
          label="Offene Auftraege"
          value={summary.openOrders}
          hint="nicht abgeschlossen / nicht storniert"
        />
        <SummaryCard
          label="Erledigte Auftraege"
          value={summary.completedOrders}
          hint="zugestellt oder intern erledigt"
        />
        <SummaryCard
          label="Unbezahlte Auftraege"
          value={summary.unpaidOrders}
          hint="offener Zahlungsbetrag vorhanden"
        />
        {canViewAllReports && (
          <>
            <SummaryCard
              label="Netto Gesamt"
              value={formatCurrencyAmount(summary.totalNet)}
            />
            <SummaryCard
              label="Brutto Gesamt"
              value={formatCurrencyAmount(summary.totalGross)}
            />
            <SummaryCard
              label="MwSt Gesamt"
              value={formatCurrencyAmount(summary.totalTax)}
            />
            <SummaryCard
              label="Rabatt Gesamt"
              value={formatCurrencyAmount(summary.totalDiscount)}
            />
            <SummaryCard
              label="Bezahlt"
              value={formatCurrencyAmount(summary.paidAmount)}
            />
            <SummaryCard
              label="Offener Betrag"
              value={formatCurrencyAmount(summary.unpaidAmount)}
            />
          </>
        )}
        <SummaryCard
          label="Archivfaelle"
          value={archivedOrdersCount}
          hint="im gewaelten Monat"
        />
      </div>

      {reportableOrders.length === 0 && (
        <div className="flex flex-col items-center gap-4 border border-neutral-200 bg-white p-20 text-center shadow-sm">
          <Package className="h-14 w-14 text-neutral-200" />
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-neutral-300">
            Keine Auftraege fuer diesen Monat vorhanden
          </p>
        </div>
      )}

      {reportableOrders.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            <ReportSection
              title="Auftraege nach Status"
              description="Verteilung der Auftraege nach Hauptstatus im ausgewaehlten Monat."
            >
              <div className="overflow-hidden border border-neutral-200">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Status
                      </th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Anzahl
                      </th>
                      {canViewAllReports && (
                        <>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            Netto
                          </th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            Brutto
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {statusBreakdown.map((row) => (
                      <tr key={row.key}>
                        <td className="p-4 text-sm font-bold text-neutral-950">
                          {ORDER_STATUS_LABELS[row.key] ?? row.key}
                        </td>
                        <td className="p-4 text-sm text-neutral-700">{row.count}</td>
                        {canViewAllReports && (
                          <>
                            <td className="p-4 text-sm text-neutral-700">
                              {formatCurrencyAmount(row.totalNet)}
                            </td>
                            <td className="p-4 text-sm text-neutral-700">
                              {formatCurrencyAmount(row.totalGross)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportSection>

            <ReportSection
              title="Auftraege nach Zahlung"
              description="Zahlungsstand der Auftraege im ausgewaehlten Zeitraum."
            >
              <div className="overflow-hidden border border-neutral-200">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Zahlung
                      </th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Anzahl
                      </th>
                      {canViewAllReports && (
                        <>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            Netto
                          </th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            Brutto
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {paymentBreakdown.map((row) => (
                      <tr key={row.key}>
                        <td className="p-4 text-sm font-bold text-neutral-950">
                          {PAYMENT_STATUS_LABELS[row.key] ?? row.key}
                        </td>
                        <td className="p-4 text-sm text-neutral-700">{row.count}</td>
                        {canViewAllReports && (
                          <>
                            <td className="p-4 text-sm text-neutral-700">
                              {formatCurrencyAmount(row.totalNet)}
                            </td>
                            <td className="p-4 text-sm text-neutral-700">
                              {formatCurrencyAmount(row.totalGross)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportSection>
          </div>

          {canViewAllReports && (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <ReportSection
                title="Top Services"
                description="Leistungen mit dem hoechsten Netto-Umsatz im Monat."
              >
                <div className="overflow-hidden border border-neutral-200">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Service
                        </th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Auftraege
                        </th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Menge
                        </th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Netto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {topServices.map((service) => (
                        <tr key={service.serviceId}>
                          <td className="p-4 text-sm font-bold text-neutral-950">
                            {service.serviceName}
                          </td>
                          <td className="p-4 text-sm text-neutral-700">
                            {service.ordersCount}
                          </td>
                          <td className="p-4 text-sm text-neutral-700">
                            {service.quantity}
                          </td>
                          <td className="p-4 text-sm text-neutral-700">
                            {formatCurrencyAmount(service.totalNet)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportSection>

              <ReportSection
                title="Top Kunden"
                description="Kunden mit dem hoechsten Brutto-Umsatz im Monat."
              >
                <div className="overflow-hidden border border-neutral-200">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Kunde
                        </th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Firma
                        </th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Auftraege
                        </th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Brutto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {topCustomers.map((customer) => (
                        <tr key={customer.id}>
                          <td className="p-4 text-sm font-bold text-neutral-950">
                            {customer.name}
                          </td>
                          <td className="p-4 text-sm text-neutral-700">
                            {customer.companyName || customer.email || "Ohne Firma"}
                          </td>
                          <td className="p-4 text-sm text-neutral-700">
                            {customer.ordersCount}
                          </td>
                          <td className="p-4 text-sm text-neutral-700">
                            {formatCurrencyAmount(customer.totalGross)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportSection>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <ReportSection
              title="Staff Workload"
              description={
                canViewAllReports
                  ? "Auswertung je aktivem Admin oder Staff-Mitglied auf Basis zugewiesener Auftraege."
                  : "Ihre persoenliche Monatslast auf Basis zugewiesener Auftraege."
              }
            >
              <div className="overflow-hidden border border-neutral-200">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Teammitglied
                      </th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Zugewiesen
                      </th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Erledigt
                      </th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Offen
                      </th>
                      {canViewAllReports && (
                        <>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            Netto
                          </th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            Brutto
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {workloadRows.map((row) => (
                      <tr key={row.adminUserId}>
                        <td className="p-4">
                          <p className="text-sm font-bold text-neutral-950">{row.name}</p>
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                            {row.role}
                          </p>
                        </td>
                        <td className="p-4 text-sm text-neutral-700">
                          {row.assignedOrdersCount}
                        </td>
                        <td className="p-4 text-sm text-neutral-700">
                          {row.completedAssignedOrdersCount}
                        </td>
                        <td className="p-4 text-sm text-neutral-700">
                          {row.openAssignedOrdersCount}
                        </td>
                        {canViewAllReports && (
                          <>
                            <td className="p-4 text-sm text-neutral-700">
                              {formatCurrencyAmount(row.totalNet)}
                            </td>
                            <td className="p-4 text-sm text-neutral-700">
                              {formatCurrencyAmount(row.totalGross)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportSection>

            <ReportSection
              title="Monatskontext"
              description="Schnelle Einordnung des aktuell geladenen Monats."
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4 border border-neutral-200 bg-neutral-50 p-4">
                  <Package className="mt-1 h-5 w-5 text-neutral-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Zeitraum
                    </p>
                    <p className="mt-2 text-sm font-bold text-neutral-950">
                      {format(monthRange.from, "dd.MM.yyyy")} bis{" "}
                      {format(monthEnd, "dd.MM.yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 border border-neutral-200 bg-neutral-50 p-4">
                  <CreditCard className="mt-1 h-5 w-5 text-neutral-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Zahlungslage
                    </p>
                    <p className="mt-2 text-sm font-bold text-neutral-950">
                      {summary.unpaidOrders} Auftraege mit offenem Betrag
                    </p>
                    {canViewAllReports && (
                      <p className="mt-1 text-sm text-neutral-600">
                        Offen: {formatCurrencyAmount(summary.unpaidAmount)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4 border border-neutral-200 bg-neutral-50 p-4">
                  <Users className="mt-1 h-5 w-5 text-neutral-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Teamfokus
                    </p>
                    <p className="mt-2 text-sm font-bold text-neutral-950">
                      {workloadRows.reduce(
                        (sum, row) => sum + row.openAssignedOrdersCount,
                        0,
                      )}{" "}
                      offene zugewiesene Auftraege
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 border border-neutral-200 bg-neutral-50 p-4">
                  <FolderArchive className="mt-1 h-5 w-5 text-neutral-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Archiv
                    </p>
                    <p className="mt-2 text-sm font-bold text-neutral-950">
                      {archivedOrdersCount} archivierte Auftraege im Monat
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Archivierte Auftraege bleiben in Reports sichtbar, sind aber
                      standardmaessig aus der Listenansicht ausgeblendet.
                    </p>
                  </div>
                </div>
              </div>
            </ReportSection>
          </div>
        </>
      )}
    </div>
  );
}
