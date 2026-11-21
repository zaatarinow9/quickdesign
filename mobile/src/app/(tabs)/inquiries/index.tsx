import { useState } from "react";
import { router, Stack } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { inquiryTone } from "@/lib/theme";
import { Chip, Empty, ErrorView, Loading, Row, Screen, Section, Segments } from "@/components/ui";

type Inq = { id: string; reference: string; status: string; name: string; company_name: string | null; message: string; created_at: string };
type Filter = "offen" | "neu" | "in_bearbeitung" | "erledigt" | "archiviert";

export default function Inquiries() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const [filter, setFilter] = useState<Filter>("offen");
  const [q, setQ] = useState("");
  const params = new URLSearchParams();
  if (filter !== "offen") params.set("status", filter);
  if (q.trim()) params.set("q", q.trim());
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: Inq[] }>(`/inquiries?${params}`);
  const items = filter === "offen" ? (data?.items ?? []).filter((i) => i.status !== "erledigt") : (data?.items ?? []);

  return (
    <>
      <Stack.Screen
        options={{
          title: t.inquiry.title,
          headerSearchBarOptions: { placeholder: t.common.search, onChangeText: (e) => setQ(e.nativeEvent.text), hideWhenScrolling: true },
        }}
      />
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Segments
          value={filter}
          onChange={setFilter}
          options={[
            { value: "offen", label: t.common.open },
            { value: "neu", label: t.inquiry.status.neu },
            { value: "in_bearbeitung", label: t.inquiry.status.in_bearbeitung },
            { value: "erledigt", label: t.inquiry.status.erledigt },
            { value: "archiviert", label: t.inquiry.status.archiviert },
          ]}
        />
        {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !items.length ? <Empty text={t.common.empty} icon="tray" /> : (
          <Section>
            {items.map((i, k) => (
              <Row
                key={i.id}
                title={i.company_name ? `${i.name} · ${i.company_name}` : i.name}
                subtitle={`${i.reference} · ${f.relative(i.created_at)}\n${i.message.replace(/\s+/g, " ").slice(0, 120)}`}
                right={<Chip small label={t.inquiry.status[i.status as keyof typeof t.inquiry.status] ?? i.status} tone={inquiryTone[i.status]} />}
                onPress={() => router.push(`/inquiries/${i.id}`)}
                last={k === items.length - 1}
              />
            ))}
          </Section>
        )}
      </Screen>
    </>
  );
}
