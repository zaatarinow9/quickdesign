import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmt, useT } from "@/lib/i18n";
import { font, space, tone, useColors } from "@/lib/theme";
import { addDays, apptKinds, kindStyle, localDate, localTime, plusMin, times, toMin, todayLocal, type Appt, type ApptKind, type Member } from "@/lib/appointments";
import { Button, Field, haptic, Icon, initials, Loading, Page, Section, Txt } from "@/components/ui";

type Customer = { id: string; name: string; company_name: string | null; phone: string | null };
const DURATIONS = [30, 60, 90, 120, 180];

function Chip({ label, on, color, onPress, leading }: { label: string; on: boolean; color?: string; onPress: () => void; leading?: React.ReactNode }) {
  const c = useColors();
  const bg = on ? (color ?? c.primary) : c.card;
  return (
    <Pressable
      onPress={() => {
        haptic.success();
        onPress();
      }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: bg, borderWidth: on ? 0 : 1, borderColor: c.line, opacity: pressed ? 0.7 : 1 })}
    >
      {leading}
      <Txt v="bodyStrong" color={on ? "#fff" : c.text} style={{ fontSize: 14 }}>{label}</Txt>
    </Pressable>
  );
}

export default function AppointmentForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { state } = useAuth();
  const me = state.status === "ready" ? state.me.email : "";
  const existing = useApi<{ item: Appt; team: Member[] }>(id ? `/appointments/${id}` : null);
  const team = useApi<{ items: Member[] }>("/team");
  const [kind, setKind] = useState<ApptKind>("beratung");
  const [date, setDate] = useState(todayLocal());
  const [start, setStart] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [staff, setStaff] = useState<string[]>(me ? [me] : []);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [freeName, setFreeName] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const filled = useRef(false);
  const results = useApi<{ items: Customer[] }>(!freeName && !customer && q.trim().length >= 2 ? `/customers?q=${encodeURIComponent(q.trim())}` : null, { refocus: false });

  // vorhandenen Termin übernehmen
  useEffect(() => {
    const a = existing.data?.item;
    if (!a || filled.current) return;
    filled.current = true;
    const s = localTime(a.starts_at);
    /* eslint-disable react-hooks/set-state-in-effect -- einmaliges Befüllen beim Bearbeiten */
    setKind(a.kind);
    setDate(localDate(a.starts_at));
    setStart(s);
    setDuration(Math.max(15, toMin(localTime(a.ends_at)) - toMin(s)));
    setStaff(a.staff);
    if (a.customer) setCustomer({ id: a.customer.id, name: a.customer.name, company_name: a.customer.company_name, phone: a.customer.phone });
    else if (a.contact_name) {
      setFreeName(true);
      setContactName(a.contact_name);
    }
    setContactPhone(a.contact_phone ?? "");
    setTitle(a.title);
    setAgenda(a.agenda ?? "");
    setLocation(a.location ?? "");
    setNotes(a.notes ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [existing.data]);

  if (id && existing.loading) return <Page back><Loading /></Page>;
  const members = team.data?.items ?? existing.data?.team ?? [];
  const days = Array.from({ length: 60 }, (_, i) => addDays(todayLocal(), i));
  if (!days.includes(date)) days.unshift(date);
  const end = plusMin(start, duration);
  const who = customer ? customer.company_name || customer.name : contactName.trim();

  const save = async () => {
    if (!who) return Alert.alert(t.appt.needWho);
    setBusy(true);
    try {
      const body = {
        title: title.trim() || `${t.appt.kinds[kind]} · ${who}`,
        kind,
        date,
        start,
        end,
        staff,
        customerId: freeName ? null : customer?.id ?? null,
        contactName: freeName ? contactName.trim() : null,
        contactPhone: contactPhone.trim() || null,
        location: location.trim() || null,
        agenda: agenda.trim() || null,
        notes: notes.trim() || null,
      };
      const r = await api<{ id: string; conflicts?: string[] }>(id ? `/appointments/${id}` : "/appointments", { method: id ? "PATCH" : "POST", body });
      haptic.success();
      if (r.conflicts?.length) {
        const names = r.conflicts.map((e) => members.find((m) => m.email === e)?.name ?? e).join(", ");
        Alert.alert(t.appt.conflict, names);
      }
      if (id) router.back();
      else router.replace(`/work/termin/${r.id}`);
    } catch (e) {
      haptic.error();
      Alert.alert(t.common.error, e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page back title={id ? t.appt.edit : t.appt.new}>
      <Section title={t.appt.kind}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {apptKinds.map((k) => (
            <Chip key={k} label={t.appt.kinds[k]} on={kind === k} color={kindStyle[k].color} onPress={() => setKind(k)} leading={<Icon name={kindStyle[k].icon} size={15} color={kind === k ? "#fff" : kindStyle[k].color} />} />
          ))}
        </View>
      </Section>

      <Section title={t.appt.who} action={{ label: freeName ? t.appt.customer : t.appt.freeName, onPress: () => (setFreeName((v) => !v), setCustomer(null)) }}>
        {freeName ? (
          <View style={{ gap: 10 }}>
            <Field value={contactName} onChangeText={setContactName} placeholder={t.appt.name} />
            <Field value={contactPhone} onChangeText={setContactPhone} placeholder={t.appt.phone} keyboard="number-pad" />
          </View>
        ) : customer ? (
          <Pressable onPress={() => setCustomer(null)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: `${tone.blue}18` }}>
            <Icon name="person" size={20} color={tone.blue} />
            <Txt v="bodyStrong" style={{ flex: 1 }}>{customer.company_name || customer.name}</Txt>
            <Icon name="close-circle" size={20} color={c.text3} />
          </Pressable>
        ) : (
          <View style={{ gap: 8 }}>
            <Field value={q} onChangeText={setQ} placeholder={t.appt.searchCustomer} />
            {(results.data?.items ?? []).slice(0, 6).map((r) => (
              <Pressable key={r.id} onPress={() => (setCustomer(r), setQ(""), r.phone && !contactPhone ? setContactPhone(r.phone) : null)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: c.card, opacity: pressed ? 0.6 : 1 })}>
                <Icon name="person-outline" size={18} color={c.text2} />
                <Txt v="body" style={{ flex: 1 }}>{r.company_name || r.name}</Txt>
              </Pressable>
            ))}
          </View>
        )}
      </Section>

      <Section title={t.appt.when}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d) => {
            const on = d === date;
            const dt = new Date(`${d}T12:00:00`);
            return (
              <Pressable key={d} onPress={() => setDate(d)} style={{ width: 58, paddingVertical: 10, borderRadius: 16, alignItems: "center", backgroundColor: on ? tone.magenta : c.card, borderWidth: on ? 0 : 1, borderColor: c.line }}>
                <Txt v="caption" color={on ? "#fff" : c.text2}>{f.weekday(d).split(/[ ,،]/)[0]}</Txt>
                <Txt v="heading" color={on ? "#fff" : c.text}>{dt.getDate()}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
        <Txt v="caption" color={c.text3} style={{ marginTop: 14, marginBottom: 6 }}>{t.appt.from}</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {times.map((tm) => (
            <Chip key={tm} label={tm} on={tm === start} color={tone.magenta} onPress={() => setStart(tm)} />
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {DURATIONS.map((m) => (
            <Chip key={m} label={m < 60 ? `${m} min` : `${m / 60} h`.replace(".5", ",5")} on={duration === m} onPress={() => setDuration(m)} />
          ))}
        </View>
        <Txt v="bodyStrong" style={{ marginTop: 12 }}>
          {f.weekday(date)} · {start}–{end}
        </Txt>
      </Section>

      <Section title={t.appt.staff}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {members.map((m) => {
            const on = staff.includes(m.email);
            return (
              <Chip
                key={m.email}
                label={m.name}
                on={on}
                onPress={() => setStaff(on ? staff.filter((x) => x !== m.email) : [...staff, m.email])}
                leading={
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: on ? "rgba(255,255,255,.25)" : `${tone.violet}22`, alignItems: "center", justifyContent: "center" }}>
                    <Txt v="caption" color={on ? "#fff" : tone.violet} style={{ fontFamily: font.bold, fontSize: 10 }}>{initials(m.name)}</Txt>
                  </View>
                }
              />
            );
          })}
        </View>
      </Section>

      <Section title={t.appt.agenda}>
        <Field value={agenda} onChangeText={setAgenda} placeholder={t.appt.agendaPlaceholder} multiline />
      </Section>
      <Section title={t.appt.location}>
        <Field value={location} onChangeText={setLocation} placeholder={t.appt.locationPlaceholder} />
      </Section>
      <Section title={t.appt.titleField}>
        <Field value={title} onChangeText={setTitle} placeholder={who ? `${t.appt.kinds[kind]} · ${who}` : t.appt.titleField} />
      </Section>
      <Section title={t.appt.notes}>
        <Field value={notes} onChangeText={setNotes} placeholder="…" multiline />
      </Section>

      <View style={{ paddingHorizontal: space.page, marginTop: 24 }}>
        <Button label={id ? t.appt.save : t.appt.create} icon="checkmark" loading={busy} onPress={() => void save()} />
      </View>
    </Page>
  );
}
