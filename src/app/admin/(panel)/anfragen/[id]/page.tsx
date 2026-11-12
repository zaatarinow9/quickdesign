import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, Phone, Trash2, UserRound } from "lucide-react";
import { hasFullAccess, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/documents/format";
import { deleteInquiry, updateInquiry } from "@/app/admin/customer-actions";
import { ConfirmSubmit } from "@/components/admin/documents/panels";
import { Badge, Card, PageHeader, statusTone } from "@/components/admin/ui";

export const metadata = { title: "Anfrage" };
const label: Record<string, string> = { neu: "Neu", in_bearbeitung: "In Bearbeitung", erledigt: "Erledigt", archiviert: "Archiviert" };

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: r } = await db().from("inquiries").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { data: offers } = await db().from("documents").select("id, number, status, gross_total").eq("inquiry_id", id);
  const utm = (r.utm ?? {}) as Record<string, string>;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/admin/anfragen" className="inline-flex items-center gap-1.5 hover:text-accent">
            <ArrowLeft className="size-4" aria-hidden /> Anfragen
          </Link>
        }
        title={r.company_name || r.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {r.reference} · {formatDateTime(r.created_at)} <Badge tone={statusTone[r.status]}>{label[r.status]}</Badge>
          </span>
        }
        actions={
          <>
            <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Ihre Anfrage ${r.reference}`)}`} className="adm-btn adm-btn-ghost">
              <Mail className="size-4" aria-hidden /> Antworten
            </a>
            <Link href={`/admin/angebote/neu?anfrage=${r.id}`} className="adm-btn adm-btn-primary">
              <FileText className="size-4" aria-hidden /> Angebot erstellen
            </Link>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Nachricht">
            {r.interests?.length ? (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {r.interests.map((i: string) => (
                  <Badge key={i} tone="pink">
                    {i}
                  </Badge>
                ))}
              </div>
            ) : null}
            <p className="whitespace-pre-line leading-relaxed">{r.message}</p>
          </Card>
          <Card title="Interne Notizen & Status">
            <form action={updateInquiry} className="space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <textarea name="internal_notes" rows={4} defaultValue={r.internal_notes ?? ""} className="adm-input" placeholder="z. B. Rückruf vereinbart, Maße erfragt …" />
              <div className="flex flex-wrap items-center gap-2">
                <select name="status" defaultValue={r.status} className="adm-input w-auto">
                  {Object.entries(label).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
                <button className="adm-btn adm-btn-primary">Speichern</button>
              </div>
            </form>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Kontakt">
            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <UserRound className="size-4 text-stone" aria-hidden /> {r.name}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-stone" aria-hidden />
                <a href={`mailto:${r.email}`} className="hover:text-accent">
                  {r.email}
                </a>
              </div>
              {r.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-stone" aria-hidden />
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="hover:text-accent">
                    {r.phone}
                  </a>
                </div>
              ) : null}
            </dl>
            {r.customer_id ? (
              <Link href={`/admin/kunden/${r.customer_id}`} className="adm-btn adm-btn-ghost adm-btn-sm mt-4 w-full">
                Zur Kundenakte
              </Link>
            ) : null}
            <p className="mt-4 text-xs text-stone-dark">
              Newsletter-Wunsch: {r.marketing_opt_in ? "ja (Double-Opt-in gestartet)" : "nein"} · Benachrichtigung: {r.email_delivered ? "zugestellt" : "nicht zugestellt"}
            </p>
          </Card>
          {offers?.length ? (
            <Card title="Angebote zu dieser Anfrage" padded={false}>
              <ul className="divide-y divide-ink/[0.05]">
                {offers.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/angebote/${o.id}`} className="flex justify-between px-5 py-3 text-sm hover:bg-ink/[0.02]">
                      <span className="font-medium">{o.number}</span>
                      <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {Object.keys(utm).length ? (
            <Card title="Herkunft">
              <dl className="space-y-1 text-sm">
                {Object.entries(utm).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-stone-dark">{k}</dt>
                    <dd className="truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}
          {hasFullAccess(admin.role) ? (
            <form action={deleteInquiry}>
              <input type="hidden" name="id" value={r.id} />
              <ConfirmSubmit className="adm-btn adm-btn-danger adm-btn-sm" message="Anfrage endgültig löschen?">
                <Trash2 className="size-3.5" aria-hidden /> Anfrage löschen
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}
