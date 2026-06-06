export const ADMIN_THEME_STORAGE_KEY = "qd-admin-theme";

export const ADMIN_THEME_OPTIONS = [
  "light",
  "dark",
  "system",
] as const;

export type AdminThemePreference = (typeof ADMIN_THEME_OPTIONS)[number];
export type ResolvedAdminTheme = "light" | "dark";

export function normalizeAdminThemePreference(
  value: string | null | undefined,
): AdminThemePreference {
  switch (value) {
    case "light":
    case "dark":
    case "system":
      return value;
    default:
      return "system";
  }
}

export function resolveAdminThemePreference(
  preference: AdminThemePreference,
  prefersDark: boolean,
): ResolvedAdminTheme {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }

  return preference;
}

export function isAdminThemePath(pathname: string | null | undefined): boolean {
  return typeof pathname === "string" && pathname.startsWith("/admin");
}

export function applyAdminThemePreference(options: {
  pathname: string | null | undefined;
  preference: AdminThemePreference;
  prefersDark: boolean;
}): ResolvedAdminTheme {
  const resolvedTheme = resolveAdminThemePreference(
    options.preference,
    options.prefersDark,
  );

  if (typeof document === "undefined") {
    return resolvedTheme;
  }

  const root = document.documentElement;
  const shouldUseAdminTheme = isAdminThemePath(options.pathname);

  root.dataset.themePreference = options.preference;
  root.dataset.themeResolved = shouldUseAdminTheme ? resolvedTheme : "light";
  root.classList.toggle("dark", shouldUseAdminTheme && resolvedTheme === "dark");
  root.style.colorScheme = shouldUseAdminTheme ? resolvedTheme : "light";

  return resolvedTheme;
}

export function getAdminThemeInlineScript(): string {
  return `(() => {
    const storageKey = ${JSON.stringify(ADMIN_THEME_STORAGE_KEY)};
    const normalizePreference = (value) => {
      switch (value) {
        case "light":
        case "dark":
        case "system":
          return value;
        default:
          return "system";
      }
    };
    const isAdminPath = (pathname) =>
      typeof pathname === "string" && pathname.startsWith("/admin");
    const getSystemTheme = () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const preference = normalizePreference(window.localStorage.getItem(storageKey));
    const resolvedTheme = preference === "system" ? getSystemTheme() : preference;
    const shouldUseAdminTheme = isAdminPath(window.location.pathname);
    const root = document.documentElement;
    root.dataset.themePreference = preference;
    root.dataset.themeResolved = shouldUseAdminTheme ? resolvedTheme : "light";
    root.classList.toggle("dark", shouldUseAdminTheme && resolvedTheme === "dark");
    root.style.colorScheme = shouldUseAdminTheme ? resolvedTheme : "light";
  })();`;
}
