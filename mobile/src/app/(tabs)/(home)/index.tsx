import { View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmt, useT } from "@/lib/i18n";
import { brand, inquiryTone, projectTone, radius, shopTone, space } from "@/lib/theme";
import { Chip, Empty, ErrorView, Icon, Item, Kpi, List, Loading, Page, Section, Txt, typeIcon } from "@/components/ui";

type Dash = {
  date: string;
  counts: { newInquiries: number; openShop: number; activeFiles: number; myFiles: number; todayTasks: number };
  today: { id: string; number: string; title: string; customer: string; status: string; type: string | null; time: string | null; city: string | null }[];
  recentInquiries: { id: string; reference: string; name: string; company_name: string | null; message: string; status: string; created_at: string }[];
  recentShop: { id: string; number: string | null; name: string | null; amount_total: number; status: string; created_at: string }[];
  sales: { today: number; month: number } | null;
};


export default function Home() {
  const { t, lang, rtl } = useT();
  const f = fmt(lang);
  const { state, refreshMe } = useAuth();
  const me = state.status === "ready" ? state.me : null;
  const unread = state.status === "ready" ? state.unread : 0;
  const { data, error, loading, refreshing, refresh, reload } = useApi<Dash>("/dashboard");
  const first = (me?.name || me?.email || "").split(/[\s@]/)[0];

  return (
    <Page
      actions={[{ icon: "notifications-outline", onPress: () => router.push("/notifications"), badge: unread }]}
      refreshing={refreshing}
      onRefresh={() => {
        void refresh();
        void refreshMe();
      }}
    >
      {/* Begrüßung mit Tagesüberblick */}
      <View style={{ paddingHorizontal: space.page, marginTop: 8 }}>
        <LinearGradient colors={["#1A1C22", "#111317"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 20, overflow: "hidden" }}>
          <View style={{ position: "absolute", top: -40, [rtl ? "left" : "right"]: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: `${brand.magenta}33` }} />
          <View style={{ position: "absolute", bottom: -50, [rtl ? "left" : "right"]: 50, width: 120, height: 120, borderRadius: 60, backgroundColor: `${brand.cyan}26` }} />
          <Txt v="meta" color="#ffffffa6">{data ? f.weekday(data.date) : " "}</Txt>
          <Txt v="display" color="#fff" style={{ marginTop: 2 }}>
            {t.home.hello}
            {first ? `, ${first}` : ""}
          </Txt>
          <View style={{ flexDirection: "row", gap: 18, marginTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Icon name="calendar" size={16} color={brand.cyan} />
              <Txt v="label" color="#fff">{data?.counts.todayTasks ?? "–"} {t.home.todayPlan}</Txt>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Icon name="mail-unread" size={16} color={brand.magenta} />
              <Txt v="label" color="#fff">{data?.counts.newInquiries ?? "–"} {t.home.newInquiries}</Txt>
            </View>
          </View>
          {/* CMYK-Akzent */}
          <View style={{ flexDirection: "row", gap: 4, marginTop: 18 }}>
            {[brand.cyan, brand.magenta, brand.yellow, "#ffffff"].map((col) => <View key={col} style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: col }} />)}
          </View>
        </LinearGradient>
      </View>

      {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : data ? (
        <>
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: space.page, marginTop: 14 }}>
            <Kpi label={t.home.newInquiries} value={data.counts.newInquiries} icon="mail-unread" tone="magenta" onPress={() => router.push("/inquiries")} />
            <Kpi label={t.home.activeFiles} value={data.counts.activeFiles} icon="print" tone="amber" onPress={() => router.push("/files")} />
          </View>
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: space.page, marginTop: 12 }}>
            <Kpi label={t.home.openShop} value={data.counts.openShop} icon="bag-handle" tone="violet" onPress={() => router.push("/more/shop")} />
            <Kpi label={t.home.myFiles} value={data.counts.myFiles} icon="person-circle" tone="blue" onPress={() => router.push({ pathname: "/files", params: { mine: "1" } })} />
          </View>
          {data.sales ? (
            <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: space.page, marginTop: 12 }}>
              <Kpi label={t.home.salesToday} value={f.centsShort(data.sales.today)} icon="trending-up" tone="green" />
              <Kpi label={t.home.salesMonth} value={f.centsShort(data.sales.month)} icon="stats-chart" tone="green" />
            </View>
          ) : null}

          <Section title={t.home.todayPlan} action={{ label: t.common.seeAll, onPress: () => router.push("/work") }}>
            {data.today.length ? (
              <List>
                {data.today.map((p) => (
                  <Item
                    key={p.id}
                    icon={typeIcon(p.type)}
                    tone="blue"
                    title={p.title}
                    subtitle={[p.customer, p.city].filter(Boolean).join(" · ")}
                    meta={p.time ?? undefined}
                    trailing={<Chip label={t.project.status[p.status as keyof typeof t.project.status] ?? p.status} tone={projectTone[p.status]} />}
                    onPress={() => router.push(`/work/${p.id}`)}
                    chevron={false}
                  />
                ))}
              </List>
            ) : (
              <List>
                <Item icon="sunny" tone="amber" title={t.home.nothingToday} />
              </List>
            )}
          </Section>

          <Section title={t.home.recentInquiries} action={{ label: t.common.seeAll, onPress: () => router.push("/inquiries") }}>
            {data.recentInquiries.length ? (
              <List>
                {data.recentInquiries.map((q) => (
                  <Item
                    key={q.id}
                    initials={q.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                    tone={inquiryTone[q.status]}
                    title={q.company_name || q.name}
                    subtitle={q.message.replace(/\s+/g, " ")}
                    meta={`${q.reference} · ${f.relative(q.created_at)}`}
                    trailing={<Chip label={t.inquiry.status[q.status as keyof typeof t.inquiry.status] ?? q.status} tone={inquiryTone[q.status]} />}
                    onPress={() => router.push(`/inquiries/${q.id}`)}
                    chevron={false}
                  />
                ))}
              </List>
            ) : (
              <Empty text={t.common.empty} />
            )}
          </Section>

          {data.recentShop.length ? (
            <Section title={t.home.recentShop} action={{ label: t.common.seeAll, onPress: () => router.push("/more/shop") }}>
              <List>
                {data.recentShop.map((o) => (
                  <Item
                    key={o.id}
                    icon="bag-handle"
                    tone={shopTone[o.status]}
                    title={o.name ?? "–"}
                    subtitle={`${o.number ?? ""} · ${f.relative(o.created_at)}`}
                    value={f.cents(o.amount_total)}
                    onPress={() => router.push(`/more/shop/${o.id}`)}
                    chevron={false}
                  />
                ))}
              </List>
            </Section>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
