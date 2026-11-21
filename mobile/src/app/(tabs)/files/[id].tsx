import { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { brand, fileStatuses, fileTone, radius, space, useColors } from "@/lib/theme";
import { Badge, Button, Card, Chip, ErrorView, Field, haptic, Hero, Item, List, Loading, Page, pick, Section, Select, Txt } from "@/components/ui";

type FileRow = { id: string; name: string; size: number; content_type: string | null; status: string; folder: string; assigned_to: string | null; uploaded_by: string | null; message: string | null; created_at: string; project_id: string | null; width: number | null; height: number | null };
type Data = { item: FileRow; events: { id: number; type: string; note: string | null; actor: string | null; created_at: string }[]; team: { email: string; name: string }[]; url: string | null; preview: string | null };

export default function FileDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { data, error, loading, reload } = useApi<Data>(`/files/${id}`);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Page back><Loading /></Page>;
  if (error || !data) return <Page back><ErrorView code={error ?? "error"} onRetry={reload} /></Page>;
  const x = data.item;
  const note = draft ?? x.message ?? "";
  const isImage = (x.content_type ?? "").startsWith("image/");
  const img = data.preview || (isImage ? data.url : null);
  const idx = fileStatuses.indexOf(x.status as (typeof fileStatuses)[number]);
  const next = idx >= 0 && idx < fileStatuses.length - 1 ? fileStatuses[idx + 1] : null;
  const assigned = data.team.find((m) => m.email === x.assigned_to)?.name ?? x.assigned_to;
  const st = (s: string) => t.file.status[s as keyof typeof t.file.status] ?? s;

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await api(`/files/${id}`, { method: "PATCH", body });
      haptic.success();
      setDraft(null);
      await reload();
    } catch {
      haptic.error();
    }
    setBusy(false);
  };

  return (
    <Page back>
      <View style={{ paddingHorizontal: space.page, marginTop: 6 }}>
        <View style={{ borderRadius: radius.xl, overflow: "hidden", backgroundColor: c.card, alignItems: "center", justifyContent: "center", minHeight: 180 }}>
          {img ? (
            <Image source={{ uri: img }} style={{ width: "100%", aspectRatio: x.width && x.height ? Math.max(0.7, Math.min(1.8, x.width / x.height)) : 1.3 }} contentFit="contain" transition={200} />
          ) : (
            <View style={{ alignItems: "center", gap: 10, paddingVertical: 36 }}>
              <Badge icon="document-text" tone={fileTone[x.status]} size={72} />
              <Txt v="caption" color={c.text3}>{(x.name.split(".").pop() ?? "").toUpperCase()} · {f.bytes(x.size)}</Txt>
            </View>
          )}
        </View>
      </View>
      <View style={{ height: 14 }} />
      <Hero eyebrow={x.folder || undefined} title={x.name} subtitle={[f.dateTime(x.created_at), x.uploaded_by].filter(Boolean).join(" · ")} chips={<Chip label={st(x.status)} tone={fileTone[x.status]} />} />

      {/* Stationen */}
      <Section title={t.common.status}>
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Txt v="heading">{st(x.status)}</Txt>
            <Txt v="caption" color={c.text3}>{t.file.step.replace("{n}", String(idx + 1)).replace("{total}", String(fileStatuses.length))}</Txt>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {fileStatuses.map((s, i) => <View key={s} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= idx ? brand.magenta : c.fill }} />)}
          </View>
          {next ? <Button label={`${t.file.next}: ${st(next)}`} icon="arrow-forward" kind="accent" onPress={() => patch({ status: next })} loading={busy} /> : null}
        </Card>
      </Section>

      <Section>
        <List>
          <Select icon="flag" label={t.common.changeStatus} value={st(x.status)} tone={fileTone[x.status]} onPress={() => pick(t.common.changeStatus, fileStatuses.map((s) => ({ value: s, label: st(s) })), t.common.cancel, (s) => patch({ status: s }))} />
          <Select icon="person" label={t.file.assignedTo} value={assigned ?? t.file.nobody} tone="blue" onPress={() => pick(t.file.assign, [{ value: "", label: t.file.nobody }, ...data.team.map((m) => ({ value: m.email, label: m.name }))], t.common.cancel, (v) => patch({ assigned_to: v || null }))} />
          {data.url ? <Item icon="open-outline" tone="green" title={t.file.open} onPress={() => WebBrowser.openBrowserAsync(data.url!)} /> : null}
          {x.project_id ? <Item icon="calendar" tone="violet" title={t.project.title} onPress={() => router.push(`/work/${x.project_id}`)} /> : null}
        </List>
      </Section>

      <Section title={t.file.note}>
        <Field value={note} onChangeText={setDraft} placeholder="…" multiline />
        {note !== (x.message ?? "") ? <Button label={t.common.save} onPress={() => patch({ message: note })} loading={busy} style={{ marginTop: 10 }} /> : null}
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
