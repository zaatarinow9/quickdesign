"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Search, UserPlus } from "lucide-react";
import { createMeasurement } from "@/app/admin/measure-actions";
import { useFeedback } from "@/components/admin/feedback";
import { DatePicker } from "@/components/admin/DatePicker";
import { cn } from "@/lib/utils";

type C = { id: string; label: string; sub: string; address: string };
const titles = ["Schaufenster", "Fassade", "Fahrzeug", "Innenraum", "Werbeschild", "Glasfront"];

export function NewMeasurementForm({ customers, preselect }: { customers: C[]; preselect?: string }) {
  const { toast } = useFeedback();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(customers.some((c) => c.id === preselect) ? preselect! : null);
  const [isNew, setIsNew] = useState(false);
  const [nc, setNc] = useState({ name: "", company: "", phone: "" });
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState(customers.find((c) => c.id === preselect)?.address ?? "");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date()));
  const [pending, start] = useTransition();
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? customers.filter((c) => `${c.label} ${c.sub}`.toLowerCase().includes(t)) : customers).slice(0, 8);
  }, [q, customers]);
  const chosen = customers.find((c) => c.id === picked);

  const submit = () =>
    start(async () => {
      if (!picked && !(isNew && nc.name.trim())) return toast("Bitte Kunden wählen oder neu anlegen.", { tone: "error" });
      const r = await createMeasurement({ customerId: isNew ? null : picked, newCustomer: isNew ? nc : null, title, address, date });
      if (r && "error" in r && r.error) toast(r.error, { tone: "error" });
    });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/[0.07]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">1 · Kunde</h2>
          <button type="button" onClick={() => (setIsNew((v) => !v), setPicked(null))} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
            <UserPlus className="size-4" aria-hidden /> {isNew ? "Vorhandenen wählen" : "Neuer Kunde"}
          </button>
        </div>
        {isNew ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <input autoFocus value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} placeholder="Name *" className="adm-input" />
            <input value={nc.company} onChange={(e) => setNc({ ...nc, company: e.target.value })} placeholder="Firma" className="adm-input" />
            <input value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} placeholder="Telefon" inputMode="tel" className="adm-input sm:col-span-2" />
          </div>
        ) : chosen ? (
          <button type="button" onClick={() => setPicked(null)} className="flex w-full items-center gap-3 rounded-2xl bg-accent/[0.06] p-3 text-left ring-1 ring-accent/30">
            <span className="grid size-9 place-items-center rounded-full bg-accent text-white">
              <Check className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{chosen.label}</span>
              <span className="block truncate text-xs text-stone-dark">{chosen.sub}</span>
            </span>
            <span className="text-xs text-stone-dark">ändern</span>
          </button>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone" aria-hidden />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kunde suchen …" className="adm-input pl-9" />
            </div>
            <ul className="mt-2 divide-y divide-ink/[0.05]">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(c.id);
                      if (!address) setAddress(c.address);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-ink/[0.03]"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-ink/[0.06] text-xs font-semibold">{c.label.slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.label}</span>
                      <span className="block truncate text-xs text-stone-dark">{c.sub}</span>
                    </span>
                  </button>
                </li>
              ))}
              {!list.length ? <li className="px-2 py-3 text-sm text-stone-dark">Kein Treffer – oben „Neuer Kunde“ wählen.</li> : null}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/[0.07]">
        <h2 className="font-semibold">2 · Worum geht es?</h2>
        <div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Schaufenster Hauptstraße" className="adm-input" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {titles.map((t) => (
              <button key={t} type="button" onClick={() => setTitle(t)} className={cn("h-7 rounded-full px-2.5 text-xs", title === t ? "bg-ink text-white" : "bg-ink/[0.05] hover:bg-ink/[0.1]")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse vor Ort" className="adm-input" />
          <DatePicker value={date} onChange={(v) => v && setDate(v)} className="sm:w-56" />
        </div>
      </section>

      <button type="button" disabled={pending} onClick={submit} className="adm-btn adm-btn-primary h-12 w-full text-base">
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null} Aufmaß starten
      </button>
    </div>
  );
}
