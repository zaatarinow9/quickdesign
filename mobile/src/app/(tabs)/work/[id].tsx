import { useState } from "react";
import { Alert, Switch, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { brand, fileTone, projectStatuses, projectTone, useColors } from "@/lib/theme";
import { Button, Chip, ErrorView, Field, haptic, Loading, pick, QuickActions, Row, Screen, Section, T } from "@/components/ui";
import { call, mail, openUrl, whatsapp } from "@/components/contact";

type Project = {
  id: string; number: string; title: string; kind: string; status: string; customer_name: string; company_name: string | null; email: string | null; phone: string | null;
  appointment_type: string | null; appointment_date: string | null; appointment_time: string | null; duration_hours: number | null;
  site_street: string | null; site_postal_code: string | null; site_city: string | null; site_contact_name: string | null; site_contact_phone: string | null;
  crew_notes: string | null; collect_amount: number | null; internal_notes: string | null; value_gross: number | null; maps_url: string | null; navigation_url: string | null;
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

  if (loading) return <Screen><Loading /></Screen>;
  if (error || !data) return <Screen><ErrorView code={error ?? "error"} onRetry={reload} /></Screen>;
  const p = data.item;
  const address = [p.site_street, [p.site_postal_code, p.site_city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const phone = p.site_contact_phone || p.phone;

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

  return (
    <>
      <Stack.Screen options={{ title: p.number, headerLargeTitle: false }} />
      <Screen>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 6 }}>
          <T size={25} weight="700">{p.title}</T>
          <T size={16} color={c.text2}>{p.company_name || p.customer_name}</T>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4 }}>
            <Chip label={t.project.status[p.status as keyof typeof t.project.status] ?? p.status} tone={projectTone[p.status]} />
            {p.appointment_type ? <Chip label={t.project.types[p.appointment_type as keyof typeof t.project.types] ?? p.appointment_type} tone="blue" /> : null}
          </View>
        </View>
        <QuickActions
          actions={[
            ...(phone ? [{ icon: "phone.fill" as const, label: t.common.call, onPress: () => call(phone) }] : []),
            ...(phone ? [{ icon: "message.fill" as const, label: t.common.whatsapp, onPress: () => whatsapp(phone), color: brand.green }] : []),
            ...(p.navigation_url ? [{ icon: "location.fill" as const, label: t.common.navigate, onPress: () => openUrl(p.navigation_url!), color: brand.cyan }] : []),
            ...(p.email ? [{ icon: "envelope.fill" as const, label: t.common.email, onPress: () => mail(p.email!, p.title) }] : []),
          ]}
        />

        <Section title={t.common.status} footer={p.email ? undefined : undefined}>
          <Row icon="flag.fill" iconColor={brand.magenta} title={t.common.changeStatus} value={t.project.status[p.status as keyof typeof t.project.status]} onPress={() => pick(t.common.changeStatus, projectStatuses.map((s) => ({ value: s, label: t.project.status[s] })), t.common.cancel, setStatus)} last={!p.email} />
          {p.email ? <Row icon="envelope.badge.fill" iconColor={brand.cyan} title={t.project.notifyCustomer} right={<Switch value={notify} onValueChange={setNotify} trackColor={{ true: brand.magenta }} />} last /> : null}
        </Section>

        {p.appointment_date || address ? (
          <Section title={t.project.appointment}>
            {p.appointment_date ? <Row icon="calendar" iconColor={brand.cyan} title={f.weekday(p.appointment_date)} value={[p.appointment_time?.slice(0, 5), p.duration_hours ? `${p.duration_hours} h` : null].filter(Boolean).join(" · ") || undefined} last={!address} /> : null}
            {address ? <Row icon="mappin.and.ellipse" iconColor={brand.red} title={address} subtitle={t.project.site} onPress={p.maps_url ? () => openUrl(p.maps_url!) : undefined} last={!p.site_contact_name} lines={2} /> : null}
            {p.site_contact_name ? <Row icon="person.fill" iconColor={brand.slate} title={p.site_contact_name} subtitle={t.project.contact} value={p.site_contact_phone ?? undefined} onPress={p.site_contact_phone ? () => call(p.site_contact_phone!) : undefined} last /> : null}
          </Section>
        ) : null}

        {p.crew_notes || p.collect_amount ? (
          <Section title={t.project.crew}>
            {p.crew_notes ? <View style={{ padding: 16 }}><T size={16} selectable style={{ lineHeight: 23 }}>{p.crew_notes}</T></View> : null}
            {p.collect_amount ? <Row icon="eurosign.circle.fill" iconColor={brand.green} title={t.project.collect} value={f.money(Number(p.collect_amount))} last /> : null}
          </Section>
        ) : null}

        {data.items.length ? (
          <Section title={t.project.positions}>
            {data.items.map((it, k) => <Row key={k} title={it.description} value={it.quantity} lines={3} last={k === data.items.length - 1} />)}
          </Section>
        ) : null}

        {data.finance ? (
          <Section title={t.project.finance}>
            <Row title={t.project.invoiced} value={f.money(data.finance.invoiced)} />
            <Row title={t.project.paid} value={f.money(data.finance.paid)} />
            <Row title={t.project.openAmount} value={f.money(data.finance.open)} last />
          </Section>
        ) : null}

        {data.files.length ? (
          <Section title={t.project.files}>
            {data.files.map((x, k) => (
              <Row key={x.id} icon="doc.fill" iconColor={brand.amber} title={x.name} subtitle={f.date(x.created_at)} right={<Chip small label={t.file.status[x.status as keyof typeof t.file.status] ?? x.status} tone={fileTone[x.status]} />} onPress={() => router.push(`/files/${x.id}`)} last={k === data.files.length - 1} />
            ))}
          </Section>
        ) : null}

        <Section title={t.project.addNote}>
          <Field value={note} onChangeText={setNote} placeholder={t.project.notePlaceholder} multiline />
        </Section>
        {note.trim() ? <Button label={t.common.save} onPress={addNote} loading={busy} style={{ marginHorizontal: 16, marginTop: 12 }} /> : null}

        {data.events.length ? (
          <Section title={t.common.history}>
            {data.events.slice(0, 30).map((e, k) => (
              <Row key={e.id} title={e.note || e.type} subtitle={[f.dateTime(e.created_at), e.actor].filter(Boolean).join(" · ")} lines={3} last={k === Math.min(data.events.length, 30) - 1} />
            ))}
          </Section>
        ) : null}
      </Screen>
    </>
  );
}
