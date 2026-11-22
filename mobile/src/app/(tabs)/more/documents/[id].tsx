import { Share, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { docTone, space, useColors } from "@/lib/theme";
import { Button, Card, Chip, ErrorView, Hero, Info, Loading, Page, Section, Txt } from "@/components/ui";

type Doc = { id: string; kind: string; number: string | null; status: string; title: string; customer_name: string; company_name: string | null; customer_id: string | null; doc_date: string; valid_until: string | null; due_date: string | null; gross_total: number; paid_amount: number; items: { description?: string; quantity?: number; unit?: string; total?: number }[]; first_viewed_at: string | null; accepted_at: string | null; view_count: number };
type Data = { item: Doc; events: { id: number; type: string; note: string | null; actor: string | null; created_at: string }[]; pdfUrl: string | null; viewUrl: string | null };

export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { data, error, loading, reload } = useApi<Data>(`/documents/${id}`);
  if (loading) return <Page back><Loading /></Page>;
  if (error || !data) return <Page back><ErrorView code={error ?? "error"} onRetry={reload} /></Page>;
  const d = data.item;
  return (
    <Page back>
      <Hero eyebrow={`${d.kind === "rechnung" ? t.doc.invoices : t.doc.offers} · ${d.number ?? t.doc.status.entwurf}`} title={d.title} subtitle={d.company_name || d.customer_name} chips={<Chip label={t.doc.status[d.status] ?? d.status} tone={docTone(d.status)} />} />
      <Section>
        <Card style={{ alignItems: "center", gap: 2, paddingVertical: 20 }}>
          <Txt v="caption" color={c.text3}>{f.date(d.doc_date)}</Txt>
          <Txt v="display">{f.money(Number(d.gross_total))}</Txt>
        </Card>
      </Section>
      {data.pdfUrl ? (
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: space.page, marginTop: 12 }}>
          <Button label={t.doc.pdf} icon="document" onPress={() => WebBrowser.openBrowserAsync(data.pdfUrl!)} style={{ flex: 1 }} />
          {data.viewUrl ? <Button label={t.doc.share} icon="share-outline" kind="secondary" onPress={() => Share.share({ url: data.viewUrl!, message: data.viewUrl! })} style={{ flex: 1 }} /> : null}
        </View>
      ) : null}
      <Section title={t.common.details}>
        <Card style={{ paddingVertical: 4 }}>
          {d.valid_until ? <Info icon="hourglass-outline" label={t.doc.validUntil} value={f.date(d.valid_until)} /> : null}
          {d.due_date ? <Info icon="time-outline" label={t.doc.due} value={f.date(d.due_date)} /> : null}
          {d.kind === "rechnung" ? <Info icon="cash-outline" label={t.doc.paidAmount} value={f.money(Number(d.paid_amount))} /> : null}
          {d.first_viewed_at ? <Info icon="eye-outline" label={t.doc.viewed} value={`${f.dateTime(d.first_viewed_at)} · ${d.view_count}×`} /> : null}
          {d.accepted_at ? <Info icon="checkmark-done-outline" label={t.doc.accepted} value={f.dateTime(d.accepted_at)} /> : null}
          <Info icon="person-outline" label={t.customer.title} value={d.company_name || d.customer_name} onPress={d.customer_id ? () => router.push(`/more/customers/${d.customer_id}`) : undefined} last />
        </Card>
      </Section>
      {d.items?.length ? (
        <Section title={t.project.positions}>
          <Card style={{ paddingVertical: 4 }}>
            {d.items.map((it, k) => (
              <View key={k} style={{ flexDirection: "row", gap: 12, paddingVertical: 11, borderBottomWidth: k === d.items.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
                <View style={{ flex: 1 }}>
                  <Txt v="body">{it.description ?? "–"}</Txt>
                  {it.quantity !== undefined ? <Txt v="caption" color={c.text3}>{`${it.quantity} ${it.unit ?? ""}`}</Txt> : null}
                </View>
                {it.total !== undefined ? <Txt v="bodyStrong">{f.money(Number(it.total))}</Txt> : null}
              </View>
            ))}
          </Card>
        </Section>
      ) : null}
    </Page>
  );
}
