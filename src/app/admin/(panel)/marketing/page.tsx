import Link from "next/link";
import { CheckCircle2, Clock, Download, Megaphone, ShieldCheck, UserX } from "lucide-react";
import { hasFullAccess, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { isoDaysAgo } from "@/lib/admin/time";
import { formatDateDE } from "@/lib/documents/format";
import { RankList } from "@/components/admin/charts";
import { Card, EmptyState, PageHeader, Stat } from "@/components/admin/ui";

export const metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const admin = await requireAdmin();
  const client = db();
  const [{ data: all }, { data: confirmed }, { data: inquiries }] = await Promise.all([
    client.from("customers").select("marketing_status, source, utm, tags").limit(50000),
    client.from("customers").select("id, customer_number, name, company_name, email, tags, marketing_confirmed_at").eq("marketing_status", "bestaetigt").order("marketing_confirmed_at", { ascending: false }).limit(50),
    client.from("inquiries").select("utm, created_at").gte("created_at", isoDaysAgo(365)).limit(20000),
  ]);
  const counts = { keine: 0, ausstehend: 0, bestaetigt: 0, abgemeldet: 0 } as Record<string, number>;
  const sources = new Map<string, number>();
  for (const c of all ?? []) counts[c.marketing_status] = (counts[c.marketing_status] ?? 0) + 1;
  for (const q of inquiries ?? []) {
    const u = (q.utm ?? {}) as Record<string, string>;
    const key = u.utm_source || u.referrer || "Direkt / unbekannt";
    sources.set(key, (sources.get(key) ?? 0) + 1);
  }
  const total = all?.length ?? 0;

  return (
    <>
      <PageHeader
        title="Kontakte & Einwilligungen"
        description="Rechtssichere Werbekontakte: Nur Personen mit bestätigter Einwilligung (Double-Opt-in) erhalten Werbe-E-Mails. Jede Einwilligung und jeder Widerruf wird mit Zeitpunkt, Quelle und Text-Version protokolliert."
        actions={
          <>
            {hasFullAccess(admin.role) ? (
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- Datei-Download
              <a href="/admin/kunden/export?nur=werbung" className="adm-btn adm-btn-ghost">
                <Download className="size-4" aria-hidden /> Bestätigte Kontakte (CSV)
              </a>
            ) : null}
            <Link href="/admin/marketing/kampagnen" className="adm-btn adm-btn-primary">
              <Megaphone className="size-4" aria-hidden /> E-Mail-Kampagnen
            </Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Bestätigt (werbefähig)" value={counts.bestaetigt} hint={total ? `${Math.round((counts.bestaetigt / total) * 100)} % aller Kontakte` : undefined} icon={CheckCircle2} tone="green" />
        <Stat label="Bestätigung ausstehend" value={counts.ausstehend} hint="Double-Opt-in-E-Mail gesendet" icon={Clock} tone="amber" />
        <Stat label="Ohne Einwilligung" value={counts.keine} hint="Keine Werbung erlaubt" icon={ShieldCheck} />
        <Stat label="Abgemeldet" value={counts.abgemeldet} hint="Widerruf – dauerhaft gesperrt" icon={UserX} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Zuletzt bestätigte Kontakte" padded={false}>
          {confirmed?.length ? (
            <table className="adm-table">
              <tbody>
                {confirmed.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/kunden/${c.id}`} className="font-medium hover:text-accent">
                        {c.company_name || c.name}
                      </Link>
                      <span className="block text-xs text-stone-dark">{c.customer_number}</span>
                    </td>
                    <td className="hidden text-stone-dark sm:table-cell">{c.email}</td>
                    <td className="hidden text-xs text-stone-dark md:table-cell">{(c.tags ?? []).map((t: string) => `#${t}`).join(" ")}</td>
                    <td className="text-right text-stone-dark">{formatDateDE(c.marketing_confirmed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon={Megaphone} title="Noch keine bestätigten Kontakte" text="Besucher können der E-Mail-Werbung im Kontaktformular freiwillig zustimmen. Bestandskunden können Sie aus der Kundenakte eine Bestätigungs-E-Mail senden." />
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Woher kommen Anfragen? (12 Monate)">
            {sources.size ? (
              <RankList format={(v) => String(v)} rows={[...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }))} />
            ) : (
              <p className="text-sm text-stone-dark">Noch keine Daten. Tipp: Verwenden Sie in Anzeigen und Posts Links mit <code className="rounded bg-ink/5 px-1">?utm_source=instagram&amp;utm_campaign=…</code></p>
            )}
            <p className="mt-4 text-xs text-stone-dark">Die Herkunft wird nur erfasst, wenn Besucher der Kategorie „Marketing“ zugestimmt haben.</p>
          </Card>
          <Card title="So bleibt Ihr Marketing rechtssicher">
            <ul className="list-disc space-y-1.5 pl-4 text-sm text-stone-dark">
              <li>Werbe-E-Mails nur an „bestätigt“ (Double-Opt-in, § 7 UWG).</li>
              <li>Abmeldelink in jeder E-Mail – Abmeldungen werden sofort gesperrt.</li>
              <li>Statistik & Kampagnen-Zuordnung nur nach Cookie-Einwilligung (§ 25 TDDDG).</li>
              <li>Auskunft & Löschung je Kunde in der Kundenakte (Art. 15/17 DSGVO).</li>
              <li>Keine gekauften Adresslisten importieren.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
