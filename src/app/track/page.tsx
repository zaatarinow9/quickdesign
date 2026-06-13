"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock,
  FileText,
  Loader2,
  Mail,
  PackageSearch,
  Search,
  Truck,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  findCustomerOrderDetails,
  findCustomerOrdersByEmail,
  type CustomerOrderDetail,
  type CustomerOrderSummary,
} from "@/app/actions/order";

const STEPS = [
  { id: "PAID", label: "Bestellung eingegangen", icon: CircleDot },
  { id: "PROCESSING", label: "In Bearbeitung", icon: Clock },
  { id: "SHIPPED", label: "Versendet", icon: Truck },
  { id: "DELIVERED", label: "Zugestellt", icon: CheckCircle2 },
] as const;

function formatCurrency(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

function getLookupLabel(code: string): string {
  return code.startsWith("QD") ? "Tracking-Code" : "Auftragsnummer";
}

function OrderTimeline({ status }: { status: string }) {
  if (status === "CANCELED") {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm leading-7 text-rose-700">
        Dieser Auftrag wurde storniert. Bei Rückfragen helfen wir Ihnen gerne
        weiter.
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.id === status);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STEPS.map((step, index) => {
        const isCompleted = currentIndex >= 0 && index <= currentIndex;
        const Icon = step.icon;

        return (
          <div
            key={step.id}
            className={`rounded-[24px] border p-5 transition-colors ${
              isCompleted
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  isCompleted
                    ? "bg-white/10 text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium">Schritt {index + 1}</p>
                <p className="mt-1 text-sm font-semibold">{step.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrackOrderPage() {
  const [emailOrders, setEmailOrders] = useState<CustomerOrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrderDetail | null>(null);
  const [activeEmail, setActiveEmail] = useState<string>("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [detailsLoadingCode, setDetailsLoadingCode] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSearchDone, setEmailSearchDone] = useState(false);

  async function handleDirectLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupLoading(true);
    setLookupError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const lookup = String(formData.get("lookup") ?? "");
    const order = await findCustomerOrderDetails({ email, lookup });

    if (!order) {
      setSelectedOrder(null);
      setLookupError("Bitte prüfen Sie Ihre Eingaben.");
      setLookupLoading(false);
      return;
    }

    setActiveEmail(email.trim());
    setSelectedOrder(order);
    setLookupLoading(false);
  }

  async function handleEmailLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailLoading(true);
    setEmailError(null);
    setEmailSearchDone(true);

    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const orders = await findCustomerOrdersByEmail(email);

    if (!orders.length) {
      setEmailOrders([]);
      setSelectedOrder(null);
      setActiveEmail(email.trim());
      setEmailLoading(false);
      return;
    }

    setActiveEmail(email.trim());
    setEmailOrders(orders);
    setEmailLoading(false);
  }

  async function handleShowDetails(code: string) {
    if (!activeEmail) {
      setEmailError("Bitte suchen Sie Ihre Aufträge zuerst über Ihre E-Mail-Adresse.");
      return;
    }

    setDetailsLoadingCode(code);
    setEmailError(null);
    const order = await findCustomerOrderDetails({
      email: activeEmail,
      lookup: code,
    });

    if (!order) {
      setEmailError("Bitte prüfen Sie Ihre Eingaben.");
      setDetailsLoadingCode(null);
      return;
    }

    setSelectedOrder(order);
    setDetailsLoadingCode(null);
  }

  return (
    <div className="bg-slate-50 py-14 sm:py-16 lg:py-20">
      <div className="public-container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg">
            <PackageSearch className="h-10 w-10" />
          </div>
          <p className="section-eyebrow mt-6">Kundenportal</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            Auftrag verfolgen
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Geben Sie Ihre E-Mail-Adresse oder Ihren Tracking-Code ein, um Ihre
            aktuellen Aufträge, Statusmeldungen und sichere Dokumente
            einzusehen.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-2">
          <form onSubmit={handleDirectLookup} className="surface-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Mit Auftragsnummer suchen
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Für die Detailansicht benötigen wir Ihren Code und Ihre
                  E-Mail-Adresse.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <input
                name="lookup"
                required
                placeholder="Tracking-Code oder Auftragsnummer"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-950 outline-none transition-colors focus:border-slate-900"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="E-Mail-Adresse"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-950 outline-none transition-colors focus:border-slate-900"
              />
              <button
                disabled={lookupLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {lookupLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Suche läuft
                  </>
                ) : (
                  <>
                    Details anzeigen
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {lookupError ? (
              <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
                {lookupError}
              </div>
            ) : null}
          </form>

          <form onSubmit={handleEmailLookup} className="surface-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Mit E-Mail-Adresse suchen
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Sie sehen eine begrenzte Liste Ihrer letzten Aufträge und
                  können anschließend einzelne Details öffnen.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <input
                name="email"
                type="email"
                required
                defaultValue={activeEmail}
                placeholder="E-Mail-Adresse"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-950 outline-none transition-colors focus:border-slate-900"
              />
              <button
                disabled={emailLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {emailLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Aufträge werden geladen
                  </>
                ) : (
                  <>
                    Aufträge anzeigen
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {emailError ? (
              <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
                {emailError}
              </div>
            ) : null}
          </form>
        </div>

        <div className="mx-auto mt-8 max-w-6xl space-y-8">
          {emailSearchDone ? (
            <div className="surface-card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Auftragsübersicht
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    Ihre letzten Aufträge
                  </h2>
                </div>
                {activeEmail ? (
                  <p className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
                    {activeEmail}
                  </p>
                ) : null}
              </div>

              {emailOrders.length > 0 ? (
                <div className="mt-6 grid gap-4">
                  {emailOrders.map((order) => (
                    <div
                      key={`${order.publicOrderCode}-${order.createdAt}`}
                      className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                              {getLookupLabel(order.publicOrderCode)}
                            </span>
                            <span className="text-lg font-semibold text-slate-950">
                              {order.publicOrderCode}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <span>
                              Auftrag vom {format(new Date(order.createdAt), "dd.MM.yyyy")}
                            </span>
                            <span>Status: {order.statusLabel}</span>
                            <span>{order.itemCount} Positionen</span>
                            <span>{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleShowDetails(order.publicOrderCode)}
                          disabled={detailsLoadingCode === order.publicOrderCode}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {detailsLoadingCode === order.publicOrderCode ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Wird geladen
                            </>
                          ) : (
                            <>
                              Details anzeigen
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
                  <p className="text-lg font-semibold text-slate-950">
                    Keine Aufträge gefunden.
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Bitte prüfen Sie Ihre E-Mail-Adresse oder nutzen Sie die
                    Suche mit Tracking-Code.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {selectedOrder ? (
            <div className="surface-card p-6 sm:p-8">
              <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="section-eyebrow">Auftragsdetails</p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                    {selectedOrder.publicOrderCode}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Eingegangen am{" "}
                    {format(new Date(selectedOrder.createdAt), "dd. MMMM yyyy")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Interne Bestellnummer: #{selectedOrder.legacyOrderNumber}
                  </p>
                </div>

                <div className="grid gap-3 sm:min-w-[240px]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {selectedOrder.statusLabel}
                    </p>
                  </div>
                  {selectedOrder.paymentStatusLabel ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                      <p className="text-xs font-medium text-slate-500">
                        Zahlungsstatus
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {selectedOrder.paymentStatusLabel}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-8">
                <OrderTimeline status={selectedOrder.status} />
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                  <p className="text-sm font-medium text-slate-500">Gesamtbetrag</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </p>
                </div>
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                  <p className="text-sm font-medium text-slate-500">Nächster Schritt</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {selectedOrder.nextStep}
                  </p>
                </div>
              </div>

              {selectedOrder.documentLinks.length > 0 ? (
                <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        Dokumente
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Diese Links sind signiert und nur für eine begrenzte Zeit
                        gültig.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {selectedOrder.documentLinks.map((documentLink) => (
                      <a
                        key={documentLink.href}
                        href={documentLink.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                      >
                        {documentLink.label}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-slate-950">
                  Positionen
                </h3>
                <div className="mt-5 space-y-4">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-950">
                            {item.quantity}x {item.serviceName}
                          </p>
                          {item.optionLines.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.optionLines.map((line) => (
                                <span
                                  key={`${item.id}-${line}`}
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                                >
                                  {line}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold text-slate-950">
                          {formatCurrency(item.itemTotal)}
                        </p>
                      </div>

                      {item.notes ? (
                        <p className="mt-4 text-sm leading-7 text-slate-600">
                          {item.notes}
                        </p>
                      ) : null}

                      {item.fileNames.length > 0 ? (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-slate-500">
                            Druckdaten erhalten
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.fileNames.map((fileName) => (
                              <span
                                key={`${item.id}-${fileName}`}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                              >
                                {fileName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.customerNotes ? (
                <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                  <h3 className="text-lg font-semibold text-slate-950">
                    Hinweis zu Ihrer Bestellung
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {selectedOrder.customerNotes}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
