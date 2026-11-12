import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, Copy, Download, ExternalLink, FileCheck2, Lock, Receipt, Trash2, XCircle } from "lucide-react";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings/server";
import { customerOptions, documentEvents, getDocument, listCatalog, relatedDocuments } from "@/lib/documents/queries";
import { displayStatus, formatDateDE, formatDateTime, formatEuro, kindLabels, statusLabels, todayBerlin, type DocumentKind } from "@/lib/documents/format";
import { cancelInvoice, convertToInvoice, deleteDocument, duplicateDocument, finalizeInvoice, setDocumentStatus, setSharing } from "@/app/admin/document-actions";
import { DocumentEditor } from "./DocumentEditor";
import { ConfirmSubmit, CopyLink, PaymentForm, SendPanel } from "./panels";
import { Badge, Card, Notice, PageHeader, statusTone } from "@/components/admin/ui";

const eventLabels: Record<string, string> = {
  erstellt: "Erstellt",
  bearbeitet: "Bearbeitet",
  gesendet: "Per E-Mail gesendet",
  angesehen: "Vom Kunden geöffnet",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  status: "Status geändert",
  festgeschrieben: "Festgeschrieben",
  zahlung: "Zahlung erfasst",
  storniert: "Storniert",
  rechnung: "In Rechnung umgewandelt",
  link: "Kunden-Link",
};

