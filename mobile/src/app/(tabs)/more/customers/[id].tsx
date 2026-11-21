import { View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { brand, docTone, inquiryTone, projectTone, useColors } from "@/lib/theme";
import { Chip, ErrorView, Loading, QuickActions, Row, Screen, Section, T } from "@/components/ui";
import { call, mail, openUrl, whatsapp } from "@/components/contact";

type Cust = { id: string; customer_number: string; kind: string; name: string; company_name: string | null; email: string | null; phone: string | null; street: string | null; postal_code: string | null; city: string | null; country: string | null; website: string | null; notes: string | null; tags: string[] };
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
  const c = useColors();
  const { data, error, loading, reload } = useApi<Data>(`/customers/${id}`);
  if (loading) return <Screen><Loading /></Screen>;
  if (error || !data) return <Screen><ErrorView code={error ?? "error"} onRetry={reload} /></Screen>;
  const x = data.item;
  const address = [x.street, [x.postal_code, x.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return (
    <>
      <Stack.Screen options={{ title: x.customer_number, headerLargeTitle: false }} />
      <Screen>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 4 }}>
          <T size={25} weight="700">{x.company_name || x.name}</T>
          {x.company_name ? <T size={16} color={c.text2}>{x.name}</T> : null}
          <Chip label={t.customer.kind[x.kind as "privat" | "firma"] ?? x.kind} tone="blue" />
        </View>
        <QuickActions
          actions={[
            ...(x.phone ? [{ icon: "phone.fill" as const, label: t.common.call, onPress: () => call(x.phone!) }, { icon: "message.fill" as const, label: t.common.whatsapp, onPress: () => whatsapp(x.phone!), color: brand.green }] : []),
            ...(x.email ? [{ icon: "envelope.fill" as const, label: t.common.email, onPress: () => mail(x.email!) }] : []),
            ...(address ? [{ icon: "map.fill" as const, label: t.common.navigate, onPress: () => openUrl(`https://maps.apple.com/?q=${encodeURIComponent(address)}`), color: brand.cyan }] : []),
          ]}
        />
        <Section>
          {x.email ? <Row icon="envelope.fill" iconColor={brand.magenta} title={x.email} onPress={() => mail(x.email!)} /> : null}
          {x.phone ? <Row icon="phone.fill" iconColor={brand.green} title={x.phone} onPress={() => call(x.phone!)} /> : null}
          {address ? <Row icon="mappin" iconColor={brand.red} title={address} subtitle={t.customer.address} lines={2} /> : null}
          {x.website ? <Row icon="globe" iconColor={brand.cyan} title={x.website} onPress={() => openUrl(x.website!.startsWith("http") ? x.website! : `https://${x.website}`)} /> : null}
          <View />
        </Section>
        {x.notes ? (
          <Section title={t.common.notes}>
            <View style={{ padding: 16 }}>
              <T size={15} selectable style={{ lineHeight: 22 }}>{x.notes}</T>
            </View>
          </Section>
        ) : null}
        {data.projects.length ? (
          <Section title={t.customer.projects}>
            {data.projects.map((p, k) => (
              <Row key={p.id} title={p.title} subtitle={[p.number, p.appointment_date ? f.date(p.appointment_date) : null].filter(Boolean).join(" · ")} right={<Chip small label={t.project.status[p.status as keyof typeof t.project.status] ?? p.status} tone={projectTone[p.status]} />} onPress={() => router.push(`/work/${p.id}`)} last={k === data.projects.length - 1} />
            ))}
          </Section>
        ) : null}
        {data.documents.length ? (
          <Section title={t.customer.documents}>
            {data.documents.map((d, k) => (
              <Row key={d.id} icon={d.kind === "rechnung" ? "doc.text.fill" : "doc.richtext.fill"} iconColor={d.kind === "rechnung" ? brand.green : brand.amber} title={d.number ?? d.title} subtitle={f.date(d.doc_date)} value={d.gross_total !== null ? f.money(Number(d.gross_total)) : undefined} right={<Chip small label={t.doc.status[d.status] ?? d.status} tone={docTone(d.status)} />} onPress={() => router.push(`/more/documents/${d.id}`)} last={k === data.documents.length - 1} />
            ))}
          </Section>
        ) : null}
        {data.inquiries.length ? (
          <Section title={t.customer.inquiries}>
            {data.inquiries.map((q, k) => (
              <Row key={q.id} title={q.reference} subtitle={q.message.replace(/\s+/g, " ").slice(0, 90)} right={<Chip small label={t.inquiry.status[q.status as keyof typeof t.inquiry.status] ?? q.status} tone={inquiryTone[q.status]} />} onPress={() => router.push(`/inquiries/${q.id}`)} last={k === data.inquiries.length - 1} />
            ))}
          </Section>
        ) : null}
      </Screen>
    </>
  );
}
