import { useState } from "react";
import { View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { brand, docTone, inquiryStatuses, inquiryTone, useColors } from "@/lib/theme";
import { Button, Chip, ErrorView, Field, haptic, Loading, pick, QuickActions, Row, Screen, Section, T } from "@/components/ui";
import { call, mail, whatsapp } from "@/components/contact";

type Inq = { id: string; reference: string; status: string; name: string; company_name: string | null; email: string; phone: string | null; message: string; interests: string[]; internal_notes: string | null; created_at: string; landing_page: string | null };
type Doc = { id: string; kind: string; number: string | null; status: string; gross_total: number; created_at: string };

export default function InquiryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { data, error, loading, reload, setData } = useApi<{ item: Inq; documents: Doc[] }>(`/inquiries/${id}`);
  const [draft, setNotes] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const notes = draft ?? data?.item.internal_notes ?? "";

  if (loading) return <Screen><Loading /></Screen>;
  if (error || !data) return <Screen><ErrorView code={error ?? "error"} onRetry={reload} /></Screen>;
  const i = data.item;

  const setStatus = (status: string) =>
    api(`/inquiries/${id}`, { method: "PATCH", body: { status } })
      .then(() => {
        haptic.success();
        setData({ ...data, item: { ...i, status } });
      })
      .catch(() => haptic.error());

  const saveNotes = async () => {
    setSaving(true);
    try {
      await api(`/inquiries/${id}`, { method: "PATCH", body: { internal_notes: notes } });
      haptic.success();
      setData({ ...data, item: { ...i, internal_notes: notes } });
      setNotes(null);
    } catch {
      haptic.error();
    }
    setSaving(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: i.reference, headerLargeTitle: false }} />
      <Screen>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 6 }}>
          <T size={26} weight="700">{i.name}</T>
          {i.company_name ? <T size={16} color={c.text2}>{i.company_name}</T> : null}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4 }}>
            <Chip label={t.inquiry.status[i.status as keyof typeof t.inquiry.status] ?? i.status} tone={inquiryTone[i.status]} />
            <T size={13} color={c.text2}>{f.dateTime(i.created_at)}</T>
          </View>
        </View>
        <QuickActions
          actions={[
            ...(i.phone ? [{ icon: "phone.fill" as const, label: t.common.call, onPress: () => call(i.phone!) }] : []),
            ...(i.phone ? [{ icon: "message.fill" as const, label: t.common.whatsapp, onPress: () => whatsapp(i.phone!), color: brand.green }] : []),
            { icon: "envelope.fill" as const, label: t.common.email, onPress: () => mail(i.email, `Ihre Anfrage ${i.reference}`) },
          ]}
        />
        <Section title={t.common.status}>
          <Row
            icon="flag.fill"
            iconColor={brand.magenta}
            title={t.common.changeStatus}
            value={t.inquiry.status[i.status as keyof typeof t.inquiry.status]}
            onPress={() => pick(t.common.changeStatus, inquiryStatuses.map((s) => ({ value: s, label: t.inquiry.status[s] })), t.common.cancel, setStatus)}
            last
          />
        </Section>
        <Section title={t.inquiry.message}>
          <View style={{ padding: 16 }}>
            <T size={16} selectable style={{ lineHeight: 23 }}>{i.message}</T>
          </View>
        </Section>
        {i.interests?.length ? (
          <Section title={t.inquiry.interests}>
            <View style={{ padding: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {i.interests.map((x) => <Chip key={x} label={x} tone="blue" />)}
            </View>
          </Section>
        ) : null}
        <Section title={t.common.email}>
          <Row title={i.email} onPress={() => mail(i.email)} last={!i.phone} />
          {i.phone ? <Row title={i.phone} onPress={() => call(i.phone!)} last /> : null}
        </Section>
        <Section title={t.inquiry.internal}>
          <Field value={notes} onChangeText={setNotes} placeholder={t.inquiry.internalPlaceholder} multiline />
        </Section>
        {notes !== (i.internal_notes ?? "") ? <Button label={t.common.save} onPress={saveNotes} loading={saving} style={{ marginHorizontal: 16, marginTop: 12 }} /> : null}
        {data.documents.length ? (
          <Section title={t.inquiry.documents}>
            {data.documents.map((d, k) => (
              <Row
                key={d.id}
                icon={d.kind === "rechnung" ? "doc.text.fill" : "doc.richtext.fill"}
                iconColor={d.kind === "rechnung" ? brand.green : brand.cyan}
                title={`${d.number ?? "Entwurf"}`}
                subtitle={f.date(d.created_at)}
                right={<Chip small label={t.doc.status[d.status] ?? d.status} tone={docTone(d.status)} />}
                onPress={() => router.push(`/more/documents/${d.id}`)}
                last={k === data.documents.length - 1}
              />
            ))}
          </Section>
        ) : null}
      </Screen>
    </>
  );
}
