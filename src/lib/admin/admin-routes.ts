const LEGACY_ADMIN_LOGIN_PATH = "/admin/login";

export const HIDE_PUBLIC_CHROME_HEADER = "x-hide-public-chrome";

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
  return (
    normalizeConfiguredAdminLoginPath(process.env.ADMIN_LOGIN_PATH) ??
    LEGACY_ADMIN_LOGIN_PATH
  );
}

export function isAdminLoginPath(pathname: string): boolean {
  return normalizePathname(pathname) === getAdminLoginPath();
}
