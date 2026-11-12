import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { getDocumentByToken } from "@/lib/documents/queries";
import { computeTotals, displayStatus, formatDateDE, formatEuro, formatQty, kindLabels, lineNet, todayBerlin } from "@/lib/documents/format";
import { getSettings } from "@/lib/settings/server";
import { logDocumentEvent } from "@/lib/admin/log";
import OfferResponse from "@/components/documents/OfferResponse";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ihr Dokument", robots: { index: false, follow: false } };

export default async function PublicDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await getDocumentByToken(token);
  if (!doc) notFound();
  const settings = await getSettings();
  const label = kindLabels[doc.kind];
  const today = todayBerlin();
  const status = displayStatus(doc, today);
  const t = computeTotals(doc.items, doc.discount_percent, settings.tax.smallBusiness);

  // Aufrufe zählen (nicht für angemeldete Mitarbeiter)
  if (!(await getAdmin())) {
    const now = new Date().toISOString();
    await db()
      .from("documents")
      .update({ view_count: doc.view_count + 1, last_viewed_at: now, ...(doc.first_viewed_at ? {} : { first_viewed_at: now }) })
      .eq("id", doc.id);
    if (!doc.first_viewed_at) await logDocumentEvent(doc.id, "angesehen", "Erstmals online geöffnet", "Kunde");
  }

  const canRespond = doc.kind === "angebot" && !doc.accepted_at && doc.status !== "abgelehnt" && status !== "abgelaufen";

  return (
    <section className="bg-paper pb-24 pt-[calc(var(--header-h)+3rem)]">
      <div className="container-x">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow text-accent">
            {label.one} {doc.number}
          </p>
          <h1 className="display-md mt-4">{doc.title}</h1>
          <p className="mt-4 text-lg text-stone-dark">
            für {doc.company_name ? `${doc.company_name} · ` : ""}
            {doc.customer_name} · vom {formatDateDE(doc.doc_date)}
            {doc.kind === "angebot" && doc.valid_until ? ` · gültig bis ${formatDateDE(doc.valid_until)}` : ""}
            {doc.kind === "rechnung" && doc.due_date ? ` · fällig am ${formatDateDE(doc.due_date)}` : ""}
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
            <div className="overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-ink/10">
              {doc.intro ? <p className="whitespace-pre-line border-b border-ink/10 p-6 text-stone-dark sm:p-8">{doc.intro}</p> : null}
              <ul className="divide-y divide-ink/10">
                {doc.items.map((it, i) => (
                  <li key={i} className="flex gap-4 px-6 py-5 sm:px-8">
                    <span className="w-6 shrink-0 pt-0.5 text-sm text-stone">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{it.description}</p>
                      {it.details ? <p className="mt-1 whitespace-pre-line text-sm text-stone-dark">{it.details}</p> : null}
                      <p className="mt-1 text-sm text-stone">
                        {formatQty(it.quantity)} {it.unit} × {formatEuro(it.unit_price)}
                        {!settings.tax.smallBusiness ? ` · ${it.vat_rate} % USt.` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">{formatEuro(lineNet(it))}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5 border-t border-ink/10 bg-paper/50 px-6 py-5 text-sm sm:px-8">
                {t.discount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-stone-dark">Rabatt {formatQty(doc.discount_percent)} %</span>
                    <span>− {formatEuro(t.discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-stone-dark">Netto</span>
                  <span>{formatEuro(t.net)}</span>
                </div>
                {t.groups.map((g) =>
                  settings.tax.smallBusiness ? null : (
                    <div key={g.rate} className="flex justify-between">
                      <span className="text-stone-dark">USt. {g.rate} %</span>
                      <span>{formatEuro(g.vat)}</span>
                    </div>
                  ),
                )}
                <div className="flex items-baseline justify-between pt-2">
                  <span className="font-medium">Gesamtbetrag</span>
                  <span className="font-[family-name:var(--font-display)] text-3xl font-medium">{formatEuro(t.gross)}</span>
                </div>
              </div>
              {doc.notes || doc.payment_terms ? (
                <div className="grid gap-6 border-t border-ink/10 p-6 text-sm text-stone-dark sm:grid-cols-2 sm:p-8">
                  {doc.notes ? (
                    <div>
                      <p className="mb-1 font-medium text-ink">Hinweise</p>
                      <p className="whitespace-pre-line">{doc.notes}</p>
                    </div>
                  ) : null}
                  {doc.payment_terms ? (
                    <div>
                      <p className="mb-1 font-medium text-ink">Zahlungsbedingungen</p>
                      <p className="whitespace-pre-line">{doc.payment_terms}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
              <a href={`/dokument/${token}/pdf`} className="flex items-center gap-4 rounded-[1.25rem] bg-white p-5 ring-1 ring-ink/10 transition-colors hover:ring-ink/30">
                <span className="grid size-12 place-items-center rounded-xl bg-ink text-paper">
                  <FileText className="size-5" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{label.one} als PDF</span>
                  <span className="block text-sm text-stone-dark">Zum Speichern oder Drucken</span>
                </span>
                <Download className="size-5 text-stone" aria-hidden />
              </a>
              {doc.kind === "angebot" ? (
                doc.accepted_at ? (
                  <div className="rounded-[1.25rem] bg-emerald-50 p-6 text-emerald-900 ring-1 ring-emerald-200">
                    <p className="font-medium">Angebot angenommen</p>
                    <p className="mt-1 text-sm">
                      am {formatDateDE(doc.accepted_at)} von {doc.accepted_name}. Vielen Dank für Ihren Auftrag!
                    </p>
                  </div>
                ) : canRespond ? (
                  <OfferResponse token={token} gross={formatEuro(t.gross)} />
                ) : (
                  <div className="rounded-[1.25rem] bg-white p-6 ring-1 ring-ink/10">
                    <p className="font-medium">{status === "abgelaufen" ? "Dieses Angebot ist abgelaufen." : "Dieses Angebot ist nicht mehr aktiv."}</p>
                    <p className="mt-1 text-sm text-stone-dark">
                      Gerne erstellen wir Ihnen ein aktuelles Angebot: <a className="underline" href={`mailto:${settings.company.email}`}>{settings.company.email}</a>
                    </p>
                  </div>
                )
              ) : doc.status === "bezahlt" ? (
                <div className="rounded-[1.25rem] bg-emerald-50 p-6 text-emerald-900 ring-1 ring-emerald-200">
                  <p className="font-medium">Bezahlt – vielen Dank!</p>
                </div>
              ) : settings.bank.iban ? (
                <div className="rounded-[1.25rem] bg-white p-6 text-sm ring-1 ring-ink/10">
                  <p className="font-medium">Zahlung per Überweisung</p>
                  <dl className="mt-3 space-y-1.5 text-stone-dark">
                    <div>Empfänger: <span className="text-ink">{settings.bank.holder || settings.company.name}</span></div>
                    <div>IBAN: <span className="text-ink">{settings.bank.iban}</span></div>
                    {settings.bank.bic ? <div>BIC: <span className="text-ink">{settings.bank.bic}</span></div> : null}
                    <div>Verwendungszweck: <span className="text-ink">{doc.number}</span></div>
                    <div>Betrag: <span className="text-ink">{formatEuro(Math.max(0, t.gross - doc.paid_amount))}</span></div>
                  </dl>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
