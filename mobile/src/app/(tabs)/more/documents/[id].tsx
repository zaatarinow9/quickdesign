import { Share, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { brand, docTone, useColors } from "@/lib/theme";
import { Button, Chip, ErrorView, Loading, Row, Screen, Section, T } from "@/components/ui";

type Doc = { id: string; kind: string; number: string | null; status: string; title: string; customer_name: string; company_name: string | null; customer_id: string | null; doc_date: string; valid_until: string | null; due_date: string | null; gross_total: number; net_total: number; paid_amount: number; items: { description?: string; quantity?: number; unit?: string; total?: number }[]; first_viewed_at: string | null; accepted_at: string | null; view_count: number };
type Data = { item: Doc; events: { id: number; type: string; note: string | null; actor: string | null; created_at: string }[]; pdfUrl: string | null; viewUrl: string | null };

export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { data, error, loading, reload } = useApi<Data>(`/documents/${id}`);
  if (loading) return <Screen><Loading /></Screen>;
  if (error || !data) return <Screen><ErrorView code={error ?? "error"} onRetry={reload} /></Screen>;
  const d = data.item;
  return (
    <>
      <Stack.Screen options={{ title: d.number ?? t.doc.status.entwurf, headerLargeTitle: false }} />
      <Screen>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 6 }}>
          <T size={14} color={c.text2}>{d.kind === "rechnung" ? t.doc.invoices : t.doc.offers}</T>
          <T size={24} weight="700">{d.title}</T>
          <T size={16} color={c.text2}>{d.company_name || d.customer_name}</T>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 2 }}>
            <Chip label={t.doc.status[d.status] ?? d.status} tone={docTone(d.status)} />
            <T size={22} weight="700" style={{ marginStart: "auto" }}>{f.money(Number(d.gross_total))}</T>
          </View>
        </View>
        {data.pdfUrl ? (
          <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 16 }}>
            <Button label={t.doc.pdf} icon="doc.fill" onPress={() => WebBrowser.openBrowserAsync(data.pdfUrl!)} style={{ flex: 1 }} />
            {data.viewUrl ? <Button label={t.doc.share} icon="square.and.arrow.up" kind="secondary" onPress={() => Share.share({ url: data.viewUrl!, message: data.viewUrl! })} style={{ flex: 1 }} /> : null}
          </View>
        ) : null}
        <Section>
          <Row icon="calendar" iconColor={brand.cyan} title={f.date(d.doc_date)} />
          {d.valid_until ? <Row icon="hourglass" iconColor={brand.amber} title={t.doc.validUntil} value={f.date(d.valid_until)} /> : null}
          {d.due_date ? <Row icon="clock.fill" iconColor={brand.amber} title={t.doc.due} value={f.date(d.due_date)} /> : null}
          {d.kind === "rechnung" ? <Row icon="eurosign.circle.fill" iconColor={brand.green} title={t.doc.paidAmount} value={f.money(Number(d.paid_amount))} /> : null}
          {d.first_viewed_at ? <Row icon="eye.fill" iconColor={brand.violet} title={t.doc.viewed} value={`${f.dateTime(d.first_viewed_at)} · ${d.view_count}×`} /> : null}
          {d.accepted_at ? <Row icon="checkmark.seal.fill" iconColor={brand.green} title={t.doc.accepted} value={f.dateTime(d.accepted_at)} /> : null}
          {d.customer_id ? <Row icon="person.fill" iconColor={brand.slate} title={d.company_name || d.customer_name} onPress={() => router.push(`/more/customers/${d.customer_id}`)} last /> : <View />}
        </Section>
        {d.items?.length ? (
          <Section title={t.project.positions}>
            {d.items.map((it, k) => (
              <Row key={k} title={it.description ?? "–"} subtitle={it.quantity !== undefined ? `${it.quantity} ${it.unit ?? ""}` : undefined} value={it.total !== undefined ? f.money(Number(it.total)) : undefined} lines={3} last={k === d.items.length - 1} />
            ))}
          </Section>
        ) : null}
        {data.events.length ? (
          <Section title={t.common.history}>
            {data.events.slice(0, 20).map((e, k) => <Row key={e.id} title={e.note || e.type} subtitle={[f.dateTime(e.created_at), e.actor].filter(Boolean).join(" · ")} last={k === Math.min(20, data.events.length) - 1} />)}
          </Section>
        ) : null}
      </Screen>
    </>
  );
}
