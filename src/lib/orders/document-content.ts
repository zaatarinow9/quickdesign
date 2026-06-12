import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { formatCustomerLocation } from "@/lib/customers";
import {
  ORDER_DOCUMENT_DEFINITIONS,
  type OrderDocumentQueryType,
} from "@/lib/orders/documents";
import {
  getOrderFinancials,
  getOrderPaymentStatus,
  normalizeDiscountType,
} from "@/lib/orders/finance";
import { prisma } from "@/lib/prisma";
import {
  extractStoredOrderTextInputs,
  getSnapshotOrBuildLegacy,
  normalizeLegacySelectedOptions,
} from "@/lib/services/configuration/snapshot";

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unbezahlt",
  PARTIALLY_PAID: "Teilweise bezahlt",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
};

const BRAND_FALLBACK_NAME = "QuickDesign";
const BRAND_ADDRESS_LINES = [
  "Musterstrasse 1",
  "12345 Musterstadt",
  "Deutschland",
];
const BRAND_CONTACT_LINES = [
  "Telefon: +49 1577 2785677",
  "E-Mail: info@quickdesign24.de",
];
const BRAND_LEGAL_LINES = [
  "USt-IdNr.: DE000000000",
  "Handelsregister: HRB 00000",
  "Bankverbindung / IBAN Placeholder",
];

type OrderDocumentArgs = {
  include: {
    customer: {
      select: {
        id: true;
        name: true;
        companyName: true;
        email: true;
        phone: true;
        address: true;
        postalCode: true;
        city: true;
        country: true;
        taxId: true;
      };
    };
    assignedTo: {
      select: {
        id: true;
        name: true;
        role: true;
      };
    };
    items: true;
  };
};

export type OrderDocumentRecord = Prisma.OrderGetPayload<OrderDocumentArgs>;

export type OrderDocumentBranding = {
  companyName: string;
  addressLines: string[];
  contactLines: string[];
  legalLines: string[];
  logoSrc: string | null;
  logoFallbackText: string;
};

export type OrderDocumentItemSummary = {
  description: string | null;
  detailLines: string[];
};

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatMeasure(value: number, digits: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export async function getOrderDocumentRecord(
  orderId: string,
): Promise<OrderDocumentRecord | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
          address: true,
          postalCode: true,
          city: true,
          country: true,
          taxId: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      items: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });
}

export function getOrderDocumentBranding(): OrderDocumentBranding {
  const preferredLogoPath = join(process.cwd(), "public", "logo.png");
  const fallbackLogoPath = join(process.cwd(), "public", "brand", "logo.png");
  const logoSrc = existsSync(preferredLogoPath)
    ? "/logo.png"
    : existsSync(fallbackLogoPath)
      ? "/brand/logo.png"
      : null;

  return {
    companyName: BRAND_FALLBACK_NAME,
    addressLines: BRAND_ADDRESS_LINES,
    contactLines: BRAND_CONTACT_LINES,
    legalLines: BRAND_LEGAL_LINES,
    logoSrc,
    logoFallbackText: BRAND_FALLBACK_NAME,
  };
}

export function formatDateValue(value: Date | null | undefined): string | null {
  return value ? format(new Date(value), "dd.MM.yyyy") : null;
}

export function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatDocumentNumber(
  primaryValue: string | null | undefined,
  fallbackValue: number | null | undefined,
): string {
  if (typeof primaryValue === "string" && primaryValue.trim() !== "") {
    return primaryValue.trim();
  }

  if (typeof fallbackValue === "number" && Number.isFinite(fallbackValue)) {
    return String(fallbackValue);
  }

  return "Entwurf";
}

export function getDiscountLabel(
  discountType: string | null | undefined,
  discountValue: number | null | undefined,
): string {
  const normalizedDiscountType = normalizeDiscountType(discountType);

  switch (normalizedDiscountType) {
    case "PERCENTAGE":
      return `Rabatt (${formatMeasure(discountValue ?? 0, 2)} %)`;
    case "FIXED":
      return "Rabatt (fix)";
    case "NONE":
    default:
      return "Rabatt";
  }
}

export function buildCustomerAddressLines(order: OrderDocumentRecord): string[] {
  if (!order.customer) {
    return [];
  }

  const lines: string[] = [];
  const address = order.customer.address?.trim();
  const location = formatCustomerLocation(order.customer);

  if (address) {
    lines.push(address);
  }

  if (location) {
    lines.push(location);
  }

  return lines;
}

