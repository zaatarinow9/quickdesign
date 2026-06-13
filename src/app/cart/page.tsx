"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { useCartStore, type CartItem } from "@/lib/store/cart";
import {
  getPricingModelLabel,
  getSnapshotOrBuildLegacy,
  type ServiceConfigurationSnapshot,
} from "@/lib/services/configuration/snapshot";
import QuantityStepper from "@/components/ui/QuantityStepper";

const FabricTextureDef = () => (
  <defs>
    <filter id="cartFabricTexture" x="0" y="0" width="100%" height="100%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.04"
        numOctaves="3"
        result="noise"
      />
      <feColorMatrix
        type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.03 0"
        in="noise"
        result="coloredNoise"
      />
      <feBlend in="SourceGraphic" in2="coloredNoise" mode="multiply" />
    </filter>
  </defs>
);

function formatCurrency(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

function getCartItemSnapshot(item: CartItem): ServiceConfigurationSnapshot {
  return getSnapshotOrBuildLegacy({
    serviceId: item.serviceId,
    serviceName: item.name,
    basePrice: item.basePrice,
    totalPrice: item.totalPrice,
    quantity: item.quantity,
    selectedOptions: item.selectedOptions,
    textInputs: item.textInputs,
    designData: item.designData,
    orderNotes: item.orderNotes,
    configurationSnapshot: item.configurationSnapshot,
  });
}

function CartItemPreview({ item }: { item: CartItem }) {
  if (!item.designData) {
    return (
      <img
        src={item.image}
        alt={item.name}
        className="w-full h-full object-cover p-2"
      />
    );
  }

  const { model, color, frontLogos } = item.designData;

  const paths: Record<string, string> = {
    tee: "M 230 100 C 270 140, 330 140, 370 100 L 480 130 L 520 220 L 450 250 L 420 180 L 420 500 L 180 500 L 180 180 L 150 250 L 80 220 L 120 130 Z",
    longsleeve:
      "M 230 100 C 270 140, 330 140, 370 100 L 480 130 L 550 450 L 490 470 L 420 180 L 420 500 L 180 500 L 180 180 L 110 470 L 50 450 L 120 130 Z",
    hoodie:
      "M 230 100 C 270 140, 330 140, 370 100 L 490 140 L 550 450 L 490 470 L 430 200 L 430 520 L 170 520 L 170 200 L 110 470 L 50 450 L 110 140 Z",
  };

  const getBasePath = () => {
    if (model === "hoodie" || model === "pullover" || model === "jacket") {
      return paths.hoodie;
    }

    if (model === "longsleeve") {
      return paths.longsleeve;
    }

    return paths.tee;
  };

  const getPrintableArea = (currentModel: string) => {
    switch (currentModel) {
      case "hoodie":
        return { top: "28%", left: "32%", width: "36%", height: "32%" };
      default:
        return { top: "22%", left: "32%", width: "36%", height: "55%" };
    }
  };

  const area = getPrintableArea(model);

  return (
    <div className="w-full h-full bg-neutral-100 flex items-center justify-center overflow-hidden rounded-sm p-4">
      <div className="relative w-full h-full aspect-square">
        <svg
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full drop-shadow-sm"
        >
          <FabricTextureDef />
          <g filter="url(#cartFabricTexture)">
            <path
              d="M 230 100 C 270 130, 330 130, 370 100 C 330 110, 270 110, 230 100 Z"
              fill="#000"
              opacity="0.08"
            />
            <path d={getBasePath()} fill={color} />
            {["hoodie", "pullover", "jacket"].includes(model) && (
              <path
                d="M 200 380 L 400 380 L 430 480 L 170 480 Z"
                fill={color}
                stroke="#000"
                strokeOpacity="0.04"
                strokeWidth="2"
              />
            )}
            <path
              d="M 180 180 C 200 300, 190 450, 180 500 C 200 450, 220 300, 200 180 Z"
              fill="#000"
              opacity="0.02"
            />
            <path
              d="M 420 180 C 400 300, 410 450, 420 500 C 400 450, 380 300, 400 180 Z"
              fill="#000"
              opacity="0.02"
            />
          </g>
        </svg>

        <div className="absolute pointer-events-none" style={area}>
          <div className="relative w-full h-full">
            {frontLogos.map((logo) => (
              <div
                key={logo.id}
                className="absolute"
                style={{
                  left: `${logo.x}px`,
                  top: `${logo.y}px`,
                  width: `${logo.width}px`,
                  height: `${logo.height}px`,
                }}
              >
                <img
                  src={logo.url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotDetails({ snapshot }: { snapshot: ServiceConfigurationSnapshot }) {
  return (
    <div className="mb-4 space-y-2">
      {snapshot.design && (
        <p className="text-sm leading-6 text-neutral-600">
          <span className="font-medium text-neutral-900">Modell:</span>{" "}
          {snapshot.design.model}
          {snapshot.color && (
            <>
              <span className="ml-3 font-medium text-neutral-900">Farbe:</span>
              <span
                className="inline-block w-3 h-3 ml-1 rounded-full border border-neutral-300 align-middle"
                style={{ backgroundColor: snapshot.color.hex }}
              ></span>
            </>
          )}
        </p>
      )}

      <p className="text-sm leading-6 text-neutral-600">
        <span className="font-medium text-neutral-900">Preismodell:</span>{" "}
        {getPricingModelLabel(snapshot.pricingModel)}
      </p>

      {snapshot.size && (
        <p className="text-sm leading-6 text-neutral-600">
          <span className="font-medium text-neutral-900">{snapshot.size.fieldLabel}:</span>{" "}
          {snapshot.size.value}
        </p>
      )}

      {snapshot.selectedPricingTier && (
        <p className="text-sm leading-6 text-neutral-600">
          <span className="font-medium text-neutral-900">Mengenstaffel:</span>{" "}
          {snapshot.selectedPricingTier.label}
        </p>
      )}

      {snapshot.area && (
        <p className="text-sm leading-6 text-neutral-600">
          <span className="font-medium text-neutral-900">Fläche:</span>{" "}
          {snapshot.area.widthCm.toFixed(1)} x {snapshot.area.heightCm.toFixed(1)} cm
          {" "}({snapshot.area.areaSqm.toFixed(3)} m2)
        </p>
      )}

      {snapshot.selectedOptions.map((option) => (
        <p
          key={`${option.fieldKey}-${option.valueLabel}`}
          className="text-sm leading-6 text-neutral-600"
        >
          <span className="font-medium text-neutral-900">{option.fieldLabel}:</span>{" "}
          {option.valueLabel}
          {option.priceImpact > 0
            ? ` (+${option.priceImpact.toFixed(2)} EUR)`
            : ""}
        </p>
      ))}

      {snapshot.textFields.map((field) => (
        <p
          key={field.fieldKey}
          className="text-sm leading-6 text-neutral-600"
        >
          <span className="font-medium text-neutral-900">{field.fieldLabel}:</span>{" "}
          {field.value}
        </p>
      ))}

      {snapshot.uploadFields.flatMap((field) =>
        field.files.map((file, index) => (
          <p
            key={`${field.fieldKey}-${index}`}
            className="text-sm leading-6 text-neutral-600"
          >
            <span className="font-medium text-neutral-900">{field.fieldLabel}:</span>{" "}
            {file.fileName}
            {file.customerLabel ? ` (${file.customerLabel})` : ""}
          </p>
        )),
      )}

      {snapshot.orderNotes && (
        <p className="mt-2 text-sm text-neutral-600">
          <span className="font-medium text-neutral-900">Anmerkung:</span>{" "}
          {snapshot.orderNotes}
        </p>
      )}
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-neutral-50" />;
  }

  const cartTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <ShoppingBag className="mb-8 h-24 w-24 text-slate-300" />
        <h1 className="mb-4 text-3xl font-semibold text-slate-950">
          Ihr Warenkorb ist leer
        </h1>
        <p className="mb-8 max-w-md text-sm leading-7 text-slate-500">
          Wählen Sie zuerst ein Produkt.
        </p>
        <Link
          href="/services"
          className="rounded-full bg-slate-950 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Zu den Leistungen
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 py-14 sm:py-16 lg:py-20">
      <div className="public-container">
        <div className="max-w-2xl">
          <p className="section-eyebrow">Warenkorb</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950">
            Ihre aktuelle Auswahl
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Prüfen Sie Menge, Auswahl und Preis.
          </p>
        </div>

        <div className="mt-10 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-10">
          <div className="space-y-6">
            {items.map((item) => {
              const snapshot = getCartItemSnapshot(item);

              return (
                <div
                  key={item.cartItemId}
                  className="surface-card overflow-hidden p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-6 sm:flex-row">
                    <div className="h-36 w-full shrink-0 rounded-[24px] bg-slate-100 sm:h-32 sm:w-32">
                      <CartItemPreview item={item} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <SnapshotDetails snapshot={snapshot} />

                      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Menge
                          </p>
                          <QuantityStepper
                            value={item.quantity}
                            onDecrement={() =>
                              updateQuantity(
                                item.cartItemId,
                                Math.max(1, item.quantity - 1),
                              )
                            }
                            onIncrement={() =>
                              updateQuantity(item.cartItemId, item.quantity + 1)
                            }
                            decrementLabel="Menge verringern"
                            incrementLabel="Menge erhöhen"
                            tone="slate"
                            compact
                          />
                        </div>
                        <div className="space-y-1 sm:text-right">
                          <p className="text-sm text-slate-500">Positionspreis</p>
                          <span className="text-2xl font-semibold text-slate-950">
                            {formatCurrency(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="surface-card p-6 sm:p-8 xl:sticky xl:top-28">
            <h2 className="mb-6 text-xl font-semibold text-slate-950">
              Zusammenfassung
            </h2>
            <div className="mb-6 space-y-4 border-b border-slate-200 pb-6">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Zwischensumme</span>
                <span className="font-semibold text-slate-950">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Versand</span>
                <span className="font-semibold text-slate-950">
                  Berechnet im Checkout
                </span>
              </div>
            </div>
            <div className="mb-8 flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-950">
                Gesamtsumme
              </span>
              <span className="text-3xl font-semibold text-slate-950">
                {formatCurrency(cartTotal)}
              </span>
            </div>
            <Link
              href="/checkout"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-8 py-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Zur Kasse <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
