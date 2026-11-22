import { useState } from "react";
import { Alert, Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { brand, fileTone, projectStatuses, projectTone, useColors } from "@/lib/theme";
import { Actions, Button, Card, Chip, ErrorView, Field, haptic, Hero, Info, Item, List, Loading, Page, pick, Section, Select, Txt } from "@/components/ui";
import { call, mail, openUrl, whatsapp } from "@/components/contact";

type Project = {
  id: string; number: string; title: string; kind: string; status: string; customer_name: string; company_name: string | null; email: string | null; phone: string | null;
  appointment_type: string | null; appointment_date: string | null; appointment_time: string | null; duration_hours: number | null;
  site_street: string | null; site_postal_code: string | null; site_city: string | null; site_contact_name: string | null; site_contact_phone: string | null;
  crew_notes: string | null; collect_amount: number | null; maps_url: string | null; navigation_url: string | null;
};
type Ev = { id: number; type: string; note: string | null; actor: string | null; created_at: string };
type F = { id: string; name: string; status: string; created_at: string };
type Data = { item: Project; events: Ev[]; files: F[]; items: { description: string; quantity: string }[]; finance: { invoiced: number; paid: number; open: number } | null };

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { data, error, loading, reload } = useApi<Data>(`/projects/${id}`);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(false);

  if (loading) return <Page back><Loading /></Page>;
  if (error || !data) return <Page back><ErrorView code={error ?? "error"} onRetry={reload} /></Page>;
  const p = data.item;
  const address = [p.site_street, [p.site_postal_code, p.site_city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const phone = p.site_contact_phone || p.phone;
  const st = (s: string) => t.project.status[s as keyof typeof t.project.status] ?? s;

  const setStatus = async (status: string) => {
    try {
      const r = await api<{ mail: string | null }>(`/projects/${id}`, { method: "PATCH", body: { status, notify: notify && !!p.email } });
      haptic.success();
      if (r.mail && r.mail !== "sent") Alert.alert(t.common.error, r.mail);
      else if (r.mail === "sent") Alert.alert(t.project.mailSent);
      void reload();
    } catch {
      haptic.error();
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api(`/projects/${id}`, { method: "POST", body: { note } });
      setNote("");
      haptic.success();
      void reload();
    } catch {
      haptic.error();
    }
    setBusy(false);
  };

  const idx = projectStatuses.indexOf(p.status as (typeof projectStatuses)[number]);

  return (
    <Page back>
      <Hero
        eyebrow={p.number}
        title={p.title}
        subtitle={p.company_name || p.customer_name}
        chips={
          <>
            <Chip label={st(p.status)} tone={projectTone[p.status]} />
            {p.appointment_type ? <Chip label={t.project.types[p.appointment_type as keyof typeof t.project.types] ?? p.appointment_type} tone="gray" /> : null}
          </>
        }
      />
      <Actions
        items={[
          ...(phone ? [{ icon: "call" as const, label: t.common.call, onPress: () => call(phone), tone: "blue" as const }] : []),
          ...(phone ? [{ icon: "logo-whatsapp" as const, label: t.common.whatsapp, onPress: () => whatsapp(phone), tone: "green" as const }] : []),
          ...(p.navigation_url ? [{ icon: "navigate" as const, label: t.common.navigate, onPress: () => openUrl(p.navigation_url!), tone: "violet" as const }] : []),
          ...(p.email ? [{ icon: "mail" as const, label: t.common.email, onPress: () => mail(p.email!, p.title), tone: "magenta" as const }] : []),
        ]}
      />

      {/* Fortschritt */}
      <Section title={t.common.status}>
        <Card padded={false}>
          <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingTop: 14 }}>
            {projectStatuses.map((s, i) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= idx ? brand.magenta : c.fill }} />)}
          </View>
          <Select icon="flag" label={t.common.changeStatus} value={st(p.status)} tone={projectTone[p.status]} onPress={() => pick(t.common.changeStatus, projectStatuses.map((s) => ({ value: s, label: st(s) })), t.common.cancel, setStatus)} />
          {p.email ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingBottom: 12 }}>
              <Txt v="meta" style={{ flex: 1 }}>{t.project.notifyCustomer}</Txt>
              <Switch value={notify} onValueChange={setNotify} trackColor={{ true: brand.magenta, false: c.fill }} />
            </View>
          ) : null}
        </Card>
      </Section>

      {p.appointment_date || address ? (
        <Section title={t.project.appointment}>
          <Card style={{ paddingVertical: 4 }}>
            {p.appointment_date ? <Info icon="time-outline" label={t.project.appointment} value={[f.weekday(p.appointment_date), p.appointment_time?.slice(0, 5), p.duration_hours ? `${p.duration_hours} h` : null].filter(Boolean).join(" · ")} last={!address && !p.site_contact_name} /> : null}
            {address ? <Info icon="location-outline" label={t.project.site} value={address} onPress={p.maps_url ? () => openUrl(p.maps_url!) : undefined} last={!p.site_contact_name} /> : null}
            {p.site_contact_name ? <Info icon="person-outline" label={t.project.contact} value={[p.site_contact_name, p.site_contact_phone].filter(Boolean).join(" · ")} onPress={p.site_contact_phone ? () => call(p.site_contact_phone!) : undefined} last /> : null}
          </Card>
        </Section>
      ) : null}

      {p.crew_notes || p.collect_amount ? (
        <Section title={t.project.crew}>
          <Card style={{ gap: 12 }}>
            {p.crew_notes ? <Txt v="body" selectable>{p.crew_notes}</Txt> : null}
            {p.collect_amount ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: `${brand.green}12`, borderRadius: 12, padding: 12 }}>
                <Txt v="label" color={brand.green}>{t.project.collect}</Txt>
                <Txt v="heading" color={brand.green}>{f.money(Number(p.collect_amount))}</Txt>
              </View>
            ) : null}
          </Card>
        </Section>
      ) : null}

      {data.items.length ? (
        <Section title={t.project.positions}>
          <Card style={{ paddingVertical: 4 }}>
            {data.items.map((it, k) => (
              <View key={k} style={{ flexDirection: "row", gap: 12, paddingVertical: 11, borderBottomWidth: k === data.items.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
                <Txt v="body" style={{ flex: 1 }}>{it.description}</Txt>
                <Txt v="label" color={c.text2}>{it.quantity}</Txt>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {data.finance ? (
        <Section title={t.project.finance}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              [t.project.invoiced, data.finance.invoiced, c.text],
              [t.project.paid, data.finance.paid, brand.green],
              [t.project.openAmount, data.finance.open, data.finance.open > 0 ? brand.amber : c.text],
            ].map(([label, v, col]) => (
              <Card key={String(label)} style={{ flex: 1, gap: 2, padding: 12 }}>
                <Txt v="caption" color={c.text3}>{String(label)}</Txt>
                <Txt v="bodyStrong" color={String(col)}>{f.money(Number(v))}</Txt>
              </Card>
            ))}
          </View>
        </Section>
      ) : null}

      {data.files.length ? (
        <Section title={t.project.files}>
          <List>
            {data.files.map((x) => (
              <Item key={x.id} icon="document-text" tone={fileTone[x.status]} title={x.name} subtitle={f.date(x.created_at)} trailing={<Chip label={t.file.status[x.status as keyof typeof t.file.status] ?? x.status} tone={fileTone[x.status]} />} onPress={() => router.push(`/files/${x.id}`)} chevron={false} />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title={t.project.addNote}>
        <Field value={note} onChangeText={setNote} placeholder={t.project.notePlaceholder} multiline />
        {note.trim() ? <Button label={t.common.save} onPress={addNote} loading={busy} style={{ marginTop: 10 }} /> : null}
      </Section>

      {data.events.length ? (
        <Section title={t.common.history}>
          <Card>
            {data.events.slice(0, 30).map((e, k, arr) => (
              <View key={e.id} style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ alignItems: "center", width: 12 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: k === 0 ? brand.magenta : c.fill, marginTop: 6 }} />
                  {k < arr.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: c.fill, marginVertical: 2 }} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: k < arr.length - 1 ? 14 : 0 }}>
                  <Txt v="body">{e.note || e.type}</Txt>
                  <Txt v="caption" color={c.text3}>{[f.dateTime(e.created_at), e.actor].filter(Boolean).join(" · ")}</Txt>
                </View>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}
    </Page>
  );
}
