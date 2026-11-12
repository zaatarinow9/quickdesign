"use client";

import { useSyncExternalStore } from "react";

/**
 * Einwilligungsverwaltung nach § 25 TDDDG und Art. 6 Abs. 1 lit. a / Art. 7 DSGVO.
 * - Notwendig: immer aktiv (Speicherung dieser Auswahl, Anmeldung in der Verwaltung).
 * - Statistik: eigene, cookielose Reichweitenmessung (ohne IP, ohne Drittanbieter).
 * - Marketing: Kampagnen-Zuordnung (UTM-Parameter) zu Anfragen für Werbezwecke.
 * Optionale Kategorien bleiben bis zur aktiven Zustimmung blockiert; Widerruf jederzeit im Seitenfuß.
 */
export const CONSENT_VERSION = 1;
const KEY = "qd-consent";
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = "qd-consent-open";
const CHANGE_EVENT = "qd-consent-change";

export type ConsentCategory = "statistik" | "marketing";
export type ConsentState = { v: number; ts: number; statistik: boolean; marketing: boolean };

export const consentCategories: { id: ConsentCategory; title: string; text: string }[] = [
  {
    id: "statistik",
    title: "Statistik",
    text: "Wir zählen anonymisiert, welche Seiten besucht werden – mit eigener Technik auf unseren Servern, ohne Cookies von Drittanbietern und ohne Speicherung Ihrer IP-Adresse. So verbessern wir unsere Website.",
  },
  {
    id: "marketing",
    title: "Marketing",
    text: "Wir merken uns, über welche Kampagne oder Website Sie zu uns gefunden haben (z. B. Anzeige, Social Media), und ordnen dies Ihrer Anfrage zu. Das hilft uns, unsere Werbung gezielt zu planen.",
  },
];

function read(): ConsentState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ConsentState;
    if (s.v !== CONSENT_VERSION || Date.now() - s.ts > MAX_AGE_MS) return null;
    return s;
  } catch {
    return null;
  }
}

let cache: ConsentState | null | undefined;
let cacheRaw: string | null | undefined;

function snapshot(): ConsentState | null {
  if (cacheRaw === "__memory__") return cache ?? null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* Speicher blockiert */
  }
  if (raw !== cacheRaw || cache === undefined) {
    cacheRaw = raw;
    cache = read();
  }
  return cache;
}

function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** undefined = Server/unbekannt, null = noch keine Entscheidung */
export function useConsentState(): ConsentState | null | undefined {
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}

export function useConsent(category: ConsentCategory): boolean {
  const s = useConsentState();
  return !!s && s[category];
}

export function hasConsent(category: ConsentCategory): boolean {
  if (typeof window === "undefined") return false;
  const s = snapshot();
  return !!s && s[category];
}

export function saveConsent(choice: Omit<ConsentState, "v" | "ts">) {
  const state: ConsentState = { v: CONSENT_VERSION, ts: Date.now(), ...choice };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    cache = state;
    cacheRaw = "__memory__";
  }
  // Widerruf: zugehörige Daten im Browser sofort entfernen
  try {
    if (!choice.statistik) window.localStorage.removeItem("qd-vid");
    if (!choice.marketing) window.sessionStorage.removeItem("qd-attribution");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenConsent(cb: () => void) {
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
}

/* ---------------- Kampagnen-Zuordnung (nur mit Marketing-Einwilligung) ---------------- */

export type Attribution = { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_term?: string; utm_content?: string; referrer?: string; landing?: string };

export function captureAttribution() {
  if (!hasConsent("marketing")) return;
  try {
    if (window.sessionStorage.getItem("qd-attribution")) return;
    const url = new URL(window.location.href);
    const a: Attribution = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
      const v = url.searchParams.get(k);
      if (v) a[k] = v.slice(0, 120);
    }
    if (document.referrer) {
      const host = new URL(document.referrer).host;
      if (host !== window.location.host) a.referrer = host.slice(0, 120);
    }
    a.landing = url.pathname.slice(0, 200);
    window.sessionStorage.setItem("qd-attribution", JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

export function readAttribution(): Attribution | null {
  if (!hasConsent("marketing")) return null;
  try {
    const raw = window.sessionStorage.getItem("qd-attribution");
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}
