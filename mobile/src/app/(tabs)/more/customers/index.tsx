import { useState } from "react";
import { router, Stack } from "expo-router";
import { useApi } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { brand } from "@/lib/theme";
import { Empty, ErrorView, Loading, Row, Screen, Section } from "@/components/ui";

type C = { id: string; customer_number: string; kind: string; status: string; name: string; company_name: string | null; email: string | null; phone: string | null; city: string | null };

export default function Customers() {
  const { t } = useT();
  const [q, setQ] = useState("");
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: C[] }>(`/customers?q=${encodeURIComponent(q.trim())}`);
  return (
    <>
      <Stack.Screen options={{ title: t.customer.title, headerSearchBarOptions: { placeholder: t.common.search, onChangeText: (e) => setQ(e.nativeEvent.text) } }} />
      <Screen refreshing={refreshing} onRefresh={refresh}>
        {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.common.empty} icon="person.2" /> : (
          <Section>
            {data.items.map((x, k) => (
              <Row
                key={x.id}
                icon={x.kind === "firma" ? "building.2.fill" : "person.fill"}
                iconColor={x.kind === "firma" ? brand.cyan : brand.slate}
                title={x.company_name || x.name}
                subtitle={[x.company_name ? x.name : null, x.city, x.customer_number].filter(Boolean).join(" · ")}
                onPress={() => router.push(`/more/customers/${x.id}`)}
                last={k === data.items.length - 1}
              />
            ))}
          </Section>
        )}
      </Screen>
    </>
  );
}
