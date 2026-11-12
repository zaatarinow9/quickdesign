"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Cookie, X } from "lucide-react";
import { consentCategories, onOpenConsent, openConsentSettings, saveConsent, useConsentState, type ConsentCategory } from "@/lib/consent";
import { cn } from "@/lib/utils";

/**
 * Einwilligungs-Banner: gleichwertige Schaltflächen („Alle akzeptieren“ / „Nur notwendige“),
 * keine vorausgewählten Kategorien, Detail-Einstellungen, jederzeit über den Seitenfuß änderbar.
 */
export default function CookieConsent() {
  const state = useConsentState();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [choice, setChoice] = useState<Record<ConsentCategory, boolean>>({ statistik: false, marketing: false });
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      onOpenConsent(() => {
        setChoice({ statistik: !!state?.statistik, marketing: !!state?.marketing });
        setDetails(true);
        setOpen(true);
      }),
    [state],
  );

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("input, button")?.focus({ preventScroll: true });
  }, [open]);

  if (!(open || state === null)) return null;

  const decide = (c: Record<ConsentCategory, boolean>) => {
    saveConsent(c);
    setOpen(false);
    setDetails(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-5 print:hidden">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        className="mx-auto max-w-3xl overflow-hidden rounded-[1.5rem] bg-ink text-paper shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)] ring-1 ring-paper/10"
      >
        <span aria-hidden className="block h-1 bg-brand-gradient" />
        <div className="max-h-[78svh] overflow-y-auto p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="hidden size-11 shrink-0 place-items-center rounded-full bg-paper/10 sm:grid">
              <Cookie aria-hidden className="size-5 text-accent" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h2 id={titleId} className="font-[family-name:var(--font-display)] text-xl font-medium">
                  Ihre Privatsphäre ist uns wichtig
                </h2>
                {open && state ? (
                  <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="-mr-2 -mt-1 grid size-10 place-items-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper">
                    <X aria-hidden className="size-5" />
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-[0.94rem] leading-relaxed text-paper/70">
                Wir nutzen technisch notwendige Speichertechniken. Mit Ihrer Einwilligung erfassen wir zusätzlich anonyme Statistiken und – für unsere Werbeplanung – über welche Kampagne Sie uns gefunden haben. Daten werden nicht an Werbenetzwerke weitergegeben. Ihre Einwilligung ist freiwillig und jederzeit über „Cookie-Einstellungen“ im Seitenfuß widerrufbar.{" "}
                <Link href="/datenschutz#cookies" className="text-paper underline underline-offset-2 hover:text-accent">
                  Datenschutzerklärung
                </Link>
              </p>
            </div>
          </div>

          {details ? (
            <ul className="mt-5 space-y-3">
              <li className="rounded-xl bg-paper/[0.05] p-4 ring-1 ring-paper/10">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">Notwendig</p>
                  <span className="rounded-full bg-paper/15 px-2.5 py-1 text-xs">Immer aktiv</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-paper/60">Speichert Ihre Auswahl auf diesem Gerät und ermöglicht die sichere Anmeldung im Verwaltungsbereich.</p>
              </li>
              {consentCategories.map((c) => (
                <li key={c.id} className="rounded-xl p-4 ring-1 ring-paper/10">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <span className="font-medium">{c.title}</span>
                    <span className="relative inline-flex shrink-0">
                      <input type="checkbox" className="peer sr-only" checked={choice[c.id]} onChange={(e) => setChoice((s) => ({ ...s, [c.id]: e.target.checked }))} />
                      <span aria-hidden className="h-7 w-12 rounded-full bg-paper/20 transition-colors peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
                      <span aria-hidden className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                    </span>
                  </label>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{c.text}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
            {details ? (
              <Btn variant="outline" onClick={() => decide(choice)}>
                Auswahl speichern
              </Btn>
            ) : (
              <Btn variant="outline" onClick={() => setDetails(true)}>
                Einstellungen
              </Btn>
            )}
            <Btn variant="paper" onClick={() => decide({ statistik: false, marketing: false })}>
              Nur notwendige
            </Btn>
            <Btn variant="accent" onClick={() => decide({ statistik: true, marketing: true })}>
              Alle akzeptieren
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Btn({ variant, onClick, children }: { variant: "outline" | "paper" | "accent"; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-12 rounded-full px-5 text-[0.94rem] font-medium transition-colors",
        variant === "outline" && "ring-1 ring-paper/25 hover:bg-paper/10",
        variant === "paper" && "bg-paper text-ink hover:bg-paper-2",
        variant === "accent" && "bg-accent text-white hover:bg-[#c31274]",
      )}
    >
      {children}
    </button>
  );
}

export function ConsentSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      Cookie-Einstellungen
    </button>
  );
}
