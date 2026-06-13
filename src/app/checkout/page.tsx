"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
} from "lucide-react";
import { createOrder } from "@/app/actions/order";
import { useCartStore, type CartItem } from "@/lib/store/cart";
import type { LegacyConfigurationTextInput } from "@/lib/services/configuration/snapshot";
import { isInlineBrowserUrl } from "@/lib/storage/order-files";
import {
  MAX_SERVER_ACTION_UPLOAD_MB,
  getServerActionUploadLimitMessage,
} from "@/lib/storage/upload-limits";

function sanitizeOptionalUrl(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return isInlineBrowserUrl(value) ? undefined : value;
}

function sanitizeRequiredUrl(value: string): string {
  return sanitizeOptionalUrl(value) ?? "";
}

function sanitizeTextInputs(
  textInputs: CartItem["textInputs"] | undefined,
): CartItem["textInputs"] {
  const sanitizedInputs: CartItem["textInputs"] = {};
  const safeTextInputs: CartItem["textInputs"] = textInputs ?? {};

  Object.entries(safeTextInputs).forEach(([key, input]) => {
    const sanitizedInput: LegacyConfigurationTextInput = {
      optionName: input.optionName,
      value: input.value,
    };
    const sanitizedUrl = sanitizeOptionalUrl(input.url);

    if (sanitizedUrl) {
      sanitizedInput.url = sanitizedUrl;
    }

    sanitizedInputs[key] = sanitizedInput;
  });

  return sanitizedInputs;
}

function sanitizeDesignData(
  designData: CartItem["designData"],
): CartItem["designData"] {
  if (!designData) {
    return undefined;
  }

  return {
    ...designData,
    frontLogos: designData.frontLogos.map((logo) => ({
      ...logo,
      url: sanitizeRequiredUrl(logo.url),
    })),
    backLogos: designData.backLogos.map((logo) => ({
      ...logo,
      url: sanitizeRequiredUrl(logo.url),
    })),
  };
}

function sanitizeConfigurationSnapshot(
  snapshot: CartItem["configurationSnapshot"],
): CartItem["configurationSnapshot"] {
  if (!snapshot) {
    return undefined;
  }

  return {
    ...snapshot,
    uploadFields: snapshot.uploadFields.map((field) => ({
      ...field,
      files: field.files.map((file) => ({
        ...file,
        fileUrl: sanitizeOptionalUrl(file.fileUrl) ?? null,
      })),
    })),
  };
}

function sanitizeCartItemForCheckout(item: CartItem): CartItem {
  const { pendingUploads, ...safeItem } = item;

  return {
    ...safeItem,
    image: sanitizeRequiredUrl(safeItem.image),
    selectedOptions: safeItem.selectedOptions ?? {},
    textInputs: sanitizeTextInputs(safeItem.textInputs),
    designData: sanitizeDesignData(safeItem.designData),
    configurationSnapshot: sanitizeConfigurationSnapshot(
      safeItem.configurationSnapshot,
    ),
  };
}

function buildCheckoutFormData(
  customerName: string,
  customerEmail: string,
  items: CartItem[],
  totalAmount: number,
): FormData {
  const checkoutFormData = new FormData();
  const checkoutItems = items.map(sanitizeCartItemForCheckout);
  const uploads: Array<{
    formKey: string;
    cartItemId: string;
    source: "option" | "upload";
    fieldKey: string;
    fieldLabel: string;
    slotIndex: number;
    customerLabel: string;
  }> = [];

  items.forEach((item) => {
    item.pendingUploads?.forEach((upload) => {
      const formKey = `upload_${uploads.length}`;

      uploads.push({
        formKey,
        cartItemId: item.cartItemId,
        source: upload.source,
        fieldKey: upload.fieldKey,
        fieldLabel: upload.fieldLabel,
        slotIndex: upload.slotIndex,
        customerLabel: upload.customerLabel,
      });

      checkoutFormData.append(formKey, upload.file, upload.file.name);
    });
  });

  checkoutFormData.set("name", customerName);
  checkoutFormData.set("email", customerEmail);
  checkoutFormData.set(
    "payload",
    JSON.stringify({
      items: checkoutItems,
      totalAmount,
      uploads,
    }),
  );

  return checkoutFormData;
}

