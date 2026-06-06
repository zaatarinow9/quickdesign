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
    <div className="space-y-1 mb-4">
      {snapshot.design && (
        <p className="text-sm text-neutral-600">
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

      <p className="text-sm text-neutral-600">
        <span className="font-medium text-neutral-900">Preismodell:</span>{" "}
        {getPricingModelLabel(snapshot.pricingModel)}
      </p>

      {snapshot.size && (
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-900">{snapshot.size.fieldLabel}:</span>{" "}
          {snapshot.size.value}
        </p>
      )}

      {snapshot.selectedPricingTier && (
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-900">Mengenstaffel:</span>{" "}
          {snapshot.selectedPricingTier.label}
        </p>
      )}

      {snapshot.area && (
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-900">Fläche:</span>{" "}
          {snapshot.area.widthCm.toFixed(1)} x {snapshot.area.heightCm.toFixed(1)} cm
          {" "}({snapshot.area.areaSqm.toFixed(3)} m2)
        </p>
      )}

      {snapshot.selectedOptions.map((option) => (
        <p
          key={`${option.fieldKey}-${option.valueLabel}`}
          className="text-sm text-neutral-600"
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
          className="text-sm text-neutral-600"
        >
          <span className="font-medium text-neutral-900">{field.fieldLabel}:</span>{" "}
          {field.value}
        </p>
      ))}

      {snapshot.uploadFields.flatMap((field) =>
        field.files.map((file, index) => (
          <p
            key={`${field.fieldKey}-${index}`}
            className="text-sm text-neutral-600"
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-neutral-50 px-6">
        <ShoppingBag className="w-24 h-24 text-neutral-300 mb-8" />
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-neutral-950">
          Ihr Warenkorb ist leer
        </h1>
        <p className="mb-8 text-sm text-neutral-500">
          Entdecken Sie unsere hochwertigen Druckleistungen.
        </p>
        <Link
          href="/services"
          className="rounded-full bg-neutral-950 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          Zu den Leistungen
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-neutral-50 py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <h1 className="mb-12 text-4xl font-semibold tracking-tight text-neutral-950">
          Warenkorb
        </h1>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <div className="w-full lg:w-2/3 space-y-6">
            {items.map((item) => {
              const snapshot = getCartItemSnapshot(item);

              return (
                <div
                  key={item.cartItemId}
                  className="bg-white border border-neutral-200 p-6 flex flex-col sm:flex-row gap-6 shadow-sm relative"
                >
                  <div className="w-full sm:w-32 h-32 bg-neutral-100 flex-shrink-0">
                    <CartItemPreview item={item} />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-neutral-950">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeItem(item.cartItemId)}
                        className="text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <SnapshotDetails snapshot={snapshot} />

                    <div className="flex justify-between items-end border-t border-neutral-100 pt-4">
                      <div className="flex items-center border border-neutral-200">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.cartItemId,
                              Math.max(1, item.quantity - 1),
                            )
                          }
                          className="px-3 py-1 text-neutral-500 hover:text-neutral-950"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity + 1)
                          }
                          className="px-3 py-1 text-neutral-500 hover:text-neutral-950"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xl font-bold text-neutral-950">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full lg:w-1/3 rounded-[28px] bg-white border border-neutral-200 p-8 shadow-sm sticky top-24">
            <h2 className="mb-6 text-xl font-semibold text-neutral-950">
              Zusammenfassung
            </h2>
            <div className="space-y-4 mb-6 pb-6 border-b border-neutral-200">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Zwischensumme</span>
                <span className="font-bold text-neutral-950">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Versand</span>
                <span className="font-bold text-neutral-950">
                  Berechnet im Checkout
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center mb-8">
              <span className="text-sm font-medium text-neutral-950">
                Gesamtsumme
              </span>
              <span className="text-3xl font-semibold tracking-tight text-neutral-950">
                {formatCurrency(cartTotal)}
              </span>
            </div>
            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-8 py-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              Zur Kasse <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
