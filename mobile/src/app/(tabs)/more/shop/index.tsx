import { useState } from "react";
import { router } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { shopTone } from "@/lib/theme";
import { Chip, Empty, ErrorView, initials, Item, List, Loading, Page, Section, Segments } from "@/components/ui";

type O = { id: string; number: string | null; status: string; name: string | null; shipping_method: string | null; amount_total: number; items: { quantity?: number }[]; created_at: string };

export default function ShopOrders() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const [filter, setFilter] = useState("offen");
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: O[] }>(`/shop?status=${filter === "alle" ? "" : filter}`);
  return (
    <Page back title={t.shop.title} refreshing={refreshing} onRefresh={refresh}>
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
      {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.common.empty} icon="bag-handle-outline" /> : (
        <Section style={{ marginTop: 16 }}>
          <List>
            {data.items.map((o) => (
              <Item
                key={o.id}
                initials={initials(o.name ?? "?")}
                tone={shopTone[o.status]}
                title={o.name ?? "–"}
                subtitle={`${o.items.reduce((s, i) => s + (i.quantity ?? 1), 0)} ${t.shop.items}${o.shipping_method ? ` · ${o.shipping_method}` : ""}`}
                meta={`${o.number ?? ""} · ${f.relative(o.created_at)}`}
                trailing={<Chip label={t.shop.status[o.status as keyof typeof t.shop.status] ?? o.status} tone={shopTone[o.status]} />}
                value={f.cents(o.amount_total)}
                onPress={() => router.push(`/more/shop/${o.id}`)}
                chevron={false}
              />
            ))}
          </List>
        </Section>
      )}
    </Page>
  );
}
