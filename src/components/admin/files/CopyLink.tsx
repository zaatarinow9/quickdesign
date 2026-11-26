"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";


export async function copyLink(path: string) {
  const url = `${window.location.origin}${path}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Fallback für ältere Browser / ohne Berechtigung
    const t = document.createElement("textarea");
    t.value = url;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
}

/** Knopf „Link kopieren“ mit kurzer Bestätigung */
export function CopyLink({ path, label, className, iconOnly, title }: { path: string; label?: string; className?: string; iconOnly?: boolean; title?: string }) {
  const [done, setDone] = useState(false);
  const hint = title ?? "Link kopieren – öffnet sich nur für Personen mit Zugang zur Verwaltung";
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await copyLink(path);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      className={className}
      title={hint}
      aria-label={done ? "Link kopiert" : hint}
    >
      {done ? <Check className={cn("size-4", !iconOnly && "text-emerald-600")} aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      {iconOnly ? null : <span>{done ? "Link kopiert" : (label ?? "Link kopieren")}</span>}
    </button>
  );
}
