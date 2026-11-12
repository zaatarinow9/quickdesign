import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/documents/format";
import { Badge, Card, EmptyState, FilterTabs, PageHeader, Pagination, SearchForm, statusTone } from "@/components/admin/ui";

export const metadata = { title: "Anfragen" };
const PAGE = 30;
const inquiryStatusLabel: Record<string, string> = { neu: "Neu", in_bearbeitung: "In Bearbeitung", erledigt: "Erledigt", archiviert: "Archiviert" };

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.seite) || 1);
  const status = Object.keys(inquiryStatusLabel).includes(sp.status ?? "") ? sp.status : undefined;
  const q = sp.q?.replace(/[,%*()]/g, " ").trim().slice(0, 80);
  let query = db()
    .from("inquiries")
    .select("id, reference, status, name, company_name, email, interests, message, marketing_opt_in, utm, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  query = status ? query.eq("status", status) : query.neq("status", "archiviert");
  if (q) query = query.or(`name.ilike.*${q}*,company_name.ilike.*${q}*,email.ilike.*${q}*,reference.ilike.*${q}*,message.ilike.*${q}*`);
  const [{ data, count }, all] = await Promise.all([query, db().from("inquiries").select("status").limit(20000)]);
  const counts: Record<string, number> = {};
  for (const r of all.data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const href = (extra: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q, ...extra })) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/admin/anfragen${p.size ? `?${p}` : ""}`;
  };
  return (
    <>
      <PageHeader title="Anfragen" description="Alle Nachrichten aus dem Kontaktformular – mit einem Klick zum Angebot." />
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-ink/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            active={status ?? "alle"}
            items={[
              { key: "alle", label: "Aktiv", href: href({ status: undefined, seite: undefined }) },
              ...Object.entries(inquiryStatusLabel).map(([k, l]) => ({ key: k, label: l, href: href({ status: k, seite: undefined }), count: counts[k] ?? 0 })),
            ]}
          />
          <SearchForm defaultValue={q} placeholder="Name, E-Mail, Text …" hidden={{ status }} />
        </div>
        {data?.length ? (
          <ul className="divide-y divide-ink/[0.05]">
            {data.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/anfragen/${r.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-ink/[0.02]">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${r.status === "neu" ? "bg-accent" : "bg-transparent"}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.company_name || r.name}</span>
                      <span className="text-xs text-stone">{r.reference}</span>
                      <Badge tone={statusTone[r.status]}>{inquiryStatusLabel[r.status]}</Badge>
                      {r.marketing_opt_in ? <Badge tone="violet">Newsletter</Badge> : null}
                      {(r.utm as Record<string, string>)?.utm_source ? <Badge tone="blue">{(r.utm as Record<string, string>).utm_source}</Badge> : null}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-stone-dark">{r.message}</span>
                    {r.interests?.length ? <span className="mt-1 block text-xs text-stone">{r.interests.join(" · ")}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-stone">{formatDateTime(r.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Inbox} title="Keine Anfragen" text="Neue Nachrichten aus dem Kontaktformular erscheinen hier automatisch." />
        )}
        <Pagination page={page} total={count ?? 0} pageSize={PAGE} hrefFor={(p) => href({ seite: p })} />
      </Card>
    </>
  );
}
