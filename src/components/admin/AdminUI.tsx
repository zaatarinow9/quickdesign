import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminTone =
  | "slate"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "purple";

const TONE_STYLES: Record<
  AdminTone,
  {
    badge: string;
    surface: string;
    icon: string;
  }
> = {
  slate: {
    badge:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
    surface:
      "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60",
    icon: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950",
  },
  blue: {
    badge:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/80 dark:bg-sky-950/60 dark:text-sky-200",
    surface:
      "border-sky-200 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/40",
    icon: "bg-sky-600 text-white dark:bg-sky-500 dark:text-slate-950",
  },
  emerald: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/60 dark:text-emerald-200",
    surface:
      "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40",
    icon: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950",
  },
  amber: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/60 dark:text-amber-200",
    surface:
      "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40",
    icon: "bg-amber-500 text-slate-950 dark:bg-amber-400 dark:text-slate-950",
  },
  rose: {
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/60 dark:text-rose-200",
    surface:
      "border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/40",
    icon: "bg-rose-600 text-white dark:bg-rose-500 dark:text-slate-950",
  },
  purple: {
    badge:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/80 dark:bg-violet-950/60 dark:text-violet-200",
    surface:
      "border-violet-200 bg-violet-50/80 dark:border-violet-900/60 dark:bg-violet-950/40",
    icon: "bg-violet-600 text-white dark:bg-violet-500 dark:text-slate-950",
  },
};

export function getAdminButtonClassName(
  variant: "primary" | "secondary" | "ghost" | "danger",
): string {
  switch (variant) {
    case "primary":
      return "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white";
    case "secondary":
      return "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white";
    case "ghost":
      return "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white";
    case "danger":
      return "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-950";
    default:
      return "";
  }
}

export function AdminCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 border-b border-slate-200/80 pb-8 dark:border-slate-800 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-3">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.12em] text-sky-600 dark:text-sky-300">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-4xl">
          {title}
        </h1>
        {description && (
          <div className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {description}
          </div>
        )}
      </div>

      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function AdminSectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AdminCard className={cn("p-6 md:p-8", className)}>
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {title}
            </h2>
            {description && (
              <div className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                {description}
              </div>
            )}
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>

      <div className="mt-6">{children}</div>
    </AdminCard>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "slate",
  className,
}: {
  label: string;
  value: string | number;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: AdminTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-5 shadow-sm transition-transform hover:-translate-y-0.5",
        TONE_STYLES[tone].surface,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.08em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {value}
          </p>
        </div>

        {Icon && (
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm",
              TONE_STYLES[tone].icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {hint && (
        <div className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {hint}
        </div>
      )}
    </div>
  );
}

export function AdminBadge({
  children,
  tone = "slate",
  icon: Icon,
  className,
}: {
  children: ReactNode;
  tone?: AdminTone;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-normal",
        TONE_STYLES[tone].badge,
        className,
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{children}</span>
    </span>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/50",
        className,
      )}
    >
      {Icon && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
        {title}
      </h3>
      {description && (
        <div className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </div>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
