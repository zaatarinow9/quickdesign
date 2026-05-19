import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getOrderDocumentShareSecret } from "@/lib/env";
import { type OrderDocumentQueryType } from "@/lib/orders/documents";

const DOCUMENT_SHARE_MAX_AGE_MS = 1000 * 60 * 60 * 72;

function buildSignaturePayload(
  orderId: string,
  type: OrderDocumentQueryType,
  expiresAt: number,
): string {
  return `${orderId}:${type}:${expiresAt}`;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getOrderDocumentShareSecret())
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
  const currentTimestamp = Date.now();

  if (!Number.isFinite(expiresAt) || expiresAt <= currentTimestamp) {
    return false;
  }

  if (expiresAt - currentTimestamp > DOCUMENT_SHARE_MAX_AGE_MS) {
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
