import { useState } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmt, useT } from "@/lib/i18n";
import { docTone } from "@/lib/theme";
import { Chip, Empty, ErrorView, Loading, Row, Screen, Section } from "@/components/ui";

type D = { id: string; number: string | null; status: string; title: string; customer_name: string; company_name: string | null; gross_total: number; doc_date: string; due_date: string | null; valid_until: string | null };

export default function Documents() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const k = kind === "rechnung" ? "rechnung" : "angebot";
  const { t, lang } = useT();
  const f = fmt(lang);
  const { state } = useAuth();
  const full = state.status === "ready" && state.me.full;
  const [q, setQ] = useState("");
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: D[] }>(`/documents?kind=${k}&q=${encodeURIComponent(q.trim())}`);
  const today = new Date().toISOString().slice(0, 10);
  const shown = (d: D) => (k === "angebot" && d.status === "versendet" && d.valid_until && d.valid_until < today ? "abgelaufen" : k === "rechnung" && ["offen", "teilbezahlt"].includes(d.status) && d.due_date && d.due_date < today ? "ueberfaellig" : d.status);
  return (
    <>
      <Stack.Screen options={{ title: k === "rechnung" ? t.doc.invoices : t.doc.offers, headerLargeTitle: false, headerSearchBarOptions: { placeholder: t.common.search, onChangeText: (e) => setQ(e.nativeEvent.text) } }} />
      <Screen refreshing={refreshing} onRefresh={refresh}>
        {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.common.empty} icon="doc" /> : (
          <Section>
            {data.items.map((d, i) => {
              const s = shown(d);
              return (
                <Row
                  key={d.id}
                  title={`${d.number ?? t.doc.status.entwurf} · ${d.company_name || d.customer_name}`}
                  subtitle={[f.date(d.doc_date), d.title].filter(Boolean).join(" · ")}
                  value={full ? f.money(Number(d.gross_total)) : undefined}
                  right={<Chip small label={t.doc.status[s] ?? s} tone={docTone(s)} />}
                  onPress={() => router.push(`/more/documents/${d.id}`)}
                  last={i === data.items.length - 1}
                />
              );
            })}
          </Section>
        )}
      </Screen>
    </>
  );
}
