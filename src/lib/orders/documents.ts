import {
  normalizeDocumentType,
  type DocumentType,
} from "@/lib/orders/finance";

export const ORDER_DOCUMENT_QUERY_TYPES = [
  "invoice",
  "offer",
  "order",
] as const;

export type OrderDocumentQueryType =
  (typeof ORDER_DOCUMENT_QUERY_TYPES)[number];

type OrderDocumentDefinition = {
  documentType: DocumentType;
  label: string;
  numberLabel: string;
};

export const ORDER_DOCUMENT_DEFINITIONS: Record<
  OrderDocumentQueryType,
  OrderDocumentDefinition
> = {
  invoice: {
    documentType: "INVOICE",
    label: "Rechnung",
    numberLabel: "Rechnungsnummer",
  },
  offer: {
    documentType: "OFFER",
    label: "Angebot",
    numberLabel: "Angebotsnummer",
  },
  order: {
    documentType: "ORDER",
    label: "Auftrag",
    numberLabel: "Auftragsnummer",
  },
};

export const ORDER_DOCUMENT_LINKS = ORDER_DOCUMENT_QUERY_TYPES.map((type) => ({
  type,
  ...ORDER_DOCUMENT_DEFINITIONS[type],
}));

export function parseOrderDocumentQueryType(
  value: string | null | undefined,
): OrderDocumentQueryType | null {
  switch (value?.trim().toLowerCase()) {
    case "invoice":
      return "invoice";
    case "offer":
      return "offer";
    case "order":
      return "order";
    default:
      return null;
  }
}

export function normalizeOrderDocumentQueryType(
  value: string | null | undefined,
  fallbackDocumentType?: string | null,
): OrderDocumentQueryType {
  const parsedValue = parseOrderDocumentQueryType(value);

  if (parsedValue) {
    return parsedValue;
  }

  switch (normalizeDocumentType(fallbackDocumentType)) {
    case "INVOICE":
      return "invoice";
    case "OFFER":
      return "offer";
    case "ORDER":
    default:
      return "order";
  }
}

export function buildOrderDocumentHref(
  orderId: string,
  type: OrderDocumentQueryType,
): string {
  return `/admin/orders/${orderId}/document?type=${type}`;
}

export function buildOrderDocumentDownloadHref(
  orderId: string,
  type: OrderDocumentQueryType,
): string {
  return `/admin/orders/${orderId}/document/download?type=${type}`;
}

export function buildSharedOrderDocumentHref(
  orderId: string,
  type: OrderDocumentQueryType,
  expires: string,
  signature: string,
): string {
  return `/documents/order/${orderId}?type=${type}&expires=${expires}&signature=${signature}`;
}
