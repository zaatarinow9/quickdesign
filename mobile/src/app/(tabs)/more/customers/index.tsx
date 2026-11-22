import { useState } from "react";
import { router } from "expo-router";
import { useApi } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Empty, ErrorView, initials, Item, List, Loading, Page, SearchBar, Section } from "@/components/ui";

type C = { id: string; customer_number: string; kind: string; name: string; company_name: string | null; city: string | null };

export default function Customers() {
  const { t } = useT();
  const [q, setQ] = useState("");
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: C[] }>(`/customers?q=${encodeURIComponent(q.trim())}`);
  return (
    <Page back title={t.customer.title} refreshing={refreshing} onRefresh={refresh}>
      <SearchBar value={q} onChange={setQ} placeholder={t.common.search} />
      {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.common.empty} icon="people-outline" /> : (
        <Section style={{ marginTop: 16 }}>
          <List>
            {data.items.map((x) => (
              <Item
                key={x.id}
                initials={initials(x.company_name || x.name)}
                tone={x.kind === "firma" ? "blue" : "gray"}
                title={x.company_name || x.name}
                subtitle={[x.company_name ? x.name : null, x.city].filter(Boolean).join(" · ") || null}
                meta={x.customer_number}
                onPress={() => router.push(`/more/customers/${x.id}`)}
              />
            ))}
          </List>
        </Section>
      )}
    </Page>
  );
}
