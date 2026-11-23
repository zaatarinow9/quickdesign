"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CheckCheck, FileText, FolderUp, Hammer, Inbox, ShoppingBag } from "lucide-react";
import { markNotificationsRead } from "@/app/admin/notify-actions";
import { Popover } from "./DatePicker";
import { cn } from "@/lib/utils";

type N = { id: number; category: string; title: string; body: string; href: string | null; at: string; unread: boolean };
const icon: Record<string, typeof Bell> = { anfrage: Inbox, shop: ShoppingBag, datei: FolderUp, projekt: Hammer, dokument: FileText };
function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));
}

/** Glocke: neue Aufgaben, Kommentare, Anfragen, Bestellungen, Dateien – ohne E-Mail */
export function NotificationBell({ items, unread }: { items: N[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<HTMLButtonElement | null>(null);
  const [read, setRead] = useState(false);
  const count = read ? 0 : unread;
  return (
    <>
      <button
        ref={setA}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread && !read) {
            setRead(true);
            void markNotificationsRead();
          }
        }}
        className="relative grid size-10 place-items-center rounded-xl text-paper/70 hover:bg-paper/10 hover:text-paper"
        aria-label={`Benachrichtigungen${count ? ` (${count} neu)` : ""}`}
      >
        <Bell className={cn("size-5", count && "animate-[wiggle_1s_ease-in-out_2]")} aria-hidden />
        {count ? <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.65rem] font-bold text-white ring-2 ring-ink">{count > 9 ? "9+" : count}</span> : null}
      </button>
      <Popover anchor={a} open={open} onClose={() => setOpen(false)} width={360}>
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <p className="font-semibold text-ink">Benachrichtigungen</p>
          <span className="inline-flex items-center gap-1 text-xs text-stone-dark">
            <CheckCheck className="size-3.5" aria-hidden /> gelesen
          </span>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto">
          {items.map((n) => {
            const Icon = icon[n.category] ?? Bell;
            const body = (
              <span className="flex gap-3 rounded-xl px-2.5 py-2.5 hover:bg-ink/[0.04]">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", n.unread ? "bg-accent text-white" : "bg-ink/[0.05] text-stone-dark")}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm text-ink", n.unread && "font-semibold")}>{n.title}</span>
                  {n.body ? <span className="block truncate text-xs text-stone-dark">{n.body}</span> : null}
                  <span className="block text-[0.7rem] text-stone">{ago(n.at)}</span>
                </span>
                {n.unread ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" /> : null}
              </span>
            );
            return <li key={n.id}>{n.href ? <Link href={n.href} onClick={() => setOpen(false)}>{body}</Link> : body}</li>;
          })}
          {!items.length ? <li className="px-3 py-8 text-center text-sm text-stone-dark">Noch keine Benachrichtigungen.</li> : null}
        </ul>
      </Popover>
    </>
  );
}
