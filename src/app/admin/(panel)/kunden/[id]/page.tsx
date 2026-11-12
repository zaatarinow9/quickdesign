import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown, FileText, Inbox, Mail, Phone, Receipt, ShieldCheck, Trash2 } from "lucide-react";
import { hasFullAccess, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { displayStatus, formatDateDE, formatDateTime, formatEuro, kindLabels, statusLabels, todayBerlin, type DocumentKind } from "@/lib/documents/format";
import { deleteCustomer, marketingAction } from "@/app/admin/customer-actions";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { ConfirmSubmit } from "@/components/admin/documents/panels";
import { Badge, Card, PageHeader, Stat, statusTone } from "@/components/admin/ui";

export const metadata = { title: "Kunde" };

const mkt: Record<string, { label: string; text: string }> = {
  keine: { label: "Keine Einwilligung", text: "Keine Werbe-E-Mails erlaubt." },
  ausstehend: { label: "Bestätigung ausstehend", text: "Double-Opt-in-E-Mail wurde gesendet – noch nicht bestätigt." },
  bestaetigt: { label: "Einwilligung bestätigt", text: "Werbe-E-Mails erlaubt (Nachweis im Verlauf)." },
  abgemeldet: { label: "Abgemeldet", text: "Einwilligung widerrufen – keine Werbung senden." },
};
const actionLabel: Record<string, string> = {
  angefragt: "Einwilligung erteilt (Formular)",
  bestaetigt: "Per Double-Opt-in bestätigt",
  widerrufen: "Widerrufen",
  manuell_erfasst: "Manuell mit Nachweis erfasst",
  manuell_entfernt: "Manuell entfernt",
};

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const client = db();
  const [{ data: c }, { data: docs }, { data: inquiries }, { data: consents }] = await Promise.all([
    client.from("customers").select("*").eq("id", id).maybeSingle(),
    client.from("documents").select("id, kind, number, status, title, gross_total, paid_amount, doc_date, valid_until, due_date").eq("customer_id", id).order("created_at", { ascending: false }).limit(100),
    client.from("inquiries").select("id, reference, status, message, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    client.from("consent_events").select("id, action, source, text_version, created_at, actor").eq("customer_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  if (!c) notFound();
  const today = todayBerlin();
  const invoices = (docs ?? []).filter((d) => d.kind === "rechnung" && d.number && d.status !== "storniert");
  const revenue = invoices.reduce((s, d) => s + Number(d.gross_total), 0);
  const open = invoices.filter((d) => d.status === "offen" || d.status === "teilbezahlt").reduce((s, d) => s + Number(d.gross_total) - Number(d.paid_amount), 0);
  const offers = (docs ?? []).filter((d) => d.kind === "angebot");
  const accepted = offers.filter((d) => d.status === "angenommen").length;
  const m = mkt[c.marketing_status] ?? mkt.keine;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/admin/kunden" className="inline-flex items-center gap-1.5 hover:text-accent">
            <ArrowLeft className="size-4" aria-hidden /> Kunden
          </Link>
        }
        title={c.company_name || c.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{c.customer_number}</span>
            <Badge tone={statusTone[c.status]}>{c.status === "lead" ? "Interessent" : c.status === "kunde" ? "Kunde" : "Inaktiv"}</Badge>
            {(c.tags ?? []).map((t: string) => (
              <Link key={t} href={`/admin/kunden?tag=${encodeURIComponent(t)}`}>
                <Badge>#{t}</Badge>
              </Link>
            ))}
          </span>
        }
        actions={
          <>
            {c.email ? (
              <a href={`mailto:${c.email}`} className="adm-btn adm-btn-ghost">
                <Mail className="size-4" aria-hidden /> E-Mail
              </a>
            ) : null}
            {c.phone ? (
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="adm-btn adm-btn-ghost">
                <Phone className="size-4" aria-hidden /> Anrufen
              </a>
            ) : null}
            <Link href={`/admin/rechnungen/neu?kunde=${c.id}`} className="adm-btn adm-btn-ghost">
              <Receipt className="size-4" aria-hidden /> Rechnung
            </Link>
            <Link href={`/admin/angebote/neu?kunde=${c.id}`} className="adm-btn adm-btn-primary">
              <FileText className="size-4" aria-hidden /> Angebot erstellen
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Umsatz gesamt" value={formatEuro(revenue)} hint={`${invoices.length} Rechnungen`} tone="accent" />
        <Stat label="Offen" value={formatEuro(open)} tone={open > 0 ? "amber" : "green"} />
        <Stat label="Angebote" value={offers.length} hint={`${accepted} angenommen`} />
        <Stat label="Kunde seit" value={formatDateDE(c.created_at)} hint={`Quelle: ${c.source}`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Angebote & Rechnungen" padded={false}>
            {docs?.length ? (
              <table className="adm-table">
                <tbody>
                  {docs.map((d) => {
                    const ds = displayStatus(d as never, today);
                    const k = d.kind as DocumentKind;
                    return (
                      <tr key={d.id}>
                        <td className="whitespace-nowrap">
                          <Link href={`/admin/${kindLabels[k].path}/${d.id}`} className="font-medium hover:text-accent">
                            {kindLabels[k].one} {d.number ?? "(Entwurf)"}
                          </Link>
                        </td>
                        <td className="hidden max-w-[16rem] truncate text-stone-dark md:table-cell">{d.title}</td>
                        <td className="text-stone-dark">{formatDateDE(d.doc_date)}</td>
                        <td>
                          <Badge tone={statusTone[ds]}>{statusLabels[ds]}</Badge>
                        </td>
                        <td className="text-right font-semibold tabular-nums">{formatEuro(d.gross_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="p-5 text-sm text-stone-dark">Noch keine Dokumente.</p>
            )}
          </Card>
          <Card title="Stammdaten bearbeiten">
            <CustomerForm customer={c} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={<span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-accent" aria-hidden /> E-Mail-Werbung</span>}>
            <Badge tone={statusTone[c.marketing_status]}>{m.label}</Badge>
            <p className="mt-2 text-sm text-stone-dark">{m.text}</p>
            {c.email ? (
              <div className="mt-4 space-y-2">
                {c.marketing_status !== "bestaetigt" ? (
                  <form action={marketingAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="action" value="doi" />
                    <button className="adm-btn adm-btn-ghost adm-btn-sm w-full">Bestätigungs-E-Mail (Double-Opt-in) senden</button>
                  </form>
                ) : (
                  <form action={marketingAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="action" value="revoke" />
                    <ConfirmSubmit className="adm-btn adm-btn-danger adm-btn-sm w-full" message="Einwilligung als widerrufen markieren?">
                      Als abgemeldet markieren
                    </ConfirmSubmit>
                  </form>
                )}
                {c.marketing_status !== "bestaetigt" ? (
                  <details className="rounded-lg bg-ink/[0.03] p-3 text-sm">
                    <summary className="cursor-pointer text-stone-dark">Schriftliche Einwilligung liegt vor?</summary>
                    <form action={marketingAction} className="mt-3 space-y-2">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="action" value="manual" />
                      <input name="proof" required maxLength={80} placeholder="Nachweis, z. B. „Formular vom 12.11.2026, Ordner A“" className="adm-input" />
                      <p className="text-xs text-stone-dark">Nur erfassen, wenn eine nachweisbare ausdrückliche Einwilligung vorliegt.</p>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm">Einwilligung erfassen</button>
                    </form>
                  </details>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs text-stone-dark">Keine E-Mail-Adresse hinterlegt.</p>
            )}
            {consents?.length ? (
              <ol className="mt-5 space-y-2 border-t border-ink/[0.06] pt-4">
                {consents.map((e) => (
                  <li key={e.id} className="text-xs">
                    <span className="font-medium">{actionLabel[e.action] ?? e.action}</span>
                    <span className="block text-stone-dark">
                      {formatDateTime(e.created_at)} · {e.source}
                      {e.text_version ? ` · Text v${e.text_version}` : ""}
                      {e.actor ? ` · ${e.actor}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </Card>

          <Card title={<span className="inline-flex items-center gap-2"><Inbox className="size-4" aria-hidden /> Anfragen</span>} padded={false}>
            {inquiries?.length ? (
              <ul className="divide-y divide-ink/[0.05]">
                {inquiries.map((q) => (
                  <li key={q.id}>
                    <Link href={`/admin/anfragen/${q.id}`} className="block px-5 py-3 hover:bg-ink/[0.02]">
                      <span className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{q.reference}</span>
                        <span className="text-xs text-stone">{formatDateDE(q.created_at)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-stone-dark">{q.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-stone-dark">Keine Anfragen.</p>
            )}
          </Card>

          {Object.keys(c.utm ?? {}).length ? (
            <Card title="Herkunft (Kampagne)">
              <dl className="space-y-1 text-sm">
                {Object.entries(c.utm as Record<string, string>).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-stone-dark">{k}</dt>
                    <dd className="truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          <Card title="Datenschutz (DSGVO)">
            <div className="space-y-2">
              <a href={`/admin/kunden/${c.id}/auskunft`} className="adm-btn adm-btn-ghost adm-btn-sm w-full">
                <FileDown className="size-4" aria-hidden /> Datenauskunft (Art. 15) herunterladen
              </a>
              {hasFullAccess(admin.role) ? (
                <form action={deleteCustomer}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmSubmit
                    className="adm-btn adm-btn-danger adm-btn-sm w-full"
                    message="Kunde endgültig löschen (Art. 17 DSGVO)? Anfragen und Einwilligungsnachweise werden gelöscht; Rechnungen bleiben wegen der gesetzlichen Aufbewahrungspflicht archiviert."
                  >
                    <Trash2 className="size-4" aria-hidden /> Kunde löschen
                  </ConfirmSubmit>
                </form>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
