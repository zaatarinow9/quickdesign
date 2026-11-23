"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Dünner Fortschrittsbalken oben beim Seitenwechsel (wie bei nativen Apps):
 * startet sofort beim Klick auf einen internen Link, endet, sobald die neue Seite da ist.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      setState("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    // neue Adresse ist da → Balken abschließen
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reagiert auf den abgeschlossenen Seitenwechsel
    setState((s) => (s === "loading" ? "done" : s));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 350);
  }, [pathname, search]);

  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px]" aria-hidden>
      <div
        className="h-full bg-gradient-to-r from-accent via-fuchsia-500 to-accent shadow-[0_0_10px_rgba(225,29,132,0.7)]"
        style={{
          width: state === "done" ? "100%" : "80%",
          opacity: state === "done" ? 0 : 1,
          transition: state === "done" ? "width 150ms ease-out, opacity 300ms 120ms" : "width 2.5s cubic-bezier(0.1, 0.7, 0.2, 1)",
          animation: state === "loading" ? "qd-progress 2.5s cubic-bezier(0.1, 0.7, 0.2, 1)" : undefined,
        }}
      />
    </div>
  );
}
