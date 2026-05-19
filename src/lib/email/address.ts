const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function extractEmailAddress(value: string): string {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/<([^>]+)>/);

  return (match?.[1] ?? trimmedValue).trim();
}

export function normalizeEmailAddress(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const extractedValue = extractEmailAddress(value).toLowerCase();
  return extractedValue && EMAIL_ADDRESS_PATTERN.test(extractedValue)
    ? extractedValue
    : null;
}

export function isValidEmailAddress(value: string): boolean {
  return normalizeEmailAddress(value) !== null;
}
