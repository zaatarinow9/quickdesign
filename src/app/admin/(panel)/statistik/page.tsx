import { Eye, MousePointerClick, Smartphone, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { isoDaysAgo, lastDays } from "@/lib/admin/time";
import { BarChart, RankList } from "@/components/admin/charts";
import { Card, FilterTabs, Notice, PageHeader, Stat } from "@/components/admin/ui";

export const metadata = { title: "Website-Statistik" };

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ tage?: string }> }) {
  await requireAdmin();
  const days = [7, 30, 90].includes(Number((await searchParams).tage)) ? Number((await searchParams).tage) : 30;
  const since = isoDaysAgo(days);
  const { data } = await db().from("page_views").select("visitor_id, path, referrer_host, utm_source, utm_campaign, device, created_at").gte("created_at", since).order("created_at").limit(50000);
  const views = data ?? [];
  const visitors = new Set(views.map((v) => v.visitor_id).filter(Boolean));
  const byDay = new Map<string, { views: number; visitors: Set<string> }>();
  for (const d of lastDays(days)) byDay.set(d, { views: 0, visitors: new Set() });
  const count = (m: Map<string, number>, k: string | null | undefined) => k && m.set(k, (m.get(k) ?? 0) + 1);
  const pages = new Map<string, number>();
  const refs = new Map<string, number>();
  const campaigns = new Map<string, number>();
  const devices = new Map<string, number>();
  for (const v of views) {
    const d = byDay.get(String(v.created_at).slice(0, 10));
    if (d) {
      d.views++;
      if (v.visitor_id) d.visitors.add(v.visitor_id);
    }
    count(pages, v.path);
    count(refs, v.utm_source || v.referrer_host || "Direkt");
    count(campaigns, v.utm_campaign);
    count(devices, v.device);
  }
  const top = (m: Map<string, number>, n = 8) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));
  const mobile = devices.get("mobil") ?? 0;
  const fmtDay = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

  return (
    <>
      <PageHeader
        title="Website-Statistik"
        description="Eigene, datensparsame Messung ohne Drittanbieter – erfasst nur Besucher, die der Statistik zugestimmt haben (Zahlen sind daher Mindestwerte)."
        actions={<FilterTabs active={String(days)} items={[7, 30, 90].map((d) => ({ key: String(d), label: `${d} Tage`, href: `/admin/statistik?tage=${d}` }))} />}
      />
      {!views.length ? (
        <div className="mb-6">
          <Notice tone="info">Noch keine Daten im gewählten Zeitraum. Sobald Besucher der Statistik zustimmen, erscheinen hier Auswertungen.</Notice>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Besucher" value={visitors.size} icon={Users} tone="accent" />
        <Stat label="Seitenaufrufe" value={views.length} icon={Eye} />
        <Stat label="Seiten pro Besuch" value={visitors.size ? (views.length / visitors.size).toFixed(1).replace(".", ",") : "–"} icon={MousePointerClick} />
        <Stat label="Mobil" value={views.length ? `${Math.round((mobile / views.length) * 100)} %` : "–"} icon={Smartphone} tone="cyan" />
      </div>
      <Card className="mt-6" title="Seitenaufrufe pro Tag">
        <BarChart caption="Seitenaufrufe pro Tag" format={(v) => `${v} Aufrufe`} data={[...byDay.entries()].map(([d, x]) => ({ label: fmtDay(d), value: x.views, sub: `${x.visitors.size} Besucher` }))} />
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Beliebteste Seiten">{pages.size ? <RankList format={String} rows={top(pages)} /> : <p className="text-sm text-stone-dark">–</p>}</Card>
        <Card title="Quellen">{refs.size ? <RankList format={String} rows={top(refs)} /> : <p className="text-sm text-stone-dark">–</p>}</Card>
        <Card title="Kampagnen (utm_campaign)">{campaigns.size ? <RankList format={String} rows={top(campaigns)} /> : <p className="text-sm text-stone-dark">Keine Kampagnen-Links erfasst.</p>}</Card>
      </div>
    </>
  );
}
