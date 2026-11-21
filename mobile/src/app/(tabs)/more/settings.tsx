import { useCallback, useEffect, useState } from "react";
import { Linking, Switch } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { CATEGORIES, pushToken, registerPush } from "@/lib/push";
import { brand, useColors } from "@/lib/theme";
import { Button, Icon, Item, List, Page, Section, Txt, type IconName } from "@/components/ui";

const catIcon: Record<string, IconName> = { anfrage: "mail-unread", shop: "bag-handle", datei: "document-text", projekt: "calendar", dokument: "checkmark-done-circle" };

export default function Settings() {
  const { t, lang, setLang } = useT();
  const c = useColors();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [cats, setCats] = useState<string[]>([...CATEGORIES]);

  const load = useCallback(async () => {
    const p = await Notifications.getPermissionsAsync().catch(() => null);
    setGranted(p?.status === "granted");
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
    const next = on ? [...new Set([...cats, cat])] : cats.filter((x) => x !== cat);
    setCats(next);
    await registerPush(lang, next).catch(() => {});
  };

  return (
    <Page back title={t.settings.title}>
      <Section title={t.settings.language}>
        <List>
          <Item title="Deutsch" trailing={lang === "de" ? <Icon name="checkmark-circle" size={22} color={brand.magenta} /> : undefined} onPress={() => setLang("de")} chevron={false} />
          <Item title="العربية" trailing={lang === "ar" ? <Icon name="checkmark-circle" size={22} color={brand.magenta} /> : undefined} onPress={() => setLang("ar")} chevron={false} />
        </List>
      </Section>
      <Section title={t.settings.push}>
        <List>
          {CATEGORIES.map((cat) => (
            <Item key={cat} icon={catIcon[cat]} tone="gray" title={t.settings.categories[cat]} trailing={<Switch value={cats.includes(cat)} disabled={!granted} onValueChange={(v) => void toggle(cat, v)} trackColor={{ true: brand.magenta, false: c.fill }} />} />
          ))}
        </List>
        {granted === false ? (
          <>
            <Txt v="meta" style={{ marginTop: 10 }}>{t.settings.pushOff}</Txt>
            <Button
              label={t.settings.enable}
              kind="secondary"
              icon="notifications"
              onPress={async () => {
                const r = await registerPush(lang, cats).catch(() => "denied" as const);
                if (r !== "ok") void Linking.openSettings();
                void load();
              }}
              style={{ marginTop: 10 }}
            />
          </>
        ) : null}
      </Section>
      <Section>
        <List>
          <Item icon="information-circle" tone="gray" title={t.settings.version} value={Constants.expoConfig?.version ?? "1.0.0"} />
        </List>
      </Section>
    </Page>
  );
}
