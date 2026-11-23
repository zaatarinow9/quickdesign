"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/** Schließen: schwebend → zurück zur Liste darunter, sonst zum Ordner */
function useClose(back: string, modal: boolean) {
  const router = useRouter();
  return () => (modal ? router.back() : router.push(back));
}

/** Blättern mit den Pfeiltasten, Escape schließt */
export function ViewerKeys({ prev, next, back, modal = false }: { prev: string | null; next: string | null; back: string; modal?: boolean }) {
  const router = useRouter();
  const close = useClose(back, modal);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (document.querySelector('[role="alertdialog"]')) return;
      const go = (href: string) => (modal ? router.replace(href) : router.push(href));
      if (e.key === "ArrowLeft" && prev) go(prev);
      else if (e.key === "ArrowRight" && next) go(next);
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, close, modal, router]);
  return null;
}

export function ViewerClose({ back, modal = false }: { back: string; modal?: boolean }) {
  const close = useClose(back, modal);
  return (
    <button type="button" onClick={close} className="grid size-9 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white" aria-label="Schließen">
      <X className="size-5" />
    </button>
  );
}

/**
 * Schwebendes Fenster im iPhone-Stil: abgedunkelter Hintergrund, Klick außerhalb
 * (oder auf die freie Fläche um die Datei) schließt.
 */
export function ViewerShell({ back, modal = false, children }: { back: string; modal?: boolean; children: React.ReactNode }) {
  const close = useClose(back, modal);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div
      className="qd-fade-in fixed inset-0 z-[60] bg-black/70 p-0 backdrop-blur-md sm:p-4 lg:p-6"
      onMouseDown={(e) => {
        const t = e.target as HTMLElement;
        if (t === e.currentTarget || t.hasAttribute("data-viewer-backdrop")) close();
      }}
    >
      <div className="qd-pop-in mx-auto flex h-full max-w-[110rem] flex-col overflow-hidden bg-[#0f0f11] text-white shadow-2xl ring-1 ring-white/10 sm:rounded-3xl">{children}</div>
    </div>
  );
}
