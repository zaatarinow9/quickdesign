import { useState } from "react";
import { router, Stack } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { brand, projectTone } from "@/lib/theme";
import { Chip, Empty, ErrorView, Loading, Row, Screen, Section, Segments } from "@/components/ui";

type P = { id: string; number: string; title: string; kind: string; status: string; customer_name: string; company_name: string | null; appointment_type: string | null; appointment_date: string | null; appointment_time: string | null; site_city: string | null };
type Filter = "auftrag" | "aufgabe" | "done";

export default function Work() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const [filter, setFilter] = useState<Filter>("auftrag");
  const [q, setQ] = useState("");
  const params = new URLSearchParams(filter === "done" ? { scope: "done" } : { kind: filter });
  if (q.trim()) params.set("q", q.trim());
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: P[] }>(`/projects?${params}`);
  const items = [...(data?.items ?? [])].sort((a, b) => (a.appointment_date ?? "9999").localeCompare(b.appointment_date ?? "9999"));

  // nach Datum gruppieren
  const groups = new Map<string, P[]>();
  for (const p of items) {
    const k = filter === "done" ? "" : (p.appointment_date ?? "");
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }

  return (
    <>
      <Stack.Screen options={{ title: t.project.title, headerSearchBarOptions: { placeholder: t.common.search, onChangeText: (e) => setQ(e.nativeEvent.text), hideWhenScrolling: true } }} />
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Segments
          value={filter}
          onChange={setFilter}
          options={[
            { value: "auftrag", label: t.project.orders },
            { value: "aufgabe", label: t.project.tasks },
            { value: "done", label: t.project.scope.done },
          ]}
        />
        {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !items.length ? <Empty text={t.common.empty} icon="calendar" /> : (
          [...groups.entries()].map(([day, list]) => (
            <Section key={day || "x"} title={day ? f.weekday(day) : filter === "done" ? undefined : "—"}>
              {list.map((p, k) => (
                <Row
                  key={p.id}
                  icon={p.appointment_type === "montage" ? "hammer.fill" : p.appointment_type === "lieferung" ? "shippingbox.fill" : p.appointment_type === "abholung" ? "figure.walk" : p.appointment_type === "besorgung" ? "cart.fill" : "checklist"}
                  iconColor={p.kind === "aufgabe" ? brand.violet : brand.cyan}
                  title={p.title}
                  subtitle={[p.appointment_time?.slice(0, 5), p.company_name || p.customer_name, p.site_city, p.number].filter(Boolean).join(" · ")}
                  right={<Chip small label={t.project.status[p.status as keyof typeof t.project.status] ?? p.status} tone={projectTone[p.status]} />}
                  onPress={() => router.push(`/work/${p.id}`)}
                  last={k === list.length - 1}
                />
              ))}
            </Section>
          ))
        )}
      </Screen>
    </>
  );
}
