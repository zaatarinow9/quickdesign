import { route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";
import { fileCounts } from "@/lib/files/server";
import { dayTasks } from "@/lib/projects/server";

export const dynamic = "force-dynamic";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

export const GET = route(async (_req, u) => {
  const t = today();
  const [inq, shopOpen, files, tasks, recentInq, recentShop, mine] = await Promise.all([
    db().from("inquiries").select("id", { count: "exact", head: true }).eq("status", "neu"),
    db().from("shop_orders").select("id", { count: "exact", head: true }).in("status", ["bezahlt", "in_produktion"]),
    fileCounts(),
    dayTasks(t),
    db().from("inquiries").select("id, reference, name, company_name, message, status, created_at").order("created_at", { ascending: false }).limit(5),
    db().from("shop_orders").select("id, number, name, amount_total, status, created_at").order("created_at", { ascending: false }).limit(5),
    db().from("files").select("id", { count: "exact", head: true }).eq("complete", true).eq("assigned_to", u.email).neq("status", "erledigt"),
  ]);
  let sales: { today: number; month: number } | null = null;
  if (u.full) {
    const month = t.slice(0, 7) + "-01";
    const { data } = await db().from("shop_orders").select("amount_total, created_at, status").gte("created_at", month).neq("status", "storniert");
    const rows = data ?? [];
    sales = {
      today: rows.filter((r) => String(r.created_at).slice(0, 10) === t).reduce((s, r) => s + (r.amount_total as number), 0),
      month: rows.reduce((s, r) => s + (r.amount_total as number), 0),
    };
  }
  return {
    date: t,
    counts: { newInquiries: inq.count ?? 0, openShop: shopOpen.count ?? 0, activeFiles: files.aktiv, myFiles: mine.count ?? 0, todayTasks: tasks.length, files },
    today: tasks.map((p) => ({ id: p.id, number: p.number, title: p.title, customer: p.company_name || p.customer_name, status: p.status, type: p.appointment_type, time: p.appointment_time?.slice(0, 5) ?? null, city: p.site_city })),
    recentInquiries: recentInq.data ?? [],
    recentShop: recentShop.data ?? [],
    sales,
  };
});
