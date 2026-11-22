import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmt, useT } from "@/lib/i18n";
import { docTone } from "@/lib/theme";
import { Chip, Empty, ErrorView, Item, List, Loading, Page, SearchBar, Section } from "@/components/ui";

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
    <Page back title={k === "rechnung" ? t.doc.invoices : t.doc.offers} refreshing={refreshing} onRefresh={refresh}>
      <SearchBar value={q} onChange={setQ} placeholder={t.common.search} />
      {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.common.empty} icon="document-outline" /> : (
        <Section style={{ marginTop: 16 }}>
          <List>
            {data.items.map((d) => {
              const s = shown(d);
              return (
                <Item
                  key={d.id}
                  icon={k === "rechnung" ? "receipt" : "document-text"}
                  tone={docTone(s)}
                  title={d.company_name || d.customer_name}
                  subtitle={d.title}
                  meta={`${d.number ?? t.doc.status.entwurf} · ${f.date(d.doc_date)}`}
                  value={full ? f.money(Number(d.gross_total)) : undefined}
                  trailing={<Chip label={t.doc.status[s] ?? s} tone={docTone(s)} />}
                  onPress={() => router.push(`/more/documents/${d.id}`)}
                  chevron={false}
                />
              );
            })}
          </List>
        </Section>
      )}
    </Page>
  );
}
