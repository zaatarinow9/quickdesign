"use client";

import { createOrder } from "@/app/actions/order";
import { useCartStore, type CartItem } from "@/lib/store/cart";
import type { LegacyConfigurationTextInput } from "@/lib/services/configuration/snapshot";
import { isInlineBrowserUrl } from "@/lib/storage/order-files";
import {
  MAX_SERVER_ACTION_UPLOAD_MB,
  getServerActionUploadLimitMessage,
} from "@/lib/storage/upload-limits";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartTotal = items.reduce(
    (sum, item) => sum + normalizeDisplayPrice(item.totalPrice),
    0,
  );

  if (!mounted) return null;
  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">
          Ihr Warenkorb ist leer
        </p>
        <Link href="/" className="text-xs font-bold uppercase underline">
          Zurueck zum Shop
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

      setOrderNumber(result.orderNumber);
      clearCart();
      setSuccess(true);
    } catch (error) {
      console.error("Checkout submit failed:", error);
      setErrorMessage(
        "Die Bestellung konnte nicht gesendet werden. Bitte pruefen Sie Ihre Verbindung und versuchen Sie es erneut.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="w-20 h-20 bg-neutral-950 text-white rounded-full flex items-center justify-center mb-8 shadow-2xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold uppercase tracking-tighter mb-4 text-center">
          Bestellung erfolgreich!
        </h1>
        <p className="text-neutral-500 mb-4 text-center max-w-md text-sm">
          Vielen Dank fuer Ihren Auftrag. Wir haben die Details erhalten.
        </p>
        {orderNumber && (
          <div className="bg-neutral-50 border border-neutral-200 px-6 py-4 mb-10 text-center">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
              Bestellnummer
            </span>
            <span className="text-lg font-bold text-neutral-950">
              #{orderNumber}
            </span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="bg-neutral-950 text-white px-12 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all"
          >
            Weiter einkaufen
          </button>
          <button
            type="button"
            onClick={() => router.push("/track")}
            className="border border-neutral-200 bg-white text-neutral-950 px-12 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-50 transition-all"
          >
            Bestellung verfolgen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-20 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-10">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Zurueck zum Warenkorb
          </Link>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">
            Zahlung & Versand
          </h1>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 p-5 text-red-700 text-xs font-bold leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white p-10 border border-neutral-200 shadow-sm space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">
                  Vollstaendiger Name
                </label>
                <input
                  name="name"
                  required
                  className="w-full border border-neutral-200 p-4 text-sm font-bold bg-neutral-50 outline-none focus:border-neutral-950"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">
                  E-Mail Adresse
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full border border-neutral-200 p-4 text-sm font-bold bg-neutral-50 outline-none focus:border-neutral-950"
                />
              </div>
              <div className="pt-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-4">
                  Zahlungsmethode (Test)
                </label>
                <div className="flex items-center gap-4 p-5 border-2 border-neutral-950 bg-neutral-50">
                  <CreditCard className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase">
                    Simulierte Zahlung
                  </span>
                  <span className="ml-auto text-[9px] bg-neutral-950 text-white px-2 py-1 font-bold">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-950 text-white py-6 font-bold uppercase tracking-widest text-[11px] hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Bestellung wird gespeichert
                </>
              ) : (
                "Jetzt Zahlung simulieren"
              )}
            </button>
          </form>
        </div>

        <div className="bg-white border border-neutral-200 p-10 shadow-sm h-fit sticky top-24">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-6 mb-8">
            Zusammenfassung
          </h2>
          <div className="space-y-6 mb-10 max-h-[300px] overflow-y-auto pr-4">
            {items.map((item) => (
              <div
                key={item.cartItemId}
                className="flex gap-6 border-b border-neutral-50 pb-6"
              >
                <div className="w-16 h-16 bg-neutral-100 shrink-0 p-2">
                  <img
                    src={item.image}
                    className="w-full h-full object-contain"
                    alt=""
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase text-neutral-950">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-widest">
                    Qty: {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-bold text-neutral-950">
                  {normalizeDisplayPrice(item.totalPrice).toFixed(2)} EUR
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-neutral-100">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              Gesamt
            </span>
            <span className="text-4xl font-bold tracking-tighter text-neutral-950">
              {cartTotal.toFixed(2)} EUR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
