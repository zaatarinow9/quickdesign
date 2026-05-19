import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { type OrderDocumentQueryType } from "@/lib/orders/documents";

const DOCUMENT_SHARE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function getDocumentShareSecret(): string {
  return (
    process.env.ORDER_DOCUMENT_SHARE_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "development-order-document-share-secret"
  );
}

function buildSignaturePayload(
  orderId: string,
  type: OrderDocumentQueryType,
  expiresAt: number,
): string {
  return `${orderId}:${type}:${expiresAt}`;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getDocumentShareSecret())
    .update(payload)
    .digest("hex");
}

export function createOrderDocumentShareToken(input: {
  orderId: string;
  type: OrderDocumentQueryType;
  expiresAt?: number;
}): { expires: string; signature: string } {
  const expiresAt = input.expiresAt ?? Date.now() + DOCUMENT_SHARE_MAX_AGE_MS;
  const payload = buildSignaturePayload(input.orderId, input.type, expiresAt);

  return {
    expires: String(expiresAt),
    signature: signPayload(payload),
  };
}

export function verifyOrderDocumentShareToken(input: {
  orderId: string;
  type: OrderDocumentQueryType;
  expires: string | null | undefined;
  signature: string | null | undefined;
}): boolean {
  const expiresAt = Number.parseInt(input.expires ?? "", 10);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  if (expiresAt - Date.now() > DOCUMENT_SHARE_MAX_AGE_MS * 2) {
    return false;
  }

  if (!input.signature) {
    return false;
  }

  const expectedSignature = signPayload(
    buildSignaturePayload(input.orderId, input.type, expiresAt),
  );
  const providedBuffer = Buffer.from(input.signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
