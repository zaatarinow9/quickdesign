import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { pickFile, uploadFile } from "@/lib/upload";
import { fileStatuses, fileTone, radius, space, tone as tones, useColors } from "@/lib/theme";
import { Badge, Chip, Empty, ErrorView, haptic, Loading, Page, pick, SearchBar, Segments, shadow, Txt } from "@/components/ui";

type F = { id: string; name: string; size: number; status: string; folder: string; assigned_to: string | null; uploaded_by: string | null; created_at: string; thumb: string | null; content_type?: string | null };
type Counts = Record<string, number>;

const kindIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "heic", "tif", "tiff"].includes(ext)) return "image" as const;
  if (ext === "pdf") return "document-text" as const;
  if (["ai", "eps", "svg", "psd", "indd"].includes(ext)) return "color-palette" as const;
  if (["mp4", "mov"].includes(ext)) return "videocam" as const;
  return "document" as const;
};

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
    pick(
      t.file.upload,
      [
        { value: "camera" as const, label: t.file.uploadPhoto },
        { value: "library" as const, label: t.file.uploadLibrary },
        { value: "document" as const, label: t.file.uploadDocument },
      ],
      t.common.cancel,
      async (src) => {
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
      },
    );

  return (
    <Page title={t.file.title} actions={[{ icon: "cloud-upload-outline", onPress: upload, loading: uploading }]} refreshing={refreshing} onRefresh={refresh}>
      <SearchBar value={q} onChange={setQ} placeholder={t.common.search} />
      <Segments
        value={filter}
        onChange={setFilter}
        options={[
          { value: "aktiv", label: t.common.open, count: data?.counts.aktiv },
          { value: "mine", label: t.file.mine },
          ...fileStatuses.map((s) => ({ value: s, label: t.file.status[s], count: data?.counts[s] })),
        ]}
      />
      {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.common.empty} icon="folder-open-outline" /> : (
        <View style={{ paddingHorizontal: space.page, marginTop: 16, gap: 10 }}>
          {data.items.map((x) => {
            const idx = fileStatuses.indexOf(x.status as (typeof fileStatuses)[number]);
            return (
              <Pressable key={x.id} onPress={() => router.push(`/files/${x.id}`)} style={({ pressed }) => ({ flexDirection: "row", gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: c.card, opacity: pressed ? 0.75 : 1, ...shadow(c.dark) })}>
                <View style={{ width: 58, height: 58, borderRadius: 14, overflow: "hidden", backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}>
                  {x.thumb ? <Image source={{ uri: x.thumb }} style={{ width: 58, height: 58 }} contentFit="cover" transition={150} /> : <Badge icon={kindIcon(x.name)} tone={fileTone[x.status] ?? "gray"} size={58} />}
                </View>
                <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>
                  <Txt v="bodyStrong" lines={1}>{x.name}</Txt>
                  <Txt v="caption" color={c.text3} lines={1}>{[x.folder, f.relative(x.created_at), f.bytes(x.size)].filter(Boolean).join(" · ")}</Txt>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Chip label={t.file.status[x.status as keyof typeof t.file.status] ?? x.status} tone={fileTone[x.status]} />
                    <View style={{ flex: 1, flexDirection: "row", gap: 3 }}>
                      {fileStatuses.map((s, i) => <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= idx ? tones[fileTone[x.status] ?? "gray"] : c.fill }} />)}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Page>
  );
}
