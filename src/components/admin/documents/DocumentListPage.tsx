import Link from "next/link";
import { Eye, FilePlus2, FileText, Receipt } from "lucide-react";
import { db } from "@/lib/supabase/admin";
import { displayStatus, formatDateDE, formatEuro, kindLabels, statusLabels, todayBerlin, type DocumentKind } from "@/lib/documents/format";
import { listDocuments, PAGE_SIZE } from "@/lib/documents/queries";
import { Badge, Card, EmptyState, FilterTabs, PageHeader, Pagination, SearchForm, Stat, statusTone } from "@/components/admin/ui";

const n = (v: unknown) => Number(v ?? 0);

async function summary(kind: DocumentKind) {
  const { data } = await db().from("documents").select("status, gross_total, paid_amount, valid_until, due_date, number").eq("kind", kind).limit(10000);
  const today = todayBerlin();
  const s = { count: 0, entwurf: 0, open: 0, openSum: 0, done: 0, doneSum: 0, late: 0, lateSum: 0, byStatus: {} as Record<string, number> };
  for (const r of data ?? []) {
    s.count++;
    const ds = displayStatus({ kind, status: r.status, valid_until: r.valid_until, due_date: r.due_date }, today);
    s.byStatus[ds] = (s.byStatus[ds] ?? 0) + 1;
    if (r.status === "entwurf") s.entwurf++;
    if (kind === "angebot") {
      if (ds === "versendet") {
        s.open++;
        s.openSum += n(r.gross_total);
      } else if (ds === "angenommen") {
        s.done++;
        s.doneSum += n(r.gross_total);
      } else if (ds === "abgelaufen") {
        s.late++;
        s.lateSum += n(r.gross_total);
      }
    } else {
      const open = n(r.gross_total) - n(r.paid_amount);
      if (r.status === "offen" || r.status === "teilbezahlt") {
        s.open++;
        s.openSum += open;
        if (ds === "ueberfaellig") {
          s.late++;
          s.lateSum += open;
        }
      } else if (r.status === "bezahlt") {
        s.done++;
        s.doneSum += n(r.gross_total);
      }
    }
  }
  return s;
}

export async function DocumentListPage({ kind, searchParams }: { kind: DocumentKind; searchParams: Record<string, string | undefined> }) {
  const label = kindLabels[kind];
  const page = Math.max(1, Number(searchParams.seite) || 1);
  const status = searchParams.status;
  const q = searchParams.q?.slice(0, 80);
  const [{ rows, total }, s] = await Promise.all([listDocuments({ kind, status, q, page }), summary(kind)]);
  const today = todayBerlin();
  const base = `/admin/${label.path}`;
  const href = (extra: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q, ...extra })) if (v !== undefined && v !== "" && v !== null) p.set(k, String(v));
    const str = p.toString();
    return str ? `${base}?${str}` : base;
  };
  const statuses = kind === "angebot" ? ["entwurf", "versendet", "angenommen", "abgelehnt", "abgelaufen"] : ["entwurf", "offen", "ueberfaellig", "teilbezahlt", "bezahlt", "storniert"];
  const Icon = kind === "angebot" ? FileText : Receipt;

  return (
    <>
      <PageHeader
        title={label.many}
        description={kind === "angebot" ? "Angebote erstellen, als PDF versenden und online annehmen lassen." : "Rechnungen nach § 14 UStG – festschreiben, versenden, Zahlungen erfassen."}
        actions={
          <Link href={`${base}/neu`} className="adm-btn adm-btn-primary">
            <FilePlus2 className="size-4" aria-hidden /> {kind === "angebot" ? "Neues Angebot" : "Neue Rechnung"}
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {kind === "angebot" ? (
          <>
            <Stat label="Offen (versendet)" value={formatEuro(s.openSum)} hint={`${s.open} Angebote`} tone="cyan" />
            <Stat label="Angenommen" value={formatEuro(s.doneSum)} hint={`${s.done} Angebote`} tone="green" />
            <Stat label="Abgelaufen" value={formatEuro(s.lateSum)} hint={`${s.late} Angebote – nachfassen!`} tone="amber" />
          </>
        ) : (
          <>
            <Stat label="Offen" value={formatEuro(s.openSum)} hint={`${s.open} Rechnungen`} tone="cyan" />
            <Stat label="Überfällig" value={formatEuro(s.lateSum)} hint={`${s.late} Rechnungen`} tone="red" />
            <Stat label="Bezahlt" value={formatEuro(s.doneSum)} hint={`${s.done} Rechnungen`} tone="green" />
          </>
        )}
      </div>

      <Card className="mt-6" padded={false}>
        <div className="flex flex-col gap-3 border-b border-ink/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            active={status ?? "alle"}
            items={[
              { key: "alle", label: "Alle", href: href({ status: undefined, seite: undefined }), count: s.count },
              ...statuses.map((st) => ({ key: st, label: statusLabels[st as keyof typeof statusLabels], href: href({ status: st, seite: undefined }), count: s.byStatus[st] ?? 0 })),
            ]}
          />
          <SearchForm defaultValue={q} placeholder="Nummer, Kunde, Titel …" hidden={{ status }} />
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Nummer</th>
                  <th>Kunde</th>
                  <th className="hidden md:table-cell">Titel</th>
                  <th>Datum</th>
                  <th className="hidden sm:table-cell">{kind === "angebot" ? "Gültig bis" : "Fällig"}</th>
                  <th>Status</th>
                  <th className="text-right">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ds = displayStatus(r, today);
                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap font-medium">
                        <Link href={`${base}/${r.id}`} className="hover:text-accent">
                          {r.number ?? <span className="text-stone-dark">Entwurf</span>}
                        </Link>
                      </td>
                      <td className="max-w-[14rem]">
                        <Link href={`${base}/${r.id}`} className="block truncate hover:text-accent">
                          {r.company_name || r.customer_name}
                        </Link>
                        {r.company_name ? <span className="block truncate text-xs text-stone-dark">{r.customer_name}</span> : null}
                      </td>
                      <td className="hidden max-w-[16rem] truncate text-stone-dark md:table-cell">{r.title}</td>
                      <td className="whitespace-nowrap text-stone-dark">{formatDateDE(r.doc_date)}</td>
                      <td className="hidden whitespace-nowrap text-stone-dark sm:table-cell">{formatDateDE(kind === "angebot" ? r.valid_until : r.due_date) || "–"}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          <Badge tone={statusTone[ds]}>{statusLabels[ds]}</Badge>
                          {kind === "angebot" && r.view_count > 0 && ds === "versendet" ? (
                            <span title={`${r.view_count}× online angesehen`} className="text-stone">
                              <Eye className="size-3.5" aria-label={`${r.view_count}× angesehen`} />
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatEuro(r.gross_total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Icon}
            title={q || status ? "Keine Treffer" : `Noch keine ${label.many}`}
            text={q || status ? "Passen Sie Suche oder Filter an." : `Erstellen Sie Ihr erstes ${label.one === "Rechnung" ? "Rechnungsdokument" : "Angebot"} in wenigen Sekunden.`}
            action={
              <Link href={`${base}/neu`} className="adm-btn adm-btn-primary">
                <FilePlus2 className="size-4" aria-hidden /> Jetzt erstellen
              </Link>
            }
          />
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} hrefFor={(p) => href({ seite: p })} />
      </Card>
    </>
  );
}
