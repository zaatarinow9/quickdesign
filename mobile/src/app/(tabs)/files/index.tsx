import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { pickFile, uploadFile } from "@/lib/upload";
import { brand, fileStatuses, fileTone, tone as tones, useColors } from "@/lib/theme";
import { Chip, Empty, ErrorView, haptic, Icon, Loading, pick, Screen, Section, Segments, T } from "@/components/ui";

type F = { id: string; name: string; size: number; status: string; folder: string; assigned_to: string | null; uploaded_by: string | null; created_at: string; thumb: string | null; message: string | null };
type Counts = Record<string, number>;

export default function Files() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const params = useLocalSearchParams<{ mine?: string }>();
  const [filter, setFilter] = useState<string>(params.mine ? "mine" : "aktiv");
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const qs = new URLSearchParams();
  if (filter === "mine") qs.set("mine", "1");
  else if (filter !== "aktiv") qs.set("status", filter);
  if (q.trim()) qs.set("q", q.trim());
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: F[]; counts: Counts }>(`/files?${qs}`);

  const upload = () =>
    pick(t.file.upload, [
      { value: "camera" as const, label: t.file.uploadPhoto },
      { value: "library" as const, label: t.file.uploadLibrary },
      { value: "document" as const, label: t.file.uploadDocument },
    ], t.common.cancel, async (src) => {
      const file = await pickFile(src);
      if (!file) return;
      setUploading(true);
      try {
        await uploadFile(file);
        haptic.success();
        void reload();
      } catch {
        haptic.error();
        Alert.alert(t.common.error);
      }
      setUploading(false);
    });

  return (
    <>
      <Stack.Screen
        options={{
          title: t.file.title,
          headerSearchBarOptions: { placeholder: t.common.search, onChangeText: (e) => setQ(e.nativeEvent.text), hideWhenScrolling: true },
          headerRight: () => (
            <Pressable onPress={upload} hitSlop={10} disabled={uploading} style={{ padding: 4 }}>
              {uploading ? <ActivityIndicator /> : <Icon name="plus.circle.fill" size={24} color={brand.magenta} />}
            </Pressable>
          ),
        }}
      />
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Segments
          value={filter}
          onChange={setFilter}
          options={[
            { value: "aktiv", label: t.common.open, count: data?.counts.aktiv },
            { value: "mine", label: t.file.mine },
            ...fileStatuses.map((s) => ({ value: s, label: t.file.status[s], count: data?.counts[s] })),
          ]}
        />
        {uploading ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginHorizontal: 20, marginTop: 14 }}>
            <ActivityIndicator />
            <T size={14} color={c.text2}>{t.file.uploading}</T>
          </View>
        ) : null}
        {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.common.empty} icon="folder" /> : (
          <Section>
            {data.items.map((x, k) => (
              <Pressable key={x.id} onPress={() => router.push(`/files/${x.id}`)} style={({ pressed }) => ({ backgroundColor: pressed ? (c.fill as string) : "transparent" })}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingStart: 12, paddingVertical: 10 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", backgroundColor: c.fill as string, alignItems: "center", justifyContent: "center" }}>
                    {x.thumb ? <Image source={{ uri: x.thumb }} style={{ width: 52, height: 52 }} contentFit="cover" transition={150} /> : <Icon name="doc.fill" size={22} color={tones[fileTone[x.status] ?? "gray"]} />}
                  </View>
                  <View style={{ flex: 1, gap: 3, paddingEnd: 12, borderBottomWidth: k === data.items.length - 1 ? 0 : 0.5, borderBottomColor: c.line as string, paddingBottom: 10, marginBottom: -10 }}>
                    <T size={15} weight="500" lines={1}>{x.name}</T>
                    <T size={12} color={c.text2} lines={1}>{[x.folder, f.relative(x.created_at), f.bytes(x.size)].filter(Boolean).join(" · ")}</T>
                    <Chip small label={t.file.status[x.status as keyof typeof t.file.status] ?? x.status} tone={fileTone[x.status]} />
                  </View>
                </View>
              </Pressable>
            ))}
          </Section>
        )}
      </Screen>
    </>
  );
}
