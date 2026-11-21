import { useState } from "react";
import { router, Stack } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { shopTone } from "@/lib/theme";
import { Chip, Empty, ErrorView, Loading, Row, Screen, Section, Segments } from "@/components/ui";

type O = { id: string; number: string | null; status: string; name: string | null; shipping_method: string | null; amount_total: number; items: { description?: string; quantity?: number }[]; created_at: string };

export default function ShopOrders() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const [filter, setFilter] = useState("offen");
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: O[] }>(`/shop?status=${filter === "alle" ? "" : filter}`);
  return (
    <>
      <Stack.Screen options={{ title: t.shop.title, headerLargeTitle: false }} />
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Segments
          value={filter}
          onChange={setFilter}
          options={[
            { value: "offen", label: t.common.open },
            { value: "versendet", label: t.shop.status.versendet },
            { value: "abgeschlossen", label: t.shop.status.abgeschlossen },
            { value: "alle", label: t.common.all },
          ]}
        />
        {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.common.empty} icon="bag" /> : (
          <Section>
            {data.items.map((o, k) => (
              <Row
                key={o.id}
                title={`${o.number ?? ""} · ${o.name ?? ""}`}
                subtitle={[f.relative(o.created_at), `${o.items.reduce((s, i) => s + (i.quantity ?? 1), 0)} ${t.shop.items}`, o.shipping_method].filter(Boolean).join(" · ")}
                value={f.cents(o.amount_total)}
                right={<Chip small label={t.shop.status[o.status as keyof typeof t.shop.status] ?? o.status} tone={shopTone[o.status]} />}
                onPress={() => router.push(`/more/shop/${o.id}`)}
                last={k === data.items.length - 1}
              />
            ))}
          </Section>
        )}
      </Screen>
    </>
  );
}
