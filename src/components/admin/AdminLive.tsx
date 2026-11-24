"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/** Welche Tabellen betreffen welche Seite – andere Änderungen lösen hier kein Neuladen aus */
const RELEVANT: [string, string[]][] = [
  ["/admin/dateien", ["files", "file_folders"]],
  ["/admin/aufgaben", ["tasks", "task_checklist", "task_comments"]],
  ["/admin/termine", ["appointments", "projects"]],
  ["/admin/projekte", ["projects", "files", "appointments"]],
  ["/admin/anfragen", ["inquiries"]],
  ["/admin/kunden", ["customers", "customer_categories", "files", "file_folders", "tasks", "time_entries", "appointments", "documents", "projects", "measurements"]],
  ["/admin/angebote", ["documents"]],
  ["/admin/rechnungen", ["documents"]],
  ["/admin/shop", ["shop_orders"]],
  ["/admin/aufmass", ["measurements", "measurement_items"]],
  ["/admin/zeiten", ["time_entries"]],
];
const MIN_GAP = 4000;

/**
 * Live-Aktualisierung: Die Datenbank meldet geänderte Tabellen (ohne Inhalte).
 * Neu geladen wird nur, wenn die Änderung die offene Seite betrifft – höchstens alle 4 Sekunden
 * und nie, während jemand gerade tippt (dann sofort nach dem Verlassen des Feldes).
 */
export function AdminLive({ url, anonKey }: { url: string; anonKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const last = useRef(0);

  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!url || !anonKey) return;
    const supabase = createBrowserClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    };
    const run = () => {
      timer.current = null;
      if (document.visibilityState !== "visible" || typing()) {
        pending.current = true;
        return;
      }
      pending.current = false;
      last.current = Date.now();
      router.refresh();
    };
    const schedule = () => {
      if (timer.current) return;
      const wait = Math.max(600, MIN_GAP - (Date.now() - last.current));
      timer.current = setTimeout(run, wait);
    };
    const onChange = (msg: { payload?: { t?: string } }) => {
      const table = msg.payload?.t;
      const rule = RELEVANT.find(([prefix]) => path.current === prefix || path.current.startsWith(`${prefix}/`));
      if (rule && table && !rule[1].includes(table)) return;
      schedule();
    };
    const channel = supabase.channel("qd-admin-live").on("broadcast", { event: "changed" }, onChange).subscribe();
    const resume = () => {
      if (pending.current && document.visibilityState === "visible" && !typing()) schedule();
    };
    const onBlur = () => setTimeout(resume, 50);
    document.addEventListener("visibilitychange", resume);
    document.addEventListener("focusout", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      document.removeEventListener("focusout", onBlur);
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [url, anonKey, router]);

  return null;
}
