import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Eye, FileText, Inbox, Megaphone, Receipt, TrendingUp, Users, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { overviewStats } from "@/lib/admin/stats";
import { formatDateDE, formatDateTime, formatEuro } from "@/lib/documents/format";
import { BarChart, RankList } from "@/components/admin/charts";
import { Badge, Card, EmptyState, Notice, PageHeader, Stat } from "@/components/admin/ui";

export const metadata = { title: "Übersicht" };

const eur0 = (v: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

function greeting() {
  const h = Number(new Intl.DateTimeFormat("de-DE", { hour: "numeric", hour12: false, timeZone: "Europe/Berlin" }).format(new Date()));
  return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const s = await overviewStats();
  const trend = s.revenuePrevMonth > 0 ? Math.round(((s.revenueMonth - s.revenuePrevMonth) / s.revenuePrevMonth) * 100) : null;
  const firstName = (admin.name ?? "").split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("de-DE", { dateStyle: "full", timeZone: "Europe/Berlin" }).format(new Date())}
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="Ihr Geschäft auf einen Blick – Umsatz, offene Posten, Angebote und neue Anfragen."
        actions={
          <>
            <Link href="/admin/rechnungen/neu" className="adm-btn adm-btn-ghost">
              <Receipt className="size-4" aria-hidden /> Neue Rechnung
            </Link>
            <Link href="/admin/angebote/neu" className="adm-btn adm-btn-primary">
              <FileText className="size-4" aria-hidden /> Neues Angebot
            </Link>
          </>
        }
      />

      {sp["kein-zugriff"] ? (
        <div className="mb-6">
          <Notice tone="warn">Für diesen Bereich fehlt Ihnen die Berechtigung.</Notice>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Umsatz diesen Monat"
          value={eur0(s.revenueMonth)}
          hint={trend === null ? `Jahr: ${eur0(s.revenueYear)}` : `${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)} % ggü. Vormonat · Jahr: ${eur0(s.revenueYear)}`}
          icon={TrendingUp}
          tone="accent"
          href="/admin/rechnungen"
        />
        <Stat label="Offene Rechnungen" value={eur0(s.openInvoicesSum)} hint={`${s.openInvoices.length} Rechnungen · ${s.overdue.length} überfällig`} icon={Wallet} tone={s.overdue.length ? "red" : "cyan"} href="/admin/rechnungen?status=offen" />
        <Stat label="Offene Angebote" value={eur0(s.openOffersSum)} hint={`${s.openOffers.length} versendet · Annahmequote ${s.acceptanceRate ?? "–"} %`} icon={FileText} tone="amber" href="/admin/angebote?status=versendet" />
        <Stat label="Anfragen diesen Monat" value={s.inquiriesMonth} hint={`${s.newInquiries.length} unbearbeitet`} icon={Inbox} tone="green" href="/admin/anfragen" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Kunden gesamt" value={s.customers} hint={`+${s.customersMonth} diesen Monat`} icon={Users} href="/admin/kunden" />
        <Stat label="Marketing-Kontakte (bestätigt)" value={s.marketingContacts} hint="Double-Opt-in, rechtssicher" icon={Megaphone} href="/admin/marketing" />
        <Stat label="Website-Besucher (30 Tage)" value={s.visitors} hint={`${s.pageViews} Seitenaufrufe · nur mit Einwilligung`} icon={Eye} href="/admin/statistik" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Rechnungsumsatz (brutto) – letzte 12 Monate" action={<span className="text-xs text-stone-dark">Jahr {s.today.slice(0, 4)}: {formatEuro(s.revenueYear)}</span>}>
          <BarChart
            caption="Rechnungsumsatz brutto je Monat"
            format={formatEuro}
            data={s.series.map((p) => ({ label: p.label, value: Math.round(p.invoiced * 100) / 100, sub: `Zahlungseingang: ${formatEuro(p.paid)}` }))}
          />
        </Card>
        <Card title="Neue Anfragen" action={<Link href="/admin/anfragen" className="text-xs text-stone-dark hover:text-accent">Alle</Link>} padded={false}>
          {s.newInquiries.length ? (
            <ul className="divide-y divide-ink/[0.05]">
              {s.newInquiries.map((q) => (
                <li key={q.id}>
                  <Link href={`/admin/anfragen/${q.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink/[0.02]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">{q.name.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{q.company_name || q.name}</span>
                      <span className="block truncate text-xs text-stone-dark">{(q.interests ?? []).join(", ") || q.reference}</span>
                    </span>
                    <span className="text-xs text-stone">{formatDateTime(q.created_at).split(",")[0]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Inbox} title="Alles erledigt" text="Keine unbearbeiteten Anfragen." />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Überfällige & offene Rechnungen" padded={false} action={s.overdue.length ? <Badge tone="red"><AlertTriangle className="size-3" aria-hidden /> {formatEuro(s.overdueSum)} überfällig</Badge> : null}>
          {s.openInvoices.length ? (
            <ul className="divide-y divide-ink/[0.05]">
              {s.openInvoices.slice(0, 6).map((r) => {
                const late = r.due_date && r.due_date < s.today;
                return (
                  <li key={r.id}>
                    <Link href={`/admin/rechnungen/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink/[0.02]">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{r.company_name || r.customer_name}</span>
                        <span className={`block text-xs ${late ? "text-red-700" : "text-stone-dark"}`}>
                          {r.number} · fällig {formatDateDE(r.due_date)}
                        </span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{formatEuro(r.open)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={Wallet} title="Keine offenen Posten" />
          )}
        </Card>
        <Card title="Angebote in Entscheidung" padded={false}>
          {s.openOffers.length ? (
            <ul className="divide-y divide-ink/[0.05]">
              {s.openOffers.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/angebote/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink/[0.02]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{o.company_name || o.customer_name}</span>
                      <span className="block text-xs text-stone-dark">
                        {o.number} · {o.expired ? <span className="text-amber-700">abgelaufen</span> : o.first_viewed_at ? `${o.view_count}× angesehen` : "noch nicht geöffnet"}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatEuro(o.gross_total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileText} title="Keine offenen Angebote" />
          )}
        </Card>
        <Card title="Top-Kunden (Umsatz dieses Jahr)">
          {s.topCustomers.length ? (
            <RankList format={eur0} rows={s.topCustomers.map((c) => ({ label: c.name, value: c.total, href: c.id ? `/admin/kunden/${c.id}` : undefined }))} />
          ) : (
            <p className="text-sm text-stone-dark">Noch keine Rechnungen in diesem Jahr.</p>
          )}
          {s.topServices.length ? (
            <div className="mt-6 border-t border-ink/[0.06] pt-5">
              <p className="mb-3 text-sm font-semibold">Meistgenutzte Leistungen</p>
              <RankList format={(v) => `${v}×`} rows={s.topServices.map((x) => ({ label: x.name, value: Number(x.usage_count) }))} />
            </div>
          ) : null}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Letzte Aktivitäten" padded={false} action={<Link href="/admin/protokoll" className="text-xs text-stone-dark hover:text-accent">Protokoll</Link>}>
          {s.activity.length ? (
            <ul className="divide-y divide-ink/[0.05]">
              {s.activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <ArrowUpRight className="size-4 shrink-0 text-stone" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{a.summary}</span>
                  <span className="hidden truncate text-xs text-stone-dark sm:block">{a.actor}</span>
                  <span className="shrink-0 text-xs text-stone">{formatDateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ArrowUpRight} title="Noch keine Aktivitäten" />
          )}
        </Card>
      </div>
    </>
  );
}
