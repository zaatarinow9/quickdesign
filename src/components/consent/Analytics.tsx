"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution, useConsentState } from "@/lib/consent";

/** Cookielose, eigene Reichweitenmessung – läuft ausschließlich nach Einwilligung „Statistik“. */
export default function Analytics() {
  const pathname = usePathname();
  const consent = useConsentState();

  useEffect(() => {
    if (consent?.marketing) captureAttribution();
  }, [consent?.marketing]);

  useEffect(() => {
    if (!consent?.statistik || !pathname || pathname.startsWith("/dokument")) return;
    let vid: string | null = null;
    try {
      vid = window.localStorage.getItem("qd-vid");
      if (!vid) {
        vid = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
        window.localStorage.setItem("qd-vid", vid);
      }
    } catch {
      /* ohne Wiedererkennung zählen */
    }
    const url = new URL(window.location.href);
    let ref: string | null = null;
    try {
      ref = document.referrer ? new URL(document.referrer).host : null;
      if (ref === window.location.host) ref = null;
    } catch {
      ref = null;
    }
    const w = window.innerWidth;
    const body = JSON.stringify({
      path: pathname,
      vid,
      ref,
      utm_source: url.searchParams.get("utm_source"),
      utm_medium: url.searchParams.get("utm_medium"),
      utm_campaign: url.searchParams.get("utm_campaign"),
      device: w < 768 ? "mobil" : w < 1100 ? "tablet" : "desktop",
    });
    fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [pathname, consent?.statistik]);

  return null;
}
