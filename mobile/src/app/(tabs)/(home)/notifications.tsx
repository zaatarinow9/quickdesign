import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { View } from "react-native";
import { api, useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEMO } from "@/lib/demo";
import { fmt, useT } from "@/lib/i18n";
import { routeFor } from "@/lib/push";
import { brand, type Tone } from "@/lib/theme";
import { Empty, ErrorView, Item, List, Loading, Page, Section, type IconName } from "@/components/ui";

type N = { id: number; category: string; title_de: string; body_de: string | null; title_ar: string; body_ar: string | null; link: string | null; created_at: string };
const cat: Record<string, { icon: IconName; tone: Tone }> = {
  anfrage: { icon: "mail-unread", tone: "magenta" },
  shop: { icon: "bag-handle", tone: "violet" },
  datei: { icon: "document-text", tone: "amber" },
  projekt: { icon: "calendar", tone: "blue" },
  dokument: { icon: "checkmark-done-circle", tone: "green" },
  system: { icon: "notifications", tone: "gray" },
};

export default function NotificationsScreen() {
  const { t, lang } = useT();
  const f = fmt(lang);
  const { refreshMe } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useApi<{ items: N[]; lastReadAt: string | null }>("/notifications");

  useEffect(() => {
    if (!data || DEMO) return;
    void api("/notifications", { method: "POST" }).then(() => {
      void refreshMe();
      void Notifications.setBadgeCountAsync(0).catch(() => {});
    });
  }, [data, refreshMe]);

  const lastRead = data?.lastReadAt ? new Date(data.lastReadAt).getTime() : 0;
  const isNew = (n: N) => new Date(n.created_at).getTime() > lastRead;
  const fresh = data?.items.filter(isNew) ?? [];
  const old = data?.items.filter((n) => !isNew(n)) ?? [];

  const row = (n: N) => {
    const m = cat[n.category] ?? cat.system;
    const to = routeFor(n.link);
    return (
      <Item
        key={n.id}
        icon={m.icon}
        tone={m.tone}
        title={lang === "ar" ? n.title_ar : n.title_de}
        subtitle={lang === "ar" ? n.body_ar : n.body_de}
        meta={f.relative(n.created_at)}
        lines={2}
        trailing={isNew(n) ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: brand.magenta }} /> : undefined}
        onPress={to ? () => router.push(to as never) : undefined}
      />
    );
  };

  return (
    <Page back title={t.notif.title} refreshing={refreshing} onRefresh={refresh}>
      {loading ? <Loading /> : error && !data ? <ErrorView code={error} onRetry={reload} /> : !data?.items.length ? <Empty text={t.notif.empty} icon="notifications-off-outline" /> : (
        <>
          {fresh.length ? (
            <Section title={t.common.fresh}>
              <List>{fresh.map(row)}</List>
            </Section>
          ) : null}
          {old.length ? (
            <Section title={t.common.history}>
              <List>{old.map(row)}</List>
            </Section>
          ) : null}
        </>
      )}
    </Page>
  );
}
