import { History } from "lucide-react";
import { requireFullAccess } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/documents/format";
import { Badge, Card, EmptyState, FilterTabs, PageHeader, Pagination } from "@/components/admin/ui";

export const metadata = { title: "Protokoll" };
const PAGE = 50;

export default async function LogPage({ searchParams }: { searchParams: Promise<{ seite?: string; ansicht?: string }> }) {
  await requireFullAccess();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.seite) || 1);
  const mails = sp.ansicht === "emails";
  const client = db();
  const [activity, emails] = await Promise.all([
    mails ? null : client.from("activity_log").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    mails ? client.from("email_log").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1) : null,
  ]);
  const base = mails ? "/admin/protokoll?ansicht=emails&" : "/admin/protokoll?";
  return (
    <>
      <PageHeader
        title="Protokoll"
        description="Nachvollziehbarkeit aller wichtigen Aktionen und E-Mails."
        actions={<FilterTabs active={mails ? "emails" : "aktivitaet"} items={[{ key: "aktivitaet", label: "Aktivitäten", href: "/admin/protokoll" }, { key: "emails", label: "E-Mail-Versand", href: "/admin/protokoll?ansicht=emails" }]} />}
      />
      <Card padded={false}>
        {mails ? (
          emails?.data?.length ? (
            <table className="adm-table">
              <tbody>
                {emails.data.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs text-stone">{formatDateTime(e.created_at)}</td>
                    <td>{e.ok ? <Badge tone="green">zugestellt</Badge> : <Badge tone="red">Fehler</Badge>}</td>
                    <td className="max-w-[14rem] truncate">{e.recipient}</td>
                    <td className="hidden max-w-[22rem] truncate text-stone-dark md:table-cell">{e.subject}</td>
                    <td className="hidden max-w-[18rem] truncate text-xs text-red-700 lg:table-cell">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon={History} title="Noch keine E-Mails" />
          )
        ) : activity?.data?.length ? (
          <table className="adm-table">
            <tbody>
              {activity.data.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-xs text-stone">{formatDateTime(a.created_at)}</td>
                  <td><Badge>{a.action}</Badge></td>
                  <td>{a.summary}</td>
                  <td className="hidden text-xs text-stone-dark md:table-cell">{a.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={History} title="Noch keine Einträge" />
        )}
        <Pagination page={page} total={(mails ? emails?.count : activity?.count) ?? 0} pageSize={PAGE} hrefFor={(p) => `${base}seite=${p}`} />
      </Card>
    </>
  );
}
