"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Live-Aktualisierung: Die Datenbank sendet nach jeder Änderung (Dateien, Ordner, Aufträge,
 * Anfragen, Dokumente, Kunden, Shop-Bestellungen) ein kurzes Signal ohne Inhalte.
 * Die aktuelle Seite lädt dann ihre Daten neu – auch bei Änderungen von Kollegen oder aus der App.
 */
export function AdminLive({ url, anonKey }: { url: string; anonKey: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missed = useRef(false);

  useEffect(() => {
    if (!url || !anonKey) return;
    const supabase = createBrowserClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const refresh = () => {
      if (document.visibilityState !== "visible") {
        missed.current = true;
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 450);
    };
    const channel = supabase.channel("qd-admin-live").on("broadcast", { event: "changed" }, refresh).subscribe();
    const onVisible = () => {
      if (document.visibilityState === "visible" && missed.current) {
        missed.current = false;
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [url, anonKey, router]);

  return null;
}
