import Link from "next/link";
import { Download, UserPlus, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { formatDateDE } from "@/lib/documents/format";
import { Badge, Card, EmptyState, FilterTabs, PageHeader, Pagination, SearchForm, statusTone } from "@/components/admin/ui";

export const metadata = { title: "Kunden" };
const PAGE = 30;
const statusLabel: Record<string, string> = { lead: "Interessent", kunde: "Kunde", inaktiv: "Inaktiv" };
const mktLabel: Record<string, string> = { keine: "–", ausstehend: "DOI offen", bestaetigt: "Werbung ✓", abgemeldet: "Abgemeldet" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.seite) || 1);
  const status = ["lead", "kunde", "inaktiv"].includes(sp.status ?? "") ? sp.status : undefined;
  const tag = sp.tag?.slice(0, 40);
  const q = sp.q?.replace(/[,%*()]/g, " ").trim().slice(0, 80);
  let query = db()
    .from("customers")
    .select("id, customer_number, kind, status, name, company_name, email, phone, city, tags, marketing_status, last_contact_at, created_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (status) query = query.eq("status", status);
  if (tag) query = query.contains("tags", [tag]);
  if (q) query = query.or(`name.ilike.*${q}*,company_name.ilike.*${q}*,email.ilike.*${q}*,customer_number.ilike.*${q}*,city.ilike.*${q}*,phone.ilike.*${q}*`);
  const [{ data, count }, all] = await Promise.all([query, db().from("customers").select("status, tags").limit(20000)]);
  const counts: Record<string, number> = {};
  const tagCounts = new Map<string, number>();
  for (const r of all.data ?? []) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    for (const t of r.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const href = (extra: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q, tag, ...extra })) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/admin/kunden${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Kunden"
        description="Zentrale Kundendatenbank – Interessenten aus dem Kontaktformular werden automatisch angelegt."
        actions={
          <>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Datei-Download */}
            <a href="/admin/kunden/export" className="adm-btn adm-btn-ghost">
              <Download className="size-4" aria-hidden /> CSV-Export
            </a>
            <Link href="/admin/kunden/neu" className="adm-btn adm-btn-primary">
              <UserPlus className="size-4" aria-hidden /> Neuer Kunde
            </Link>
          </>
        }
      />
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-ink/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            active={status ?? "alle"}
            items={[
              { key: "alle", label: "Alle", href: href({ status: undefined, seite: undefined }), count: all.data?.length ?? 0 },
              { key: "lead", label: "Interessenten", href: href({ status: "lead", seite: undefined }), count: counts.lead ?? 0 },
              { key: "kunde", label: "Kunden", href: href({ status: "kunde", seite: undefined }), count: counts.kunde ?? 0 },
              { key: "inaktiv", label: "Inaktiv", href: href({ status: "inaktiv", seite: undefined }), count: counts.inaktiv ?? 0 },
            ]}
          />
          <SearchForm defaultValue={q} placeholder="Name, Firma, E-Mail, Ort, Nr. …" hidden={{ status, tag }} />
        </div>
        {tagCounts.size ? (
          <div className="flex flex-wrap gap-1.5 border-b border-ink/[0.06] px-4 py-3">
            {tag ? (
              <Link href={href({ tag: undefined })} className="rounded-full bg-ink px-3 py-1 text-xs text-paper">
                #{tag} ✕
              </Link>
            ) : null}
            {[...tagCounts.entries()]
              .filter(([t]) => t !== tag)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 15)
              .map(([t, n]) => (
                <Link key={t} href={href({ tag: t, seite: undefined })} className="rounded-full bg-ink/[0.05] px-3 py-1 text-xs text-stone-dark hover:bg-ink/10">
                  #{t} <span className="text-stone">{n}</span>
                </Link>
              ))}
          </div>
        ) : null}
        {data?.length ? (
          <div className="overflow-x-auto">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Kunde</th>
                  <th className="hidden md:table-cell">Kontakt</th>
                  <th className="hidden lg:table-cell">Ort</th>
                  <th>Status</th>
                  <th className="hidden sm:table-cell">Werbung</th>
                  <th className="hidden lg:table-cell">Letzter Kontakt</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td className="max-w-[16rem]">
                      <Link href={`/admin/kunden/${c.id}`} className="block truncate font-medium hover:text-accent">
                        {c.company_name || c.name}
                      </Link>
                      <span className="block truncate text-xs text-stone-dark">
                        {c.customer_number}
                        {c.company_name ? ` · ${c.name}` : ""}
                      </span>
                    </td>
                    <td className="hidden max-w-[14rem] md:table-cell">
                      <span className="block truncate">{c.email ?? "–"}</span>
                      <span className="block truncate text-xs text-stone-dark">{c.phone}</span>
                    </td>
                    <td className="hidden text-stone-dark lg:table-cell">{c.city ?? "–"}</td>
                    <td>
                      <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
                    </td>
                    <td className="hidden sm:table-cell">
                      <Badge tone={statusTone[c.marketing_status]}>{mktLabel[c.marketing_status]}</Badge>
                    </td>
                    <td className="hidden text-stone-dark lg:table-cell">{formatDateDE(c.last_contact_at ?? c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Users} title={q || status || tag ? "Keine Treffer" : "Noch keine Kunden"} text="Kunden entstehen automatisch aus Anfragen, Angeboten und Rechnungen – oder legen Sie sie manuell an." />
        )}
        <Pagination page={page} total={count ?? 0} pageSize={PAGE} hrefFor={(p) => href({ seite: p })} />
      </Card>
    </>
  );
}
