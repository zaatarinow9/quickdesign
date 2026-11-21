import { useCallback, useEffect, useState } from "react";
import { Linking, Switch } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { CATEGORIES, pushToken, registerPush } from "@/lib/push";
import { brand } from "@/lib/theme";
import { Button, Icon, Row, Screen, Section } from "@/components/ui";

export default function Settings() {
  const { t, lang, setLang } = useT();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [cats, setCats] = useState<string[]>([...CATEGORIES]);

  const load = useCallback(async () => {
    const p = await Notifications.getPermissionsAsync();
    setGranted(p.status === "granted");
    const token = await pushToken();
    if (token) {
      const r = await api<{ device: { categories: string[] } | null }>(`/devices?token=${encodeURIComponent(token)}`).catch(() => null);
      if (r?.device?.categories) setCats(r.device.categories);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalig Geräte-Einstellungen laden
    void load();
  }, [load]);

  const toggle = async (cat: string, on: boolean) => {
    const next = on ? [...new Set([...cats, cat])] : cats.filter((c) => c !== cat);
    setCats(next);
    await registerPush(lang, next).catch(() => {});
  };

  return (
    <>
      <Stack.Screen options={{ title: t.settings.title, headerLargeTitle: false }} />
      <Screen>
        <Section title={t.settings.language}>
          <Row title="Deutsch" right={lang === "de" ? <Check /> : undefined} onPress={() => setLang("de")} />
          <Row title="العربية" right={lang === "ar" ? <Check /> : undefined} onPress={() => setLang("ar")} last />
        </Section>
        <Section title={t.settings.push} footer={granted === false ? t.settings.pushOff : undefined}>
          {CATEGORIES.map((cat, i) => (
            <Row key={cat} title={t.settings.categories[cat]} right={<Switch value={cats.includes(cat)} disabled={!granted} onValueChange={(v) => void toggle(cat, v)} trackColor={{ true: brand.magenta }} />} last={i === CATEGORIES.length - 1} />
          ))}
        </Section>
        {granted === false ? (
          <Button
            label={t.settings.enable}
            kind="secondary"
            onPress={async () => {
              const r = await registerPush(lang, cats).catch(() => "denied" as const);
              if (r !== "ok") void Linking.openSettings();
              void load();
            }}
            style={{ marginHorizontal: 16, marginTop: 12 }}
          />
        ) : null}
        <Section>
          <Row title={t.settings.version} value={`${Constants.expoConfig?.version ?? "1.0.0"}`} last />
        </Section>
      </Screen>
    </>
  );
}

function Check() {
  return <Icon name="checkmark" size={17} color={brand.magenta} weight="semibold" />;
}
