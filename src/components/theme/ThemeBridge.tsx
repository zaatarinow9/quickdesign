"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  ADMIN_THEME_STORAGE_KEY,
  applyAdminThemePreference,
  normalizeAdminThemePreference,
} from "@/lib/theme";

export default function ThemeBridge() {
  const pathname = usePathname();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const syncTheme = () => {
      const preference = normalizeAdminThemePreference(
        window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY),
      );

      applyAdminThemePreference({
        pathname,
        preference,
        prefersDark: mediaQuery.matches,
      });
    };

    syncTheme();

    const handleChange = () => {
      syncTheme();
    };

    mediaQuery.addEventListener("change", handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, [pathname]);

  return null;
}
