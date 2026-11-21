import { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { brand, fileStatuses, fileTone, useColors } from "@/lib/theme";
import { Button, Chip, ErrorView, Field, haptic, Loading, pick, Row, Screen, Section, T } from "@/components/ui";

type FileRow = { id: string; name: string; size: number; content_type: string | null; status: string; folder: string; assigned_to: string | null; uploaded_by: string | null; message: string | null; created_at: string; project_id: string | null; width: number | null; height: number | null };
type Data = { item: FileRow; events: { id: number; type: string; note: string | null; actor: string | null; created_at: string }[]; team: { email: string; name: string }[]; url: string | null; preview: string | null };

export default function FileDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { data, error, loading, reload } = useApi<Data>(`/files/${id}`);
  const [draft, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const note = draft ?? data?.item.message ?? "";

  if (loading) return <Screen><Loading /></Screen>;
  if (error || !data) return <Screen><ErrorView code={error ?? "error"} onRetry={reload} /></Screen>;
  const x = data.item;
  const isImage = (x.content_type ?? "").startsWith("image/");
  const img = data.preview || (isImage ? data.url : null);
  const idx = fileStatuses.indexOf(x.status as (typeof fileStatuses)[number]);
  const next = idx >= 0 && idx < fileStatuses.length - 1 ? fileStatuses[idx + 1] : null;
  const assignedName = data.team.find((m) => m.email === x.assigned_to)?.name ?? x.assigned_to;

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await api(`/files/${id}`, { method: "PATCH", body });
      haptic.success();
      setNote(null);
      await reload();
    } catch {
      haptic.error();
    }
    setBusy(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: t.file.title, headerLargeTitle: false }} />
      <Screen>
        {img ? (
          <View style={{ marginHorizontal: 16, marginTop: 8, borderRadius: 16, overflow: "hidden", backgroundColor: c.card as string }}>
            <Image source={{ uri: img }} style={{ width: "100%", aspectRatio: x.width && x.height ? Math.max(0.6, Math.min(1.8, x.width / x.height)) : 1.2 }} contentFit="contain" transition={200} />
          </View>
        ) : null}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 6 }}>
          <T size={21} weight="700" selectable>{x.name}</T>
          <T size={13} color={c.text2}>{[x.folder, f.bytes(x.size), f.dateTime(x.created_at), x.uploaded_by].filter(Boolean).join(" · ")}</T>
          <Chip label={t.file.status[x.status as keyof typeof t.file.status] ?? x.status} tone={fileTone[x.status]} />
        </View>

        {/* Fortschritt durch die Stationen */}
        <View style={{ flexDirection: "row", gap: 4, marginHorizontal: 20, marginTop: 14 }}>
          {fileStatuses.map((s, i) => (
            <View key={s} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= idx ? brand.magenta : (c.fill as string) }} />
          ))}
        </View>
        {next ? <Button label={`${t.file.next}: ${t.file.status[next]}`} icon="arrow.forward.circle.fill" onPress={() => patch({ status: next })} loading={busy} style={{ marginHorizontal: 16, marginTop: 16 }} /> : null}

        <Section>
          <Row icon="flag.fill" iconColor={brand.magenta} title={t.common.changeStatus} value={t.file.status[x.status as keyof typeof t.file.status]} onPress={() => pick(t.common.changeStatus, fileStatuses.map((s) => ({ value: s, label: t.file.status[s] })), t.common.cancel, (s) => patch({ status: s }))} />
          <Row
            icon="person.crop.circle.fill"
            iconColor={brand.cyan}
            title={t.file.assignedTo}
            value={assignedName ?? t.file.nobody}
            onPress={() => pick(t.file.assign, [{ value: "", label: t.file.nobody }, ...data.team.map((m) => ({ value: m.email, label: m.name }))], t.common.cancel, (v) => patch({ assigned_to: v || null }))}
          />
          {data.url ? <Row icon="arrow.up.right.square.fill" iconColor={brand.green} title={t.file.open} onPress={() => WebBrowser.openBrowserAsync(data.url!)} /> : null}
          {x.project_id ? <Row icon="calendar" iconColor={brand.violet} title={t.project.title} onPress={() => router.push(`/work/${x.project_id}`)} last /> : <View />}
        </Section>

        <Section title={t.file.note}>
          <Field value={note} onChangeText={setNote} placeholder="…" multiline />
        </Section>
        {note !== (x.message ?? "") ? <Button label={t.common.save} onPress={() => patch({ message: note })} loading={busy} style={{ marginHorizontal: 16, marginTop: 12 }} /> : null}

        {data.events.length ? (
          <Section title={t.common.history}>
            {data.events.slice(0, 30).map((e, k) => (
              <Row key={e.id} title={e.note || e.type} subtitle={[f.dateTime(e.created_at), e.actor].filter(Boolean).join(" · ")} last={k === Math.min(30, data.events.length) - 1} />
            ))}
          </Section>
        ) : null}
      </Screen>
    </>
  );
}
