import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { router, Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { api, useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmt, useT } from "@/lib/i18n";
import { routeFor } from "@/lib/push";
import { brand, type Tone, tone as tones, useColors } from "@/lib/theme";
import { Empty, ErrorView, Loading, Row, Screen, Section } from "@/components/ui";

type N = { id: number; category: string; title_de: string; body_de: string | null; title_ar: string; body_ar: string | null; link: string | null; created_at: string };
const catIcon: Record<string, { icon: "tray.full.fill" | "bag.fill" | "doc.fill" | "calendar" | "signature" | "bell.fill"; tone: Tone }> = {
  anfrage: { icon: "tray.full.fill", tone: "magenta" },
  shop: { icon: "bag.fill", tone: "violet" },
  datei: { icon: "doc.fill", tone: "amber" },
  projekt: { icon: "calendar", tone: "blue" },
  dokument: { icon: "signature", tone: "green" },
  system: { icon: "bell.fill", tone: "gray" },
};

export default function NotificationsScreen() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { refreshMe } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: N[]; lastReadAt: string | null }>("/notifications");

  // beim Öffnen als gelesen markieren
  useEffect(() => {
    if (!data) return;
    void api("/notifications", { method: "POST" }).then(() => {
      void refreshMe();
      void Notifications.setBadgeCountAsync(0).catch(() => {});
    });
  }, [data, refreshMe]);

  const lastRead = data?.lastReadAt ? new Date(data.lastReadAt).getTime() : 0;
  return (
    <>
      <Stack.Screen options={{ title: t.notif.title, headerLargeTitle: false }} />
      <Screen refreshing={refreshing} onRefresh={refresh}>
        {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.notif.empty} icon="bell.slash" /> : (
          <Section>
            {data.items.map((n, i) => {
              const meta = catIcon[n.category] ?? catIcon.system;
              const unread = new Date(n.created_at).getTime() > lastRead;
              const to = routeFor(n.link);
              return (
                <Row
                  key={n.id}
                  icon={meta.icon}
                  iconColor={tones[meta.tone]}
                  title={lang === "ar" ? n.title_ar : n.title_de}
                  subtitle={[f.relative(n.created_at), lang === "ar" ? n.body_ar : n.body_de].filter(Boolean).join(" · ")}
                  lines={2}
                  right={unread ? <Text style={{ color: brand.magenta, fontSize: 22, lineHeight: 22 }}>•</Text> : undefined}
                  onPress={to ? () => router.push(to as never) : undefined}
                  last={i === data.items.length - 1}
                />
              );
            })}
          </Section>
        )}
        {data ? (
          <Pressable onPress={reload} style={{ alignSelf: "center", padding: 14 }}>
            <Text style={{ color: c.text3 as string, fontSize: 12 }}>{data.items.length} · {t.notif.title}</Text>
          </Pressable>
        ) : null}
      </Screen>
    </>
  );
}
