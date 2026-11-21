import { router, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { docTone, inquiryTone, projectTone } from "@/lib/theme";
import { Actions, Card, Chip, ErrorView, Hero, Info, Item, List, Loading, Page, Section, Txt } from "@/components/ui";
import { call, mail, openUrl, whatsapp } from "@/components/contact";

type Cust = { id: string; customer_number: string; kind: string; name: string; company_name: string | null; email: string | null; phone: string | null; street: string | null; postal_code: string | null; city: string | null; website: string | null; notes: string | null };
type Data = {
  item: Cust;
  documents: { id: string; kind: string; number: string | null; status: string; title: string; gross_total: number | null; doc_date: string }[];
  projects: { id: string; number: string; title: string; status: string; appointment_date: string | null }[];
  inquiries: { id: string; reference: string; status: string; created_at: string; message: string }[];
};

export default function Customer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const { data, error, loading, reload } = useApi<Data>(`/customers/${id}`);
  if (loading) return <Page back><Loading /></Page>;
  if (error || !data) return <Page back><ErrorView code={error ?? "error"} onRetry={reload} /></Page>;
  const x = data.item;
  const address = [x.street, [x.postal_code, x.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return (
    <Page back>
      <Hero eyebrow={x.customer_number} title={x.company_name || x.name} subtitle={x.company_name ? x.name : null} chips={<Chip label={t.customer.kind[x.kind as "privat" | "firma"] ?? x.kind} tone="blue" />} />
      <Actions
        items={[
          ...(x.phone ? [{ icon: "call" as const, label: t.common.call, onPress: () => call(x.phone!), tone: "blue" as const }, { icon: "logo-whatsapp" as const, label: t.common.whatsapp, onPress: () => whatsapp(x.phone!), tone: "green" as const }] : []),
          ...(x.email ? [{ icon: "mail" as const, label: t.common.email, onPress: () => mail(x.email!), tone: "magenta" as const }] : []),
          ...(address ? [{ icon: "map" as const, label: t.common.navigate, onPress: () => openUrl(`https://maps.apple.com/?q=${encodeURIComponent(address)}`), tone: "violet" as const }] : []),
        ]}
      />
      {x.email || x.phone || address || x.website ? (
        <Section title={t.common.contact}>
          <Card style={{ paddingVertical: 4 }}>
            {x.email ? <Info icon="mail-outline" label={t.common.email} value={x.email} onPress={() => mail(x.email!)} /> : null}
            {x.phone ? <Info icon="call-outline" label={t.common.call} value={x.phone} onPress={() => call(x.phone!)} /> : null}
            {address ? <Info icon="location-outline" label={t.customer.address} value={address} /> : null}
            {x.website ? <Info icon="globe-outline" label="Web" value={x.website} onPress={() => openUrl(x.website!.startsWith("http") ? x.website! : `https://${x.website}`)} last /> : null}
          </Card>
        </Section>
      ) : null}
      {x.notes ? (
        <Section title={t.common.notes}>
          <Card>
            <Txt v="body" selectable>{x.notes}</Txt>
          </Card>
        </Section>
      ) : null}
      {data.projects.length ? (
        <Section title={t.customer.projects}>
          <List>
            {data.projects.map((p) => (
              <Item key={p.id} icon="calendar" tone="blue" title={p.title} subtitle={[p.number, p.appointment_date ? f.date(p.appointment_date) : null].filter(Boolean).join(" · ")} trailing={<Chip label={t.project.status[p.status as keyof typeof t.project.status] ?? p.status} tone={projectTone[p.status]} />} onPress={() => router.push(`/work/${p.id}`)} chevron={false} />
            ))}
          </List>
        </Section>
      ) : null}
      {data.documents.length ? (
        <Section title={t.customer.documents}>
          <List>
            {data.documents.map((d) => (
              <Item key={d.id} icon={d.kind === "rechnung" ? "receipt" : "document-text"} tone={d.kind === "rechnung" ? "green" : "amber"} title={d.number ?? d.title} subtitle={f.date(d.doc_date)} value={d.gross_total !== null ? f.money(Number(d.gross_total)) : undefined} trailing={<Chip label={t.doc.status[d.status] ?? d.status} tone={docTone(d.status)} />} onPress={() => router.push(`/more/documents/${d.id}`)} chevron={false} />
            ))}
          </List>
        </Section>
      ) : null}
      {data.inquiries.length ? (
        <Section title={t.customer.inquiries}>
          <List>
            {data.inquiries.map((q) => (
              <Item key={q.id} icon="mail-unread" tone={inquiryTone[q.status]} title={q.reference} subtitle={q.message.replace(/\s+/g, " ")} trailing={<Chip label={t.inquiry.status[q.status as keyof typeof t.inquiry.status] ?? q.status} tone={inquiryTone[q.status]} />} onPress={() => router.push(`/inquiries/${q.id}`)} chevron={false} />
            ))}
          </List>
        </Section>
      ) : null}
    </Page>
  );
}
