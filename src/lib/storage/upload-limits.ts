export const MAX_SERVER_ACTION_UPLOAD_MB = 4;

export function getEffectiveUploadLimitMb(
  configuredMaxFileSizeMb: number | null | undefined,
): number {
  if (
    typeof configuredMaxFileSizeMb !== "number" ||
    !Number.isFinite(configuredMaxFileSizeMb) ||
    configuredMaxFileSizeMb <= 0
  ) {
    return MAX_SERVER_ACTION_UPLOAD_MB;
  }

  return Math.min(configuredMaxFileSizeMb, MAX_SERVER_ACTION_UPLOAD_MB);
}

export function isUploadLimitCapped(
  configuredMaxFileSizeMb: number | null | undefined,
): boolean {
  return (
    typeof configuredMaxFileSizeMb === "number" &&
    Number.isFinite(configuredMaxFileSizeMb) &&
    configuredMaxFileSizeMb > MAX_SERVER_ACTION_UPLOAD_MB
  );
}

export function getServerActionUploadLimitMessage(
  limitMb = MAX_SERVER_ACTION_UPLOAD_MB,
): string {
  return `Die Datei ist zu gro\u00DF. Bitte laden Sie eine Datei bis maximal ${limitMb} MB hoch.`;
}