function normalizeDisplayPrice(value: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasOversizedPendingUpload(items: CartItem[]): boolean {
  return items.some((item) =>
    (item.pendingUploads ?? []).some(
      (upload) =>
        upload.file.size > MAX_SERVER_ACTION_UPLOAD_MB * 1024 * 1024,
    ),
  );
}

function formatCurrency(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publicOrderCode, setPublicOrderCode] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartTotal = items.reduce(
    (sum, item) => sum + normalizeDisplayPrice(item.totalPrice),
    0,
  );

  if (!mounted) {
    return null;
  }

  if (items.length === 0 && !success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-slate-50 px-6 text-center">
        <p className="text-sm leading-7 text-slate-500">
          Ihr Warenkorb ist leer.
        </p>
        <Link
          href="/services"
          className="text-sm font-medium text-slate-700 underline underline-offset-4"
        >
          Zurück zu den Leistungen
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (hasOversizedPendingUpload(items)) {
      setErrorMessage(getServerActionUploadLimitMessage());
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const customerName = String(formData.get("name") ?? "");
      const customerEmail = String(formData.get("email") ?? "");
      const checkoutFormData = buildCheckoutFormData(
        customerName,
        customerEmail,
        items,
        cartTotal,
      );
      const result = await createOrder(checkoutFormData);

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setPublicOrderCode(result.publicOrderCode);
      setOrderNumber(result.orderNumber);
      clearCart();
      setSuccess(true);
    } catch (error) {
      console.error("Checkout submit failed:", error);
      setErrorMessage(
        "Die Bestellung konnte nicht gesendet werden. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16">
        <div className="surface-card w-full max-w-xl p-8 text-center sm:p-10">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-semibold text-slate-950">
            Bestellung erfolgreich
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-600">
            Vielen Dank. Wir haben Ihren Auftrag erhalten und kümmern uns jetzt
            um die weitere Bearbeitung. Für das Tracking verwenden Sie bitte den
            Code unten zusammen mit Ihrer E-Mail-Adresse.
          </p>
          {publicOrderCode ? (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Tracking-Code
              </span>
              <span className="text-lg font-semibold text-slate-950">
                {publicOrderCode}
              </span>
              {orderNumber ? (
                <span className="mt-2 block text-sm text-slate-500">
                  Interne Bestellnummer: #{orderNumber}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Weiter einkaufen
            </button>
            <button
              type="button"
              onClick={() => router.push("/track")}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
            >
              Bestellung verfolgen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 py-14 sm:py-16 lg:py-20">
      <div className="public-container">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-12">
          <div className="space-y-8">
            <div>
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück zum Warenkorb
              </Link>
              <p className="section-eyebrow mt-8">Checkout</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950">
                Bestellung abschließen
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                Ihre Auswahl aus dem Konfigurator wird mit allen Konfigurations-
                und Upload-Daten übernommen. Im letzten Schritt fehlen nur noch
                Ihre Kontaktdaten.
              </p>
            </div>

            {errorMessage ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="surface-card space-y-8 p-6 sm:p-8 lg:p-10">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Vollständiger Name
                    </label>
                    <input
                      name="name"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                      E-Mail-Adresse
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          Simulierte Zahlung
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Aktiv für die aktuelle Bestellstrecke
                        </p>
                      </div>
                    </div>
                    <span className="public-pill bg-slate-950 px-3.5 py-1.5 text-xs font-medium text-white">
                      Aktiv
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-500">
                    Uploads über {MAX_SERVER_ACTION_UPLOAD_MB} MB werden aus
                    Sicherheitsgründen vor dem Absenden blockiert.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 py-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Bestellung wird gespeichert
                  </>
                ) : (
                  "Bestellung abschließen"
                )}
              </button>
            </form>
          </div>

          <aside className="surface-card p-6 sm:p-8 lg:sticky lg:top-28">
            <h2 className="border-b border-slate-200 pb-5 text-lg font-semibold text-slate-950">
              Zusammenfassung
            </h2>
            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                >
                  <div className="h-16 w-16 shrink-0 rounded-2xl bg-white p-2">
                    <img
                      src={item.image}
                      className="h-full w-full object-contain"
                      alt={item.name}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {item.name}
                    </p>
                    <span className="public-pill bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Menge: {item.quantity}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-950 sm:text-right">
                    {formatCurrency(normalizeDisplayPrice(item.totalPrice))}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
              <span className="text-sm font-medium text-slate-500">Gesamt</span>
              <span className="text-3xl font-semibold text-slate-950">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
