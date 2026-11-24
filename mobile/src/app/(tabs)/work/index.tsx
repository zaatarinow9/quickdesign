import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { projectTone, space } from "@/lib/theme";
import { Chip, Empty, ErrorView, Item, List, Loading, Page, SearchBar, Segments, Txt, typeIcon } from "@/components/ui";
import { Agenda } from "@/components/agenda";

type P = { id: string; number: string; title: string; kind: string; status: string; customer_name: string; company_name: string | null; appointment_type: string | null; appointment_date: string | null; appointment_time: string | null; site_city: string | null };
type Filter = "termine" | "auftrag" | "aufgabe" | "done";

export default function Work() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const [filter, setFilter] = useState<Filter>("termine");
  const [q, setQ] = useState("");
  const params = new URLSearchParams(filter === "done" ? { scope: "done" } : { kind: filter === "termine" ? "auftrag" : filter });
  if (q.trim()) params.set("q", q.trim());
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: P[] }>(filter === "termine" ? null : `/projects?${params}`);
  const items = [...(data?.items ?? [])].sort((a, b) => (a.appointment_date ?? "9999").localeCompare(b.appointment_date ?? "9999"));
  const today = new Date().toISOString().slice(0, 10);

  const groups = new Map<string, P[]>();
  for (const p of items) {
    const k = filter === "done" ? "" : (p.appointment_date ?? "");
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }

  return (
    <Page title={filter === "termine" ? t.appt.title : t.project.title} refreshing={refreshing} onRefresh={refresh} actions={[{ icon: "add", onPress: () => router.push("/work/termin-neu") }]}>
      {filter === "termine" ? null : <SearchBar value={q} onChange={setQ} placeholder={t.common.search} />}
      <Segments
        value={filter}
        onChange={setFilter}
        options={[
          { value: "termine", label: t.appt.title },
          { value: "auftrag", label: t.project.orders },
          { value: "aufgabe", label: t.project.tasks },
          { value: "done", label: t.project.scope.done },
        ]}
      />
      {filter === "termine" ? <Agenda /> : loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !items.length ? <Empty text={t.common.empty} icon="calendar-outline" /> : (
        [...groups.entries()].map(([day, list]) => (
          <View key={day || "x"} style={{ marginTop: 22, paddingHorizontal: space.page }}>
            {day ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                {day === today ? <Chip label={t.common.today} tone="magenta" /> : null}
                <Txt v="heading">{f.weekday(day)}</Txt>
              </View>
            ) : null}
            <List>
              {list.map((p) => (
                <Item
                  key={p.id}
                  icon={typeIcon(p.appointment_type)}
                  tone={p.kind === "aufgabe" ? "violet" : "blue"}
                  title={p.title}
                  subtitle={[p.company_name || p.customer_name, p.site_city].filter(Boolean).join(" · ")}
                  meta={[p.appointment_time?.slice(0, 5), p.number].filter(Boolean).join(" · ")}
                  trailing={<Chip label={t.project.status[p.status as keyof typeof t.project.status] ?? p.status} tone={projectTone[p.status]} />}
                  onPress={() => router.push(`/work/${p.id}`)}
                  chevron={false}
                />
              ))}
            </List>
          </View>
        ))
      )}
    </Page>
  );
}
