import "server-only";
import { db } from "@/lib/supabase/admin";
import { todayBerlin } from "@/lib/documents/format";

const n = (v: unknown) => Number(v ?? 0);

export type MonthPoint = { key: string; label: string; invoiced: number; paid: number; offered: number };

function monthKeys(count: number) {
  const now = new Date();
  const out: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      key: d.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "UTC" }).format(d).replace(".", ""),
    });
  }
  return out;
}

export async function overviewStats() {
  const client = db();
  const today = todayBerlin();
  const months = monthKeys(12);
  const since = `${months[0].key}-01`;
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const prevMonthStart = (() => {
    const d = new Date(`${monthStart}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5).toISOString();

  const [docsRes, openInvRes, openOffersRes, inquiriesRes, newInqRes, custRes, custMonthRes, mktRes, viewsRes, activityRes, topCustRes, catalogRes] = await Promise.all([
    client.from("documents").select("kind, status, number, gross_total, paid_amount, paid_at, doc_date, accepted_at, customer_id").gte("doc_date", since).limit(5000),
    client.from("documents").select("id, number, customer_name, company_name, gross_total, paid_amount, due_date, status").eq("kind", "rechnung").in("status", ["offen", "teilbezahlt"]).order("due_date").limit(200),
    client.from("documents").select("id, number, customer_name, company_name, gross_total, valid_until, first_viewed_at, view_count, status").eq("kind", "angebot").eq("status", "versendet").order("created_at", { ascending: false }).limit(200),
    client.from("inquiries").select("id", { count: "exact", head: true }).gte("created_at", `${monthStart}T00:00:00Z`),
    client.from("inquiries").select("id, reference, name, company_name, created_at, interests").eq("status", "neu").order("created_at", { ascending: false }).limit(6),
    client.from("customers").select("id", { count: "exact", head: true }),
    client.from("customers").select("id", { count: "exact", head: true }).gte("created_at", `${monthStart}T00:00:00Z`),
    client.from("customers").select("id", { count: "exact", head: true }).eq("marketing_status", "bestaetigt"),
    client.from("page_views").select("visitor_id, created_at").gte("created_at", thirtyDaysAgo).limit(20000),
    client.from("activity_log").select("id, actor, action, entity, entity_id, summary, created_at").order("created_at", { ascending: false }).limit(8),
    client.from("documents").select("customer_id, customer_name, company_name, gross_total, status").eq("kind", "rechnung").not("number", "is", null).neq("status", "storniert").gte("doc_date", yearStart).limit(5000),
    client.from("service_catalog").select("id, name, usage_count, price_net").order("usage_count", { ascending: false }).limit(5),
  ]);

  const docs = docsRes.data ?? [];
  const series: MonthPoint[] = months.map((m) => ({ ...m, invoiced: 0, paid: 0, offered: 0 }));
  const idx = new Map(series.map((p, i) => [p.key, i]));
  let revenueMonth = 0;
  let revenuePrevMonth = 0;
  let revenueYear = 0;
  let offersDecided = 0;
  let offersAccepted = 0;
  let offersCount = 0;
  for (const d of docs) {
    const k = String(d.doc_date).slice(0, 7);
    const i = idx.get(k);
    const gross = n(d.gross_total);
    if (d.kind === "rechnung" && d.number && d.status !== "storniert") {
      if (i !== undefined) series[i].invoiced += gross;
      if (d.doc_date >= monthStart) revenueMonth += gross;
      else if (d.doc_date >= prevMonthStart) revenuePrevMonth += gross;
      if (d.doc_date >= yearStart) revenueYear += gross;
      if (d.paid_at) {
        const pi = idx.get(String(d.paid_at).slice(0, 7));
        if (pi !== undefined) series[pi].paid += n(d.paid_amount);
      }
    }
    if (d.kind === "angebot") {
      offersCount++;
      if (i !== undefined) series[i].offered += gross;
      if (d.status === "angenommen") {
        offersAccepted++;
        offersDecided++;
      } else if (d.status === "abgelehnt") offersDecided++;
    }
  }

  const openInvoices = (openInvRes.data ?? []).map((r) => ({ ...r, open: Math.max(0, n(r.gross_total) - n(r.paid_amount)) }));
  const overdue = openInvoices.filter((r) => r.due_date && r.due_date < today);
  const openOffers = (openOffersRes.data ?? []).map((r) => ({ ...r, gross_total: n(r.gross_total), expired: !!r.valid_until && r.valid_until < today }));

  const views = viewsRes.data ?? [];
  const visitors = new Set(views.map((v) => v.visitor_id).filter(Boolean)).size;
  const viewsByDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) viewsByDay.set(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), 0);
  for (const v of views) {
    const k = String(v.created_at).slice(0, 10);
    if (viewsByDay.has(k)) viewsByDay.set(k, (viewsByDay.get(k) ?? 0) + 1);
  }

  const byCustomer = new Map<string, { name: string; total: number; id: string | null }>();
  for (const r of topCustRes.data ?? []) {
    const key = r.customer_id ?? `${r.company_name ?? ""}|${r.customer_name}`;
    const cur = byCustomer.get(key) ?? { name: r.company_name || r.customer_name, total: 0, id: r.customer_id };
    cur.total += n(r.gross_total);
    byCustomer.set(key, cur);
  }

  return {
    today,
    series,
    revenueMonth,
    revenuePrevMonth,
    revenueYear,
    openInvoices,
    openInvoicesSum: openInvoices.reduce((s, r) => s + r.open, 0),
    overdue,
    overdueSum: overdue.reduce((s, r) => s + r.open, 0),
    openOffers,
    openOffersSum: openOffers.filter((o) => !o.expired).reduce((s, r) => s + r.gross_total, 0),
    acceptanceRate: offersDecided ? Math.round((offersAccepted / offersDecided) * 100) : null,
    offersCount,
    offersAccepted,
    inquiriesMonth: inquiriesRes.count ?? 0,
    newInquiries: newInqRes.data ?? [],
    customers: custRes.count ?? 0,
    customersMonth: custMonthRes.count ?? 0,
    marketingContacts: mktRes.count ?? 0,
    pageViews: views.length,
    visitors,
    viewsByDay: [...viewsByDay.entries()].map(([day, count]) => ({ day, count })),
    activity: activityRes.data ?? [],
    topCustomers: [...byCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    topServices: (catalogRes.data ?? []).filter((s) => n(s.usage_count) > 0),
  };
}

export async function countNewInquiries(): Promise<number> {
  try {
    const { count } = await db().from("inquiries").select("id", { count: "exact", head: true }).eq("status", "neu");
    return count ?? 0;
  } catch {
    return 0;
  }
}
