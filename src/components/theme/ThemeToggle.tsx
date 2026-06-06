"use client";

import { LaptopMinimal, MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ADMIN_THEME_STORAGE_KEY,
  applyAdminThemePreference,
  normalizeAdminThemePreference,
  type AdminThemePreference,
  type ResolvedAdminTheme,
} from "@/lib/theme";

type ThemeOption = {
  value: AdminThemePreference;
  label: string;
  icon: typeof SunMedium;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Hell",
    icon: SunMedium,
  },
  {
    value: "dark",
    label: "Dunkel",
    icon: MoonStar,
  },
  {
    value: "system",
    label: "System",
    icon: LaptopMinimal,
  },
];

function getResolvedThemeLabel(theme: ResolvedAdminTheme): string {
  return theme === "dark" ? "Dunkel aktiv" : "Hell aktiv";
}

export default function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  const [preference, setPreference] = useState<AdminThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedAdminTheme>("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const storedPreference = normalizeAdminThemePreference(
      window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY),
    );
    const nextResolvedTheme = applyAdminThemePreference({
      pathname: window.location.pathname,
      preference: storedPreference,
      prefersDark: mediaQuery.matches,
    });

    setPreference(storedPreference);
    setResolvedTheme(nextResolvedTheme);
  }, []);

  const updateTheme = (nextPreference: AdminThemePreference) => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, nextPreference);

    const nextResolvedTheme = applyAdminThemePreference({
      pathname: window.location.pathname,
      preference: nextPreference,
      prefersDark: mediaQuery.matches,
    });

    setPreference(nextPreference);
    setResolvedTheme(nextResolvedTheme);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 p-1 text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200",
        className,
      )}
    >
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = preference === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => updateTheme(option.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
              isActive
                ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
            )}
            aria-pressed={isActive}
            aria-label={`Theme ${option.label}`}
            title={option.label}
          >
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
          </button>
        );
      })}

      <span className="hidden pr-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 xl:inline">
        {getResolvedThemeLabel(resolvedTheme)}
      </span>
    </div>
  );
}
