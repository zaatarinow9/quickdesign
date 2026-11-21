import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { docTone, inquiryStatuses, inquiryTone } from "@/lib/theme";
import { Actions, Button, Card, Chip, ErrorView, Field, haptic, Hero, Info, Item, List, Loading, Page, pick, Section, Select, Txt } from "@/components/ui";
import { call, mail, whatsapp } from "@/components/contact";

type Inq = { id: string; reference: string; status: string; name: string; company_name: string | null; email: string; phone: string | null; message: string; interests: string[]; internal_notes: string | null; created_at: string };
type Doc = { id: string; kind: string; number: string | null; status: string; gross_total: number; created_at: string };

export default function InquiryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const { data, error, loading, reload, setData } = useApi<{ item: Inq; documents: Doc[] }>(`/inquiries/${id}`);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <Page back><Loading /></Page>;
  if (error || !data) return <Page back><ErrorView code={error ?? "error"} onRetry={reload} /></Page>;
  const i = data.item;
  const notes = draft ?? i.internal_notes ?? "";
  const statusLabel = (s: string) => t.inquiry.status[s as keyof typeof t.inquiry.status] ?? s;

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
      setDraft(null);
    } catch {
      haptic.error();
    }
    setSaving(false);
  };

  return (
    <Page back>
      <Hero
        eyebrow={`${i.reference} · ${f.dateTime(i.created_at)}`}
        title={i.name}
        subtitle={i.company_name}
        chips={<Chip label={statusLabel(i.status)} tone={inquiryTone[i.status]} />}
      />
      <Actions
        items={[
          ...(i.phone ? [{ icon: "call" as const, label: t.common.call, onPress: () => call(i.phone!), tone: "blue" as const }] : []),
          ...(i.phone ? [{ icon: "logo-whatsapp" as const, label: t.common.whatsapp, onPress: () => whatsapp(i.phone!), tone: "green" as const }] : []),
          { icon: "mail" as const, label: t.common.email, onPress: () => mail(i.email, `Ihre Anfrage ${i.reference}`), tone: "magenta" as const },
        ]}
      />
      <Section>
        <Card padded={false}>
          <Select icon="flag" label={t.common.status} value={statusLabel(i.status)} tone={inquiryTone[i.status]} onPress={() => pick(t.common.changeStatus, inquiryStatuses.map((s) => ({ value: s, label: statusLabel(s) })), t.common.cancel, setStatus)} />
        </Card>
      </Section>
      <Section title={t.inquiry.message}>
        <Card>
          <Txt v="body" selectable>{i.message}</Txt>
          {i.interests?.length ? (
            <Txt v="meta" style={{ marginTop: 12 }}>{`${t.inquiry.interests}: ${i.interests.join(", ")}`}</Txt>
          ) : null}
        </Card>
      </Section>
      <Section title={t.common.contact}>
        <Card style={{ paddingVertical: 4 }}>
          <Info icon="mail-outline" label={t.common.email} value={i.email} onPress={() => mail(i.email)} last={!i.phone} />
          {i.phone ? <Info icon="call-outline" label={t.common.call} value={i.phone} onPress={() => call(i.phone!)} last /> : null}
        </Card>
      </Section>
      <Section title={t.inquiry.internal}>
        <Field value={notes} onChangeText={setDraft} placeholder={t.inquiry.internalPlaceholder} multiline />
        {notes !== (i.internal_notes ?? "") ? <Button label={t.common.save} onPress={saveNotes} loading={saving} style={{ marginTop: 10 }} /> : null}
      </Section>
      {data.documents.length ? (
        <Section title={t.inquiry.documents}>
          <List>
            {data.documents.map((d) => (
              <Item key={d.id} icon={d.kind === "rechnung" ? "receipt" : "document-text"} tone={d.kind === "rechnung" ? "green" : "blue"} title={d.number ?? t.doc.status.entwurf} subtitle={f.date(d.created_at)} trailing={<Chip label={t.doc.status[d.status] ?? d.status} tone={docTone(d.status)} />} onPress={() => router.push(`/more/documents/${d.id}`)} chevron={false} />
            ))}
          </List>
        </Section>
      ) : null}
    </Page>
  );
}
