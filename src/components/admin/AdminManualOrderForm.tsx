"use client";

import { useState } from "react";
import { Minus, Plus, ReceiptText, ShoppingCart, UserRound } from "lucide-react";
import {
  DEFAULT_GERMAN_TAX_RATE,
  calculateOrderFinancials,
  normalizeDocumentType,
  normalizePaymentStatus,
} from "@/lib/orders/finance";
import {
  buildInitialManualOrderItem,
  buildManualOrderItem,
  type ManualOrderItemDraft,
  type ManualOrderQuickCustomer,
} from "@/lib/orders/manual";
import type { NormalizedServiceConfig } from "@/lib/services/configuration/types";

type ManualOrderAction = (formData: FormData) => void | Promise<void>;

type AdminManualOrderService = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  config: NormalizedServiceConfig;
};

type CustomerOption = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
};

type StaffOption = {
  id: string;
  name: string;
  role: string;
};

const DEFAULT_QUICK_CUSTOMER: ManualOrderQuickCustomer = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "Deutschland",
  taxId: "",
  notes: "",
};

function formatCurrency(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

function isValueField(
  field: NormalizedServiceConfig["fields"][number],
): boolean {
  return (
    field.kind === "select" || field.kind === "radio" || field.kind === "size"
  );
}

function isTextLikeField(
  field: NormalizedServiceConfig["fields"][number],
): boolean {
  return field.kind === "text" || field.kind === "number";
}

export default function AdminManualOrderForm({
  action,
  services,
  customers,
  staffOptions,
  initialCustomerId,
  canApplyDiscounts,
  canEditFinancials,
  canAssignOrders,
}: {
  action: ManualOrderAction;
  services: AdminManualOrderService[];
  customers: CustomerOption[];
  staffOptions: StaffOption[];
  initialCustomerId?: string;
  canApplyDiscounts: boolean;
  canEditFinancials: boolean;
  canAssignOrders: boolean;
}) {
  const firstService = services[0] ?? null;
  const initialExistingCustomerId =
    customers.find((customer) => customer.id === initialCustomerId)?.id ??
    customers[0]?.id ??
    "";
  const [customerMode, setCustomerMode] = useState<"existing" | "quick">(
    initialExistingCustomerId ? "existing" : "quick",
  );
  const [customerId, setCustomerId] = useState(initialExistingCustomerId);
  const [quickCustomer, setQuickCustomer] = useState<ManualOrderQuickCustomer>(
    DEFAULT_QUICK_CUSTOMER,
  );
  const [items, setItems] = useState<ManualOrderItemDraft[]>(() =>
    firstService
      ? [buildInitialManualOrderItem(firstService.id, firstService.config)]
      : [],
  );
  const [internalNotes, setInternalNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [discountType, setDiscountType] = useState("NONE");
  const [discountValue, setDiscountValue] = useState("0");
  const [taxRate, setTaxRate] = useState(String(DEFAULT_GERMAN_TAX_RATE));
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [documentType, setDocumentType] = useState("ORDER");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  const computedItems = items
    .map((item) => {
      const service = services.find((entry) => entry.id === item.serviceId);
      if (!service) {
        return null;
      }

      return {
        source: item,
        service,
        preview: buildManualOrderItem({
          service: {
            id: service.id,
            name: service.name,
            basePrice: service.basePrice,
          },
          config: service.config,
          item,
        }),
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        source: ManualOrderItemDraft;
        service: AdminManualOrderService;
        preview: ReturnType<typeof buildManualOrderItem>;
      } => entry !== null,
    );
  const subtotalNet = computedItems.reduce(
    (sum, entry) => sum + entry.preview.price,
    0,
  );
  const financials = calculateOrderFinancials({
    subtotalNet,
    discountType: canApplyDiscounts ? discountType : "NONE",
    discountValue: canApplyDiscounts ? Number.parseFloat(discountValue) || 0 : 0,
    taxRate: canEditFinancials ? Number.parseFloat(taxRate) || 0 : DEFAULT_GERMAN_TAX_RATE,
    currency: "EUR",
  });
  const payload = {
    customerMode,
    customerId,
    quickCustomer,
    items,
    internalNotes,
    customerNotes,
    discountType: canApplyDiscounts ? discountType : "NONE",
    discountValue: canApplyDiscounts ? Number.parseFloat(discountValue) || 0 : 0,
    taxRate: canEditFinancials ? Number.parseFloat(taxRate) || 0 : DEFAULT_GERMAN_TAX_RATE,
    paymentStatus: canEditFinancials
      ? normalizePaymentStatus(paymentStatus)
      : "UNPAID",
    paidAmount: canEditFinancials ? Number.parseFloat(paidAmount) || 0 : 0,
    paymentMethod: canEditFinancials ? paymentMethod : "",
    paymentNotes: canEditFinancials ? paymentNotes : "",
    documentType: canEditFinancials
      ? normalizeDocumentType(documentType)
      : "ORDER",
    invoiceNumber: canEditFinancials ? invoiceNumber : "",
    invoiceDate: canEditFinancials ? invoiceDate : "",
    dueDate: canEditFinancials ? dueDate : "",
    assignedToId: canAssignOrders ? assignedToId : "",
  };

  const updateItem = (
    index: number,
    updater: (current: ManualOrderItemDraft) => ManualOrderItemDraft,
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? updater(item) : item,
      ),
    );
  };

  const addItem = () => {
    if (!firstService) {
      return;
    }

    setItems((current) => [
      ...current,
      buildInitialManualOrderItem(firstService.id, firstService.config),
    ]);
  };

  const removeItem = (index: number) => {
    setItems((current) =>
      current.length === 1
        ? current
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  if (!firstService) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800">
        Es sind keine Leistungen für manuelle Aufträge verfügbar.
      </div>
    );
  }

  return (
    <form action={action} className="admin-legacy-skin space-y-8">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <div className="space-y-8">
          <section className="space-y-6 border border-neutral-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-5">
              <UserRound className="h-5 w-5" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
                  Kunde
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Bestehenden Kunden wählen oder direkt im Auftrag anlegen.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setCustomerMode("existing")}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest ${
                  customerMode === "existing"
                    ? "bg-neutral-950 text-white"
                    : "border border-neutral-200 bg-white text-neutral-500"
                }`}
              >
                Bestehender Kunde
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode("quick")}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest ${
                  customerMode === "quick"
                    ? "bg-neutral-950 text-white"
                    : "border border-neutral-200 bg-white text-neutral-500"
                }`}
              >
                Schnell erfassen
              </button>
            </div>

            {customerMode === "existing" && customers.length > 0 ? (
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-950">
                  Kunde auswählen
                </label>
                <select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.companyName ? ` - ${customer.companyName}` : ""}
                      {customer.email ? ` (${customer.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  value={quickCustomer.name}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ansprechpartner"
                  className="border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                />
                <input
                  value={quickCustomer.companyName}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                  placeholder="Firma optional"
                  className="border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                />
                <input
                  value={quickCustomer.email}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="E-Mail optional"
                  className="border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                />
                <input
                  value={quickCustomer.phone}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Telefon optional"
                  className="border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                />
                <input
                  value={quickCustomer.address}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder="Adresse optional"
                  className="border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950 md:col-span-2"
                />
                <input
                  value={quickCustomer.city}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  placeholder="Stadt optional"
                  className="border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                />
                <input
                  value={quickCustomer.postalCode}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      postalCode: event.target.value,
                    }))
                  }
                  placeholder="PLZ optional"
                  className="border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                />
                <input
                  value={quickCustomer.country}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      country: event.target.value,
                    }))
                  }
                  placeholder="Land optional"
                  className="border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                />
                <input
                  value={quickCustomer.taxId}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      taxId: event.target.value,
                    }))
                  }
                  placeholder="Steuer-ID optional"
                  className="border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                />
                <textarea
                  value={quickCustomer.notes}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Kundennotizen optional"
                  className="resize-none border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950 md:col-span-2"
                />
              </div>
            )}
          </section>

          <section className="space-y-6 border border-neutral-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-5">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5" />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
                    Positionen
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Leistungen konfigurieren und bei Bedarf intern überschreiben.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-600 transition-colors hover:border-neutral-950 hover:text-neutral-950"
              >
                <Plus className="h-3 w-3" /> Position
              </button>
            </div>

            <div className="space-y-8">
              {items.map((item, index) => {
                const service =
                  services.find((entry) => entry.id === item.serviceId) ?? firstService;
                const preview =
                  computedItems.find((entry) => entry.source === item)?.preview ??
                  buildManualOrderItem({
                    service: {
                      id: service.id,
                      name: service.name,
                      basePrice: service.basePrice,
                    },
                    config: service.config,
                    item,
                  });

                return (
                  <div
                    key={`${item.serviceId}-${index}`}
                    className="space-y-6 border border-neutral-200 bg-neutral-50 p-6"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                            Leistung
                          </label>
                          <select
                            value={item.serviceId}
                            onChange={(event) => {
                              const nextService =
                                services.find(
                                  (entry) => entry.id === event.target.value,
                                ) ?? firstService;

                              updateItem(index, () =>
                                buildInitialManualOrderItem(
                                  nextService.id,
                                  nextService.config,
                                ),
                              );
                            }}
                            className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                          >
                            {services.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                            Positionsname optional
                          </label>
                          <input
                            value={item.customName}
                            onChange={(event) =>
                              updateItem(index, (current) => ({
                                ...current,
                                customName: event.target.value,
                              }))
                            }
                            placeholder={service.name}
                            className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                          />
                        </div>

                        <div>
                          <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                            Menge
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(index, (current) => ({
                                ...current,
                                quantity: Math.max(
                                  1,
                                  Number.parseInt(event.target.value, 10) || 1,
                                ),
                              }))
                            }
                            className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                          />
                        </div>

                        <div>
                          <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                            Preis override netto optional
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.manualPriceOverride}
                            onChange={(event) =>
                              updateItem(index, (current) => ({
                                ...current,
                                manualPriceOverride: event.target.value,
                              }))
                            }
                            placeholder={preview.calculatedPrice.toFixed(2)}
                            disabled={!canEditFinancials}
                            className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
                          />
                          {!canEditFinancials && (
                            <p className="mt-2 text-[11px] font-bold text-neutral-400">
                              Preis-Overrides bleiben fuer Admin/Super Admin reserviert.
                            </p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                            Beschreibung optional
                          </label>
                          <textarea
                            value={item.description}
                            onChange={(event) =>
                              updateItem(index, (current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            rows={3}
                            className="w-full resize-none border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="inline-flex items-center gap-2 self-start border border-red-200 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
                      >
                        <Minus className="h-3 w-3" /> Entfernen
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {service.config.pricing.mode === "quantity_tiers" &&
                        service.config.pricing.quantityTiers.length > 0 && (
                          <div>
                            <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                              Mengenstaffel
                            </label>
                            <select
                              value={item.selectedQuantityTierId}
                              onChange={(event) =>
                                updateItem(index, (current) => ({
                                  ...current,
                                  selectedQuantityTierId: event.target.value,
                                }))
                              }
                              className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                            >
                              {service.config.pricing.quantityTiers.map((tier) => (
                                <option key={tier.id} value={tier.id}>
                                  {tier.label} - {formatCurrency(tier.price)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                      {service.config.pricing.mode === "area" &&
                        service.config.pricing.area && (
                          <>
                            <div>
                              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                {service.config.pricing.area.widthLabel}
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.widthCm}
                                onChange={(event) =>
                                  updateItem(index, (current) => ({
                                    ...current,
                                    widthCm: event.target.value,
                                  }))
                                }
                                className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                              />
                            </div>
                            <div>
                              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                {service.config.pricing.area.heightLabel}
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.heightCm}
                                onChange={(event) =>
                                  updateItem(index, (current) => ({
                                    ...current,
                                    heightCm: event.target.value,
                                  }))
                                }
                                className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                              />
                            </div>
                          </>
                        )}

                      {service.config.fields.map((field) => {
                        if (isValueField(field) && field.kind !== "size") {
                          return (
                            <div key={field.id}>
                              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                {field.label}
                              </label>
                              <select
                                value={item.selectedValues[field.id] ?? ""}
                                onChange={(event) =>
                                  updateItem(index, (current) => ({
                                    ...current,
                                    selectedValues: {
                                      ...current.selectedValues,
                                      [field.id]: event.target.value,
                                    },
                                  }))
                                }
                                className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                              >
                                {field.values.map((value) => (
                                  <option key={value.id} value={value.id}>
                                    {value.label}
                                    {value.price !== 0
                                      ? ` (+${value.price.toFixed(2)} EUR)`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        if (field.kind === "size") {
                          return (
                            <div key={field.id}>
                              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                {field.label}
                              </label>
                              <select
                                value={item.selectedValues[field.id] ?? ""}
                                onChange={(event) =>
                                  updateItem(index, (current) => ({
                                    ...current,
                                    selectedValues: {
                                      ...current.selectedValues,
                                      [field.id]: event.target.value,
                                    },
                                  }))
                                }
                                className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                              >
                                {field.values.map((value) => (
                                  <option key={value.id} value={value.id}>
                                    {value.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        if (isTextLikeField(field)) {
                          return (
                            <div key={field.id}>
                              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                {field.label}
                              </label>
                              <input
                                type={field.kind === "number" ? "number" : "text"}
                                value={item.textFieldValues[field.id] ?? ""}
                                onChange={(event) =>
                                  updateItem(index, (current) => ({
                                    ...current,
                                    textFieldValues: {
                                      ...current.textFieldValues,
                                      [field.id]: event.target.value,
                                    },
                                  }))
                                }
                                className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                              />
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>

                    {(service.config.fields.some((field) => field.kind === "file") ||
                      service.config.uploadSettings.enabled) && (
                      <div className="border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500">
                        Datei-Uploads werden im manuellen Formular bewusst nicht
                        nachgebaut. Nutzen Sie bitte die Positionsbeschreibung oder
                        die internen Notizen fuer Referenzen zu Druckdaten.
                      </div>
                    )}

                    <div>
                      <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        Positionsnotiz
                      </label>
                      <textarea
                        value={item.orderNotes}
                        onChange={(event) =>
                          updateItem(index, (current) => ({
                            ...current,
                            orderNotes: event.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full resize-none border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t border-neutral-200 pt-5 md:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Berechnet netto
                        </p>
                        <p className="mt-2 text-sm font-bold text-neutral-950">
                          {formatCurrency(preview.calculatedPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Final netto
                        </p>
                        <p className="mt-2 text-sm font-bold text-neutral-950">
                          {formatCurrency(preview.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Snapshot
                        </p>
                        <p className="mt-2 text-sm font-bold text-neutral-950">
                          {preview.configurationSnapshot.pricingModel}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-6 border border-neutral-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-5">
              <ReceiptText className="h-5 w-5" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
                  Hinweise
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Kunden- und interne Hinweise werden am Auftrag gespeichert.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <textarea
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                rows={4}
                placeholder="Hinweis fuer Kunde / Angebot / Rechnung"
                className="resize-none border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
              />
              <textarea
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                rows={4}
                placeholder="Interne Notiz"
                className="resize-none border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
              />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="space-y-6 border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
              Finanzen
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Zwischensumme netto</span>
                <span>{formatCurrency(financials.subtotalNet)}</span>
              </div>

              {canApplyDiscounts ? (
                <div className="grid grid-cols-1 gap-4">
                  <select
                    value={discountType}
                    onChange={(event) => setDiscountType(event.target.value)}
                    className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                  >
                    <option value="NONE">Kein Rabatt</option>
                    <option value="PERCENTAGE">Rabatt in %</option>
                    <option value="FIXED">Rabatt fix</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)}
                    className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
                  />
                </div>
              ) : (
                <div className="border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
                  Rabatte werden fuer Ihre Rolle nicht freigeschaltet.
                </div>
              )}

              <div className="flex items-center justify-between text-sm font-bold">
                <span>Rabatt</span>
                <span>{formatCurrency(financials.discountAmount)}</span>
              </div>

              <div>
                <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  MwSt-Satz
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                  disabled={!canEditFinancials}
                  className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
                />
              </div>

              <div className="flex items-center justify-between text-sm font-bold">
                <span>Netto gesamt</span>
                <span>{formatCurrency(financials.totalNet)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold">
                <span>MwSt</span>
                <span>{formatCurrency(financials.taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 pt-4 text-base font-bold">
                <span>Brutto gesamt</span>
                <span>{formatCurrency(financials.totalGross)}</span>
              </div>
            </div>
          </section>

          <section className="space-y-4 border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
              Zahlung & Dokument
            </h2>

            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              disabled={!canEditFinancials}
              className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              <option value="UNPAID">Unbezahlt</option>
              <option value="PARTIALLY_PAID">Teilweise bezahlt</option>
              <option value="PAID">Bezahlt</option>
              <option value="REFUNDED">Erstattet</option>
            </select>

            <input
              type="number"
              min="0"
              step="0.01"
              value={paidAmount}
              onChange={(event) => setPaidAmount(event.target.value)}
              disabled={!canEditFinancials}
              placeholder="Bezahlt bisher"
              className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
            />

            <input
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              disabled={!canEditFinancials}
              placeholder="Zahlungsmethode optional"
              className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
            />

            <textarea
              value={paymentNotes}
              onChange={(event) => setPaymentNotes(event.target.value)}
              disabled={!canEditFinancials}
              rows={3}
              placeholder="Zahlungsnotizen optional"
              className="w-full resize-none border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
            />

            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              disabled={!canEditFinancials}
              className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              <option value="ORDER">Auftrag</option>
              <option value="OFFER">Angebot</option>
              <option value="INVOICE">Rechnung</option>
            </select>

            <input
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              disabled={!canEditFinancials}
              placeholder="Belegnummer optional"
              className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
            />

            <input
              type="date"
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
              disabled={!canEditFinancials}
              className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
            />

            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={!canEditFinancials}
              className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400"
            />

            {!canEditFinancials && (
              <p className="text-[11px] font-bold leading-5 text-neutral-400">
                Zahlungs-, Rabatt- und Dokumentdaten sind fuer Staff bewusst eingeschraenkt.
              </p>
            )}
          </section>

          <section className="space-y-4 border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
              Zuweisung
            </h2>

            {canAssignOrders ? (
              <select
                value={assignedToId}
                onChange={(event) => setAssignedToId(event.target.value)}
                className="w-full border border-neutral-300 bg-white p-4 text-sm outline-none transition-colors focus:border-neutral-950"
              >
                <option value="">Nicht zugewiesen</option>
                {staffOptions.map((staffUser) => (
                  <option key={staffUser.id} value={staffUser.id}>
                    {staffUser.name} ({staffUser.role})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-neutral-500">
                Der Auftrag wird nach dem Speichern automatisch Ihrem Konto zugeordnet.
              </p>
            )}
          </section>

          <button
            type="submit"
            className="w-full bg-neutral-950 px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
          >
            Auftrag speichern
          </button>
        </aside>
      </div>
    </form>
  );
}
