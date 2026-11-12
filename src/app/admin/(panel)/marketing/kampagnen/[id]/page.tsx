import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical, Send, Trash2 } from "lucide-react";
import { hasFullAccess, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/documents/format";
import { deleteCampaign, sendCampaignBatch, sendCampaignTest } from "@/app/admin/campaign-actions";
import { CampaignForm } from "@/components/admin/CampaignForm";
import { ConfirmSubmit } from "@/components/admin/documents/panels";
import { Card, Notice, PageHeader, Stat } from "@/components/admin/ui";

export const metadata = { title: "Kampagne" };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const client = db();
  const { data: c } = await client.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  let audienceQ = client.from("customers").select("id", { count: "exact", head: true }).eq("marketing_status", "bestaetigt");
  if (c.audience_tag) audienceQ = audienceQ.contains("tags", [c.audience_tag]);
  const [{ count: audience }, { data: tagRows }] = await Promise.all([audienceQ, client.from("customers").select("tags").eq("marketing_status", "bestaetigt").limit(20000)]);
  const tags = [...new Set((tagRows ?? []).flatMap((r) => r.tags ?? []))].sort();
  const remaining = Math.max(0, Number(c.recipients_total) - Number(c.sent_count) - Number(c.failed_count));
  const full = hasFullAccess(admin.role);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/admin/marketing/kampagnen" className="inline-flex items-center gap-1.5 hover:text-accent">
            <ArrowLeft className="size-4" aria-hidden /> Kampagnen
          </Link>
        }
        title={c.name}
        actions={
          <form action={sendCampaignTest}>
            <input type="hidden" name="id" value={c.id} />
            <button className="adm-btn adm-btn-ghost">
              <FlaskConical className="size-4" aria-hidden /> Test an mich senden
            </button>
          </form>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={c.status === "entwurf" ? "Empfänger (aktuell)" : "Empfänger"} value={c.status === "entwurf" ? (audience ?? 0) : c.recipients_total} hint={c.audience_tag ? `#${c.audience_tag}` : "alle bestätigten Kontakte"} />
        <Stat label="Gesendet" value={c.sent_count} tone="green" hint={c.finished_at ? `fertig ${formatDateTime(c.finished_at)}` : undefined} />
        <Stat label="Nicht gesendet" value={c.failed_count} tone={c.failed_count ? "red" : "ink"} hint="z. B. zwischenzeitlich abgemeldet" />
      </div>

      {c.status !== "gesendet" && full ? (
        <Card className="mt-6" title="Versand">
          <p className="text-sm text-stone-dark">
            Der Versand erfolgt in Etappen von je 25 E-Mails über Ihr Postfach (schont die Zustellbarkeit). {c.status === "wird_gesendet" ? `Noch ${remaining} offen.` : ""}
          </p>
          <form action={sendCampaignBatch} className="mt-4">
            <input type="hidden" name="id" value={c.id} />
            <ConfirmSubmit className="adm-btn adm-btn-accent" message={c.status === "entwurf" ? `Kampagne jetzt an ${audience ?? 0} Empfänger senden? Danach kann der Text nicht mehr geändert werden.` : "Nächste Etappe senden?"}>
              <Send className="size-4" aria-hidden /> {c.status === "entwurf" ? "Versand starten" : `Weiter senden (${Math.min(25, remaining)})`}
            </ConfirmSubmit>
          </form>
        </Card>
      ) : null}
      {c.status === "gesendet" ? (
        <div className="mt-6">
          <Notice tone="success">Kampagne vollständig versendet.</Notice>
        </div>
      ) : null}

      <Card className="mt-6" title="Inhalt">
        <CampaignForm campaign={c} tags={tags} disabled={c.status !== "entwurf"} />
      </Card>

      {c.status === "entwurf" && full ? (
        <form action={deleteCampaign} className="mt-4">
          <input type="hidden" name="id" value={c.id} />
          <ConfirmSubmit className="adm-btn adm-btn-danger adm-btn-sm" message="Entwurf löschen?">
            <Trash2 className="size-3.5" aria-hidden /> Entwurf löschen
          </ConfirmSubmit>
        </form>
      ) : null}
    </>
  );
}