export async function DocumentDetailPage({ kind, id, isNew }: { kind: DocumentKind; id: string; isNew?: boolean }) {
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const doc = await getDocument(id);
  if (!doc || doc.kind !== kind) notFound();
  const [catalog, customers, events, related, settings] = await Promise.all([listCatalog(), customerOptions(), documentEvents(id), relatedDocuments(id), getSettings()]);
  const label = kindLabels[kind];
  const today = todayBerlin();
  const ds = displayStatus(doc, today);
  const shareUrl = `${env.siteUrl}/dokument/${doc.share_token}`;
  const finalized = kind === "rechnung" && !!doc.number;
  const open = Math.max(0, Math.round((doc.gross_total - doc.paid_amount) * 100) / 100);
  const locked =
    kind === "rechnung" && doc.number
      ? "Diese Rechnung ist festgeschrieben und kann nicht mehr geändert werden (GoBD). Für Korrekturen bitte stornieren und eine neue Rechnung erstellen."
      : kind === "angebot" && doc.accepted_at
        ? "Dieses Angebot wurde angenommen und ist schreibgeschützt. Über „Duplizieren“ können Sie eine neue Version erstellen."
        : null;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/admin/${label.path}`} className="inline-flex items-center gap-1.5 hover:text-accent">
            <ArrowLeft className="size-4" aria-hidden /> {label.many}
          </Link>
        }
        title={`${label.one} ${doc.number ?? "(Entwurf)"}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[ds]}>{statusLabels[ds]}</Badge>
            <span>
              {doc.company_name || doc.customer_name} · {formatEuro(doc.gross_total)}
            </span>
            {doc.customer_id ? (
              <Link href={`/admin/kunden/${doc.customer_id}`} className="text-accent hover:underline">
                Kundenakte
              </Link>
            ) : null}
          </span>
        }
        actions={
          <>
            <a href={`/admin/${label.path}/${doc.id}/pdf`} target="_blank" rel="noopener" className="adm-btn adm-btn-ghost">
              <Download className="size-4" aria-hidden /> PDF
            </a>
            <form action={duplicateDocument}>
              <input type="hidden" name="id" value={doc.id} />
              <button className="adm-btn adm-btn-ghost" type="submit">
                <Copy className="size-4" aria-hidden /> Duplizieren
              </button>
            </form>
            {kind === "angebot" ? (
              <form action={convertToInvoice}>
                <input type="hidden" name="id" value={doc.id} />
                <button className="adm-btn adm-btn-primary" type="submit">
                  <Receipt className="size-4" aria-hidden /> In Rechnung umwandeln
                </button>
              </form>
            ) : !finalized ? (
              <form action={finalizeInvoice}>
                <input type="hidden" name="id" value={doc.id} />
                <ConfirmSubmit className="adm-btn adm-btn-primary" message="Rechnung jetzt festschreiben? Danach erhält sie eine endgültige Nummer und kann nicht mehr geändert werden.">
                  <Lock className="size-4" aria-hidden /> Festschreiben
                </ConfirmSubmit>
              </form>
            ) : null}
          </>
        }
      />

      {isNew ? (
        <div className="mb-6">
          <Notice tone="success">
            {label.one} wurde angelegt{doc.number ? ` (${doc.number})` : ""}. Sie können es jetzt als PDF herunterladen oder direkt per E-Mail senden.
          </Notice>
        </div>
      ) : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="Versenden">
          <SendPanel id={doc.id} defaultTo={doc.email ?? ""} kind={kind} finalized={finalized} />
          {doc.last_sent_at ? (
            <p className="mt-3 text-xs text-stone-dark">
              Zuletzt gesendet am {formatDateTime(doc.last_sent_at)} an {doc.last_sent_to} ({doc.send_count}×)
            </p>
          ) : null}
        </Card>

        <Card title={kind === "angebot" ? "Online-Angebot & Status" : "Zahlung & Status"}>
          {kind === "angebot" ? (
            <div className="space-y-4">
              {doc.accepted_at ? (
                <Notice tone="success">
                  <strong>Angenommen</strong> am {formatDateTime(doc.accepted_at)} von {doc.accepted_name}.
                </Notice>
              ) : doc.declined_at ? (
                <Notice tone="error">
                  <strong>Abgelehnt</strong> am {formatDateTime(doc.declined_at)}
                  {doc.decline_reason ? ` – „${doc.decline_reason}“` : ""}
                </Notice>
              ) : null}
              <div>
                <p className="adm-label">Link für den Kunden (ansehen, PDF, online annehmen)</p>
                {doc.share_enabled ? <CopyLink url={shareUrl} /> : <p className="text-sm text-stone-dark">Link ist deaktiviert.</p>}
                <p className="mt-2 text-xs text-stone-dark">
                  {doc.first_viewed_at ? `Geöffnet: ${doc.view_count}× · zuerst ${formatDateTime(doc.first_viewed_at)}` : "Noch nicht vom Kunden geöffnet."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {doc.share_enabled ? (
                    <a className="adm-btn adm-btn-ghost adm-btn-sm" href={shareUrl} target="_blank" rel="noopener">
                      <ExternalLink className="size-3.5" aria-hidden /> Ansehen
                    </a>
                  ) : null}
                  <form action={setSharing}>
                    <input type="hidden" name="id" value={doc.id} />
                    <input type="hidden" name="action" value={doc.share_enabled ? "disable" : "enable"} />
                    <button className="adm-btn adm-btn-ghost adm-btn-sm">{doc.share_enabled ? "Deaktivieren" : "Aktivieren"}</button>
                  </form>
                  <form action={setSharing}>
                    <input type="hidden" name="id" value={doc.id} />
                    <input type="hidden" name="action" value="renew" />
                    <button className="adm-btn adm-btn-ghost adm-btn-sm">Neuer Link</button>
                  </form>
                </div>
              </div>
              {!doc.accepted_at ? (
                <div className="flex flex-wrap gap-2 border-t border-ink/[0.06] pt-4">
                  {(["versendet", "angenommen", "abgelehnt"] as const)
                    .filter((st) => st !== doc.status)
                    .map((st) => (
                      <form key={st} action={setDocumentStatus}>
                        <input type="hidden" name="id" value={doc.id} />
                        <input type="hidden" name="status" value={st} />
                        <button className="adm-btn adm-btn-ghost adm-btn-sm">
                          {st === "angenommen" ? <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden /> : st === "abgelehnt" ? <XCircle className="size-3.5 text-red-600" aria-hidden /> : null}
                          Als „{statusLabels[st]}“ markieren
                        </button>
                      </form>
                    ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-stone-dark">Rechnungsbetrag</dt>
                  <dd className="font-semibold tabular-nums">{formatEuro(doc.gross_total)}</dd>
                </div>
                <div>
                  <dt className="text-stone-dark">Offen</dt>
                  <dd className={`font-semibold tabular-nums ${ds === "ueberfaellig" ? "text-red-700" : ""}`}>{formatEuro(open)}</dd>
                </div>
                <div>
                  <dt className="text-stone-dark">Fällig am</dt>
                  <dd>{formatDateDE(doc.due_date) || "–"}</dd>
                </div>
                <div>
                  <dt className="text-stone-dark">Bezahlt am</dt>
                  <dd>{doc.paid_at ? formatDateDE(doc.paid_at) : "–"}</dd>
                </div>
              </dl>
              {finalized && (doc.status === "offen" || doc.status === "teilbezahlt") ? <PaymentForm id={doc.id} open={open} /> : null}
              {!finalized ? <p className="text-sm text-stone-dark">Entwurf – nach dem Festschreiben bzw. Versand können Zahlungen erfasst werden.</p> : null}
              {finalized && doc.status !== "storniert" ? (
                <div className="flex flex-wrap gap-2 border-t border-ink/[0.06] pt-4">
                  {doc.share_enabled ? <CopyLink url={shareUrl} /> : null}
                  <form action={cancelInvoice}>
                    <input type="hidden" name="id" value={doc.id} />
                    <ConfirmSubmit className="adm-btn adm-btn-danger adm-btn-sm" message="Rechnung wirklich stornieren? Der Vorgang wird protokolliert.">
                      <Ban className="size-3.5" aria-hidden /> Stornieren
                    </ConfirmSubmit>
                  </form>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card title="Verlauf" padded={false}>
          <ol className="max-h-80 space-y-0 overflow-y-auto px-5 py-4">
            {related.map((r) => (
              <li key={r.id} className="mb-3 flex items-center gap-2 text-sm">
                <FileCheck2 className="size-4 text-emerald-600" aria-hidden />
                <Link href={`/admin/${kindLabels[r.kind as DocumentKind].path}/${r.id}`} className="text-accent hover:underline">
                  {kindLabels[r.kind as DocumentKind].one} {r.number ?? "(Entwurf)"}
                </Link>
              </li>
            ))}
            {events.map((e) => (
              <li key={e.id} className="relative border-l border-ink/10 pb-4 pl-4 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-ink/20 ring-2 ring-white" />
                <p className="text-sm font-medium">{eventLabels[e.type] ?? e.type}</p>
                {e.note ? <p className="text-xs text-stone-dark">{e.note}</p> : null}
                <p className="text-xs text-stone">
                  {formatDateTime(e.created_at)}
                  {e.actor ? ` · ${e.actor}` : ""}
                </p>
              </li>
            ))}
            {!events.length && !related.length ? <li className="text-sm text-stone-dark">Noch keine Ereignisse.</li> : null}
          </ol>
        </Card>
      </div>

      <DocumentEditor
        kind={kind}
        id={doc.id}
        initial={doc}
        catalog={catalog}
        customers={customers}
        smallBusiness={settings.tax.smallBusiness}
        defaultVat={settings.tax.defaultVatRate}
        locked={locked}
      />

      {!(kind === "rechnung" && doc.number) ? (
        <div className="mt-2 flex justify-end">
          <form action={deleteDocument}>
            <input type="hidden" name="id" value={doc.id} />
            <ConfirmSubmit className="adm-btn adm-btn-danger adm-btn-sm" message={`${label.one} endgültig löschen?`}>
              <Trash2 className="size-3.5" aria-hidden /> {label.one} löschen
            </ConfirmSubmit>
          </form>
        </div>
      ) : null}
    </>
  );
}
