import { useState } from "react";
import { router } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { inquiryTone } from "@/lib/theme";
import { Chip, Empty, ErrorView, initials, Item, List, Loading, Page, SearchBar, Section, Segments } from "@/components/ui";

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
    <Page title={t.inquiry.title} refreshing={refreshing} onRefresh={refresh}>
      <SearchBar value={q} onChange={setQ} placeholder={t.common.search} />
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
      {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !items.length ? <Empty text={t.common.empty} icon="mail-open-outline" /> : (
        <Section style={{ marginTop: 16 }}>
          <List>
            {items.map((i) => (
              <Item
                key={i.id}
                initials={initials(i.name)}
                tone={inquiryTone[i.status]}
                title={i.company_name || i.name}
                subtitle={i.message.replace(/\s+/g, " ")}
                meta={`${i.company_name ? `${i.name} · ` : ""}${i.reference} · ${f.relative(i.created_at)}`}
                trailing={<Chip label={t.inquiry.status[i.status as keyof typeof t.inquiry.status] ?? i.status} tone={inquiryTone[i.status]} />}
                onPress={() => router.push(`/inquiries/${i.id}`)}
                chevron={false}
              />
            ))}
          </List>
        </Section>
      )}
    </Page>
  );
}
