import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listEntries } from "@/lib/time/server";
import { customerOptionsForFolders } from "@/lib/files/server";
import { elapsedSeconds, hoursLabel } from "@/lib/time/shared";
import { TimeEntries } from "@/components/admin/time/TimeEntries";
import { PageHeader } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Zeiterfassung" };

function sinceFor(range: string) {
  const now = new Date();
  if (range === "alle") return undefined;
  if (range === "woche") return new Date(now.getTime() - 7 * 864e5).toISOString();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default async function TimesPage({ searchParams }: { searchParams: Promise<{ zeitraum?: string; kunde?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const range = sp.zeitraum === "woche" || sp.zeitraum === "alle" ? sp.zeitraum : "monat";
  const since = sinceFor(range);
  const customerId = sp.kunde && /^[0-9a-f-]{36}$/.test(sp.kunde) ? sp.kunde : undefined;
  const [entries, customers] = await Promise.all([listEntries({ since, customerId, limit: 1000 }), customerOptionsForFolders()]);
  // Summe je Kunde
  const per = new Map<string, { id: string | null; label: string; secs: number }>();
  for (const e of entries.filter((x) => x.ended_at)) {
    const k = e.customer_id ?? "–";
    const label = e.customer ? e.customer.company_name || e.customer.name : "Ohne Kunde";
    const cur = per.get(k) ?? { id: e.customer_id, label, secs: 0 };
    cur.secs += elapsedSeconds(e);
    per.set(k, cur);
  }
  const ranking = [...per.values()].sort((a, b) => b.secs - a.secs);
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ zeitraum: range === "monat" ? undefined : range, kunde: customerId, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/zeiten${p.size ? `?${p}` : ""}`;
  };
  return (
    <>
      <PageHeader title="Zeiterfassung" description="Stoppuhr mit Pausen – jede Zeit wird beim Kunden gespeichert und erscheint in seiner Akte." />
      <div className="mb-5 flex flex-wrap gap-1 rounded-2xl bg-ink/[0.05] p-1 sm:w-max">
        {(
          [
            ["woche", "7 Tage"],
            ["monat", "Dieser Monat"],
            ["alle", "Alle"],
          ] as const
        ).map(([k, l]) => (
          <Link key={k} href={href({ zeitraum: k === "monat" ? undefined : k })} className={cn("h-8 rounded-xl px-3 text-sm leading-8", range === k ? "bg-white font-semibold shadow-sm" : "text-stone-dark")}>
            {l}
          </Link>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <TimeEntries entries={entries} customers={customers} customerId={customerId} />
        <aside className="h-max rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]">
          <p className="mb-2 text-sm font-semibold">Nach Kunden</p>
          <ul className="space-y-1">
            {ranking.map((r) => (
              <li key={r.id ?? "ohne"}>
                <Link href={r.id ? href({ kunde: customerId === r.id ? undefined : r.id }) : "#"} className={cn("flex items-center justify-between rounded-xl px-2.5 py-2 text-sm hover:bg-ink/[0.04]", customerId === r.id && "bg-accent/10 font-semibold text-accent")}>
                  <span className="truncate">{r.label}</span>
                  <span className="tabular-nums">{hoursLabel(r.secs)}</span>
                </Link>
              </li>
            ))}
            {!ranking.length ? <li className="px-2.5 py-2 text-sm text-stone-dark">Keine Einträge im Zeitraum.</li> : null}
          </ul>
        </aside>
      </div>
    </>
  );
}
