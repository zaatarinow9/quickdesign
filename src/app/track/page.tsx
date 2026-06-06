"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock,
  Loader2,
  PackageSearch,
  Truck,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { trackOrder } from "@/app/actions/order";

type TrackedOrder = NonNullable<Awaited<ReturnType<typeof trackOrder>>>;

const STEPS = [
  { id: "PAID", label: "Bestellung erhalten", icon: CircleDot },
  { id: "PROCESSING", label: "In Produktion", icon: Clock },
  { id: "SHIPPED", label: "Versendet", icon: Truck },
  { id: "DELIVERED", label: "Zugestellt", icon: CheckCircle2 },
] as const;

export default function TrackOrderPage() {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState(false);

  async function handleTrack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(false);
    setOrder(null);

    const orderNumber = String(
      new FormData(event.currentTarget).get("orderNumber") ?? "",
    );
    const result = await trackOrder(orderNumber);

    if (result) {
      setOrder(result);
    } else {
      setError(true);
    }

    setLoading(false);
  }

  return (
    <div className="bg-slate-50 py-14 sm:py-16 lg:py-20">
      <div className="public-container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg">
            <PackageSearch className="h-10 w-10" />
          </div>
          <p className="mt-6 text-sm font-medium tracking-[0.12em] text-slate-500">
            Auftragsstatus
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Bestellung verfolgen
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Geben Sie Ihre Bestellnummer ein, um den aktuellen Produktions- oder
            Versandstatus Ihrer Druckprodukte abzurufen.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl space-y-8">
          <form
            onSubmit={handleTrack}
            className="surface-card grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-8"
          >
            <input
              name="orderNumber"
              placeholder="Bestellnummer, zum Beispiel 10000"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-950 outline-none transition-colors focus:border-slate-900"
            />
            <button
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Suche laeuft
                </>
              ) : (
                <>
                  Status abrufen
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {error ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-5 text-sm leading-7 text-rose-700">
              Bestellung nicht gefunden. Bitte pruefen Sie die Nummer und
              versuchen Sie es erneut.
            </div>
          ) : null}

          {order ? (
            <div className="surface-card p-6 sm:p-8">
              <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="section-eyebrow">Auftrag</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    #{order.orderNumber}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Eingegangen am{" "}
                    {format(new Date(order.createdAt), "dd. MMMM yyyy")}
                  </p>
                </div>

                {order.trackingNumber ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left md:text-right">
                    <p className="text-xs font-medium text-slate-500">Tracking-ID</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {order.trackingNumber}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {STEPS.map((step, index) => {
                  const currentIndex = STEPS.findIndex(
                    (entry) => entry.id === order.status,
                  );
                  const isCompleted =
                    order.status !== "CANCELED" && index <= currentIndex;
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
                          <p className="text-xs font-medium">
                            Schritt {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {step.label}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-slate-950">
                  Artikel in dieser Bestellung
                </h3>
                <div className="mt-5 space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-sm font-medium text-slate-950">
                        {item.quantity}x {item.serviceName}
                      </p>
                      <p className="text-sm font-semibold text-slate-950">
                        {item.price.toFixed(2)} EUR
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
