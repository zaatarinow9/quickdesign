import Link from "next/link";
import { Megaphone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/documents/format";
import { CampaignForm } from "@/components/admin/CampaignForm";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "E-Mail-Kampagnen" };
const label: Record<string, [string, "gray" | "amber" | "green"]> = { entwurf: ["Entwurf", "gray"], wird_gesendet: ["Wird gesendet", "amber"], gesendet: ["Gesendet", "green"] };

export default async function CampaignsPage() {
  await requireAdmin();
  const client = db();
  const [{ data: campaigns }, { data: tagRows }, { count: audience }] = await Promise.all([
    client.from("campaigns").select("*").order("created_at", { ascending: false }).limit(100),
    client.from("customers").select("tags").eq("marketing_status", "bestaetigt").limit(20000),
    client.from("customers").select("id", { count: "exact", head: true }).eq("marketing_status", "bestaetigt"),
  ]);
  const tags = [...new Set((tagRows ?? []).flatMap((r) => r.tags ?? []))].sort();
  return (
    <>
      <PageHeader title="E-Mail-Kampagnen" description={`Newsletter und Aktionen an ${audience ?? 0} bestätigte Kontakte – mit persönlicher Anrede und Abmeldelink.`} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Neue Kampagne">
          <CampaignForm tags={tags} />
        </Card>
        <Card title="Kampagnen" padded={false}>
          {campaigns?.length ? (
            <ul className="divide-y divide-ink/[0.05]">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/marketing/kampagnen/${c.id}`} className="block px-5 py-3 hover:bg-ink/[0.02]">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{c.name}</span>
                      <Badge tone={label[c.status][1]}>{label[c.status][0]}</Badge>
                    </span>
                    <span className="block text-xs text-stone-dark">
                      {c.status === "entwurf" ? `Erstellt ${formatDateTime(c.created_at)}` : `${c.sent_count}/${c.recipients_total} gesendet`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Megaphone} title="Noch keine Kampagnen" />
          )}
        </Card>
      </div>
    </>
  );
}
