const LEGACY_ADMIN_LOGIN_PATH = "/admin/login";

export const HIDE_PUBLIC_CHROME_HEADER = "x-hide-public-chrome";

let hasLoggedAdminLoginPathWarning = false;

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

function normalizePathname(pathname: string): string {
  if (!pathname.startsWith("/")) {
    return `/${pathname}`;
  }

  return pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
}

function normalizeConfiguredAdminLoginPath(
  value: string | undefined,
): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (!trimmedValue.startsWith("/")) {
    return null;
  }

  if (trimmedValue === "/") {
    return null;
  }

  if (trimmedValue.includes("?") || trimmedValue.includes("#")) {
    return null;
  }

  return normalizePathname(trimmedValue);
}

export function getLegacyAdminLoginPath(): string {
  return LEGACY_ADMIN_LOGIN_PATH;
}

export function getAdminLoginPath(): string {
  const rawConfiguredPath = process.env.ADMIN_LOGIN_PATH;
  const normalizedConfiguredPath =
    normalizeConfiguredAdminLoginPath(rawConfiguredPath);

  if (normalizedConfiguredPath) {
    return normalizedConfiguredPath;
  }

  if (isProductionEnvironment() && !hasLoggedAdminLoginPathWarning) {
    hasLoggedAdminLoginPathWarning = true;

    console.warn(
      rawConfiguredPath?.trim()
        ? `ADMIN_LOGIN_PATH ist ungueltig (${rawConfiguredPath}). Fallback auf ${LEGACY_ADMIN_LOGIN_PATH}. Bitte Vercel-Umgebungsvariablen pruefen und neu deployen.`
        : `ADMIN_LOGIN_PATH fehlt. Fallback auf ${LEGACY_ADMIN_LOGIN_PATH}. Bitte den versteckten Admin-Pfad in Vercel setzen und neu deployen.`,
    );
  }

  return LEGACY_ADMIN_LOGIN_PATH;
}

export function isAdminLoginPath(pathname: string): boolean {
  return normalizePathname(pathname) === getAdminLoginPath();
}
