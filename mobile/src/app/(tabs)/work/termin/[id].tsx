import { useState } from "react";
import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { useColors } from "@/lib/theme";
import { apptStatuses, apptWho, kindStyle, localDate, localTime, statusTone, type Appt, type ApptStatus, type Member } from "@/lib/appointments";
import { Actions, Badge, Button, Card, Chip, ErrorView, haptic, Hero, Info, initials, List, Loading, Page, Section, Txt } from "@/components/ui";
import { call, openUrl, whatsapp } from "@/components/contact";

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { data, error, loading, reload } = useApi<{ item: Appt; team: Member[] }>(`/appointments/${id}`);
  const [busy, setBusy] = useState<ApptStatus | null>(null);

  if (loading) return <Page back><Loading /></Page>;
  if (error || !data) return <Page back><ErrorView code={error ?? "error"} onRetry={reload} /></Page>;
  const a = data.item;
  const k = kindStyle[a.kind] ?? kindStyle.sonstiges;
  const phone = a.contact_phone || a.customer?.phone || null;
  const day = localDate(a.starts_at);

  const setStatus = async (status: ApptStatus) => {
    setBusy(status);
    try {
      await api(`/appointments/${id}`, { method: "PATCH", body: { status } });
      haptic.success();
      reload();
    } catch {
      haptic.error();
      Alert.alert(t.common.error);
    } finally {
      setBusy(null);
    }
  };

  const remove = () =>
    Alert.alert(t.appt.deleteAsk, a.title, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.appt.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/appointments/${id}`, { method: "DELETE" });
            haptic.success();
            router.back();
          } catch {
            Alert.alert(t.common.error);
          }
        },
      },
    ]);

  const actions = [
    ...(phone ? [{ icon: "call" as const, label: t.common.call, onPress: () => call(phone), tone: "green" as const }, { icon: "logo-whatsapp" as const, label: t.common.whatsapp, onPress: () => whatsapp(phone), tone: "green" as const }] : []),
    ...(a.location ? [{ icon: "navigate" as const, label: t.common.navigate, onPress: () => openUrl(`https://maps.apple.com/?q=${encodeURIComponent(a.location!)}`), tone: "blue" as const }] : []),
    { icon: "create-outline" as const, label: t.appt.edit, onPress: () => router.push({ pathname: "/work/termin-neu", params: { id: a.id } }), tone: "violet" as const },
  ];

  return (
    <Page back actions={[{ icon: "trash-outline", onPress: remove }]}>
      <Hero
        eyebrow={t.appt.kinds[a.kind] ?? a.kind}
        title={apptWho(a)}
        subtitle={a.title}
        chips={
          <>
            <Chip label={t.appt.status[a.status]} tone={statusTone[a.status]} />
            <Chip label={`${f.weekday(day)} · ${localTime(a.starts_at)}–${localTime(a.ends_at)}`} tone="magenta" />
          </>
        }
      />
      <Actions items={actions} />

      {a.agenda ? (
        <Section title={t.appt.agenda}>
          <Card style={{ borderLeftWidth: 4, borderLeftColor: k.color }}>
            <Txt v="body" selectable>{a.agenda}</Txt>
          </Card>
        </Section>
      ) : null}

      <Section title={t.common.details}>
        <List>
          <Info icon="time-outline" label={t.appt.when} value={`${f.weekday(day)}, ${localTime(a.starts_at)}–${localTime(a.ends_at)}`} />
          {a.location ? <Info icon="location-outline" label={t.appt.location} value={a.location} onPress={() => openUrl(`https://maps.apple.com/?q=${encodeURIComponent(a.location!)}`)} /> : null}
          {phone ? <Info icon="call-outline" label={t.common.contact} value={phone} onPress={() => call(phone)} /> : null}
          {a.customer ? <Info icon="person-outline" label={t.appt.customer} value={a.customer.company_name || a.customer.name} onPress={() => router.push(`/more/customers/${a.customer!.id}`)} last /> : null}
        </List>
      </Section>

      <Section title={t.appt.staff}>
        <Card style={{ gap: 12 }}>
          {a.staff.length ? (
            a.staff.map((e) => {
              const m = data.team.find((x) => x.email === e);
              return (
                <View key={e} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Badge initials={initials(m?.name ?? e)} tone="violet" size={34} />
                  <Txt v="bodyStrong">{m?.name ?? e}</Txt>
                </View>
              );
            })
          ) : (
            <Txt v="meta">–</Txt>
          )}
        </Card>
      </Section>

      {a.notes ? (
        <Section title={t.appt.notes}>
          <Card>
            <Txt v="body" color={c.text2} selectable>{a.notes}</Txt>
          </Card>
        </Section>
      ) : null}

      <Section title={t.common.changeStatus}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {apptStatuses
            .filter((s) => s !== a.status)
            .map((s) => (
              <Button key={s} label={t.appt.status[s]} kind={s === "abgesagt" ? "danger" : s === "erledigt" ? "accent" : "secondary"} loading={busy === s} onPress={() => void setStatus(s)} style={{ flexGrow: 1 }} />
            ))}
        </View>
      </Section>
    </Page>
  );
}
