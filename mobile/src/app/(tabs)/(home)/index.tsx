import { Pressable, View } from "react-native";
import { router, Stack } from "expo-router";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmt, useT } from "@/lib/i18n";
import { brand, inquiryTone, projectTone, shopTone, useColors } from "@/lib/theme";
import { Chip, Empty, ErrorView, Icon, Loading, Row, Screen, Section, Stat, T } from "@/components/ui";

type Dash = {
  date: string;
  counts: { newInquiries: number; openShop: number; activeFiles: number; myFiles: number; todayTasks: number };
  today: { id: string; number: string; title: string; customer: string; status: string; type: string | null; time: string | null; city: string | null }[];
  recentInquiries: { id: string; reference: string; name: string; company_name: string | null; message: string; status: string; created_at: string }[];
  recentShop: { id: string; number: string | null; name: string | null; amount_total: number; status: string; created_at: string }[];
  sales: { today: number; month: number } | null;
};

export default function Home() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { state, refreshMe } = useAuth();
  const me = state.status === "ready" ? state.me : null;
  const unread = state.status === "ready" ? state.unread : 0;
  const { data, error, loading, refreshing, refresh, reload } = useApi<Dash>("/dashboard");
  const first = (me?.name || me?.email || "").split(/[\s@]/)[0];

  return (
    <>
      <Stack.Screen
        options={{
          title: t.tabs.home,
          headerRight: () => (
            <Pressable onPress={() => router.push("/notifications")} hitSlop={10} style={{ padding: 4 }}>
              <View>
                <Icon name={unread ? "bell.badge.fill" : "bell"} size={22} color={brand.magenta} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Screen
        refreshing={refreshing}
        onRefresh={() => {
          void refresh();
          void refreshMe();
        }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <T size={15} color={c.text2}>{data ? f.weekday(data.date) : " "}</T>
          <T size={24} weight="700" style={{ marginTop: 2 }}>
            {t.home.hello}
            {first ? `, ${first}` : ""} 👋
          </T>
        </View>
        {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : data ? (
          <>
            <View style={{ flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 18 }}>
              <Stat label={t.home.newInquiries} value={data.counts.newInquiries} icon="tray.full.fill" color={brand.magenta} onPress={() => router.push("/inquiries")} />
              <Stat label={t.home.todayPlan} value={data.counts.todayTasks} icon="calendar" color={brand.cyan} onPress={() => router.push("/work")} />
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 12 }}>
              <Stat label={t.home.activeFiles} value={data.counts.activeFiles} icon="printer.fill" color={brand.amber} onPress={() => router.push("/files")} />
              <Stat label={t.home.openShop} value={data.counts.openShop} icon="bag.fill" color={brand.violet} onPress={() => router.push("/more/shop")} />
            </View>
            {data.counts.myFiles ? (
              <Section>
                <Row icon="person.crop.circle.badge.checkmark" iconColor={brand.amber} title={t.home.myFiles} value={String(data.counts.myFiles)} onPress={() => router.push({ pathname: "/files", params: { mine: "1" } })} last />
              </Section>
            ) : null}
            {data.sales ? (
              <View style={{ flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 12 }}>
                <Stat label={t.home.salesToday} value={f.cents(data.sales.today)} icon="eurosign" color={brand.green} />
                <Stat label={t.home.salesMonth} value={f.cents(data.sales.month)} icon="chart.bar.fill" color={brand.green} />
              </View>
            ) : null}

            <Section title={t.home.todayPlan}>
              {data.today.length ? (
                data.today.map((p, i) => (
                  <Row
                    key={p.id}
                    icon={p.type === "montage" ? "hammer.fill" : p.type === "lieferung" ? "shippingbox.fill" : p.type === "abholung" ? "figure.walk" : "checklist"}
                    iconColor={brand.cyan}
                    title={p.title}
                    subtitle={[p.time, p.customer, p.city].filter(Boolean).join(" · ")}
                    right={<Chip small label={t.project.status[p.status as keyof typeof t.project.status] ?? p.status} tone={projectTone[p.status]} />}
                    onPress={() => router.push(`/work/${p.id}`)}
                    last={i === data.today.length - 1}
                  />
                ))
              ) : (
                <Row title={t.home.nothingToday} icon="sun.max.fill" iconColor={brand.yellow} last />
              )}
            </Section>

            <Section title={t.home.recentInquiries} action={{ label: t.common.seeAll, onPress: () => router.push("/inquiries") }}>
              {data.recentInquiries.length ? (
                data.recentInquiries.map((q, i) => (
                  <Row
                    key={q.id}
                    title={q.company_name ? `${q.name} · ${q.company_name}` : q.name}
                    subtitle={`${f.relative(q.created_at)} · ${q.message.replace(/\s+/g, " ").slice(0, 80)}`}
                    right={<Chip small label={t.inquiry.status[q.status as keyof typeof t.inquiry.status] ?? q.status} tone={inquiryTone[q.status]} />}
                    onPress={() => router.push(`/inquiries/${q.id}`)}
                    last={i === data.recentInquiries.length - 1}
                  />
                ))
              ) : (
                <Empty text={t.common.empty} />
              )}
            </Section>

            {data.recentShop.length ? (
              <Section title={t.home.recentShop} action={{ label: t.common.seeAll, onPress: () => router.push("/more/shop") }}>
                {data.recentShop.map((o, i) => (
                  <Row
                    key={o.id}
                    title={`${o.number ?? ""} · ${o.name ?? ""}`}
                    subtitle={f.relative(o.created_at)}
                    value={f.cents(o.amount_total)}
                    right={<Chip small label={t.shop.status[o.status as keyof typeof t.shop.status] ?? o.status} tone={shopTone[o.status]} />}
                    onPress={() => router.push(`/more/shop/${o.id}`)}
                    last={i === data.recentShop.length - 1}
                  />
                ))}
              </Section>
            ) : null}
          </>
        ) : null}
      </Screen>
    </>
  );
}
