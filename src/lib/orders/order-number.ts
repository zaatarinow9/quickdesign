import { randomInt } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

const PUBLIC_ORDER_CODE_PREFIX = "QD";
const PUBLIC_ORDER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLIC_ORDER_CODE_TOTAL_LENGTH = 10;
const PUBLIC_ORDER_CODE_RETRY_LIMIT = 8;

type OrderCodeClient = Pick<PrismaClient, "order">;

export function generatePublicOrderCode(): string {
  const randomPartLength =
    PUBLIC_ORDER_CODE_TOTAL_LENGTH - PUBLIC_ORDER_CODE_PREFIX.length;
  let randomPart = "";

  for (let index = 0; index < randomPartLength; index += 1) {
    randomPart += PUBLIC_ORDER_CODE_ALPHABET[randomInt(0, PUBLIC_ORDER_CODE_ALPHABET.length)];
  }

  return `${PUBLIC_ORDER_CODE_PREFIX}${randomPart}`;
}

export function normalizePublicOrderLookup(value: string): string {
  return value.trim().toUpperCase();
}

export function isLegacyNumericOrderLookup(value: string): boolean {
  return /^[0-9]+$/.test(value.trim());
}

export async function createUniqueOrderCode(
  client: OrderCodeClient,
): Promise<string> {
  for (let attempt = 0; attempt < PUBLIC_ORDER_CODE_RETRY_LIMIT; attempt += 1) {
    const nextCode = generatePublicOrderCode();
    const existingOrder = await client.order.findFirst({
      where: {
        trackingNumber: nextCode,
      },
      select: {
        id: true,
      },
    });

    if (!existingOrder) {
      return nextCode;
    }
  }

  throw new Error("Unable to create a unique public order code.");
}