export function buildOrderDocumentItemSummary(
  item: OrderDocumentRecord["items"][number],
): OrderDocumentItemSummary {
  const selectedOptions = normalizeLegacySelectedOptions(item.selectedOptions);
  const storedTextInputs = extractStoredOrderTextInputs(item.textInputs);
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

  const detailLines: string[] = [];

  if (snapshot.selectedPricingTier?.label) {
    detailLines.push(`Staffel: ${snapshot.selectedPricingTier.label}`);
  }

  if (snapshot.size) {
    detailLines.push(`${snapshot.size.fieldLabel}: ${snapshot.size.value}`);
  }

  if (snapshot.area) {
    detailLines.push(
      `Format: ${formatMeasure(snapshot.area.widthCm, 1)} x ${formatMeasure(snapshot.area.heightCm, 1)} cm (${formatMeasure(snapshot.area.areaSqm, 2)} m2)`,
    );
  }

  if (snapshot.color) {
    detailLines.push(`${snapshot.color.fieldLabel}: ${snapshot.color.value}`);
  }

  if (snapshot.selectedOptions.length > 0) {
    const optionSummary = snapshot.selectedOptions
      .slice(0, 4)
      .map((option) => `${option.fieldLabel}: ${option.valueLabel}`)
      .join(" | ");
    const remainingOptionsCount = snapshot.selectedOptions.length - 4;

    detailLines.push(
      `Optionen: ${optionSummary}${remainingOptionsCount > 0 ? ` | +${remainingOptionsCount} weitere` : ""}`,
    );
  }

  if (snapshot.textFields.length > 0) {
    const textSummary = snapshot.textFields
      .slice(0, 2)
      .map((field) => `${field.fieldLabel}: ${field.value}`)
      .join(" | ");

    detailLines.push(`Angaben: ${truncateText(textSummary, 140)}`);
  }

  if (snapshot.design) {
    detailLines.push(
      `Design: Modell ${snapshot.design.model}, Farbe ${snapshot.design.color}`,
    );
  }

  if (snapshot.uploadFields.length > 0) {
    const uploadCount = snapshot.uploadFields.reduce(
      (total, field) => total + field.files.length,
      0,
    );

    if (uploadCount > 0) {
      detailLines.push(`Druckdaten: ${uploadCount} Uploads hinterlegt`);
    }
  }

  if (snapshot.orderNotes?.trim()) {
    detailLines.push(`Hinweis: ${truncateText(snapshot.orderNotes.trim(), 140)}`);
  }

  return {
    description: item.itemDescription?.trim() || null,
    detailLines: detailLines.slice(0, 5),
  };
}

export function getOrderDocumentDetails(
  order: Pick<
    OrderDocumentRecord,
    | "invoiceNumber"
    | "orderNumber"
    | "invoiceDate"
    | "createdAt"
    | "dueDate"
    | "discountType"
    | "discountValue"
    | "paymentStatus"
    | "status"
  > &
    Parameters<typeof getOrderFinancials>[0],
  documentQueryType: OrderDocumentQueryType,
) {
  const definition = ORDER_DOCUMENT_DEFINITIONS[documentQueryType];
  const financials = getOrderFinancials(order);
  const paymentStatus = getOrderPaymentStatus(order);
  const documentNumber = formatDocumentNumber(order.invoiceNumber, order.orderNumber);

  return {
    definition,
    financials,
    paymentStatus,
    paymentStatusLabel:
      PAYMENT_STATUS_LABELS[paymentStatus] ?? PAYMENT_STATUS_LABELS.UNPAID,
    documentNumber,
    documentDate: formatDateValue(order.invoiceDate ?? order.createdAt),
    dueDate: formatDateValue(order.dueDate),
    discountLabel: getDiscountLabel(order.discountType, order.discountValue),
    defaultEmailSubject: `${definition.label} ${documentNumber}`,
  };
}

export function buildOrderDocumentEmailText(input: {
  customerName: string;
  documentLabel: string;
  documentNumber: string;
  shareUrl: string;
  customMessage?: string | null;
}): string {
  const introLines = input.customMessage?.trim()
    ? [input.customMessage.trim()]
    : [
        input.customerName.trim()
          ? `Guten Tag ${input.customerName.trim()},`
          : "Guten Tag,",
        "",
        `hier ist Ihr ${input.documentLabel.toLowerCase()} ${input.documentNumber}.`,
      ];

  return [
    ...introLines,
    "",
    `Dokumentlink: ${input.shareUrl}`,
    "",
    "Hinweis: In Phase 8B wird das Dokument noch als sicherer Link versendet.",
    'Für eine PDF-Datei nutzen Sie im Browser bitte "Als PDF speichern".',
    "",
    "Viele Grüße",
    BRAND_FALLBACK_NAME,
  ].join("\r\n");
}
