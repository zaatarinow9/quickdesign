import { Alert, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { brand } from "@/lib/theme";
import { Card, initials, Item, List, Page, Section, Txt } from "@/components/ui";

export default function More() {
  const { t } = useT();
  const { state, signOut } = useAuth();
  const me = state.status === "ready" ? state.me : null;
  const unread = state.status === "ready" ? state.unread : 0;

  return (
    <Page title={t.more.title}>
      <Section style={{ marginTop: 14 }}>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: brand.ink, alignItems: "center", justifyContent: "center" }}>
            <Txt v="heading" color="#fff" center>{initials(me?.name || me?.email || "?")}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="heading">{me?.name || me?.email}</Txt>
            <Txt v="meta">{me ? `${t.settings.role[me.role]} · ${me.email}` : ""}</Txt>
          </View>
        </Card>
      </Section>
      <Section title={t.common.details}>
        <List>
          <Item icon="bag-handle" tone="violet" title={t.more.shop} onPress={() => router.push("/more/shop")} />
          <Item icon="people" tone="blue" title={t.more.customers} onPress={() => router.push("/more/customers")} />
          <Item icon="document-text" tone="amber" title={t.more.offers} onPress={() => router.push({ pathname: "/more/documents", params: { kind: "angebot" } })} />
          <Item icon="receipt" tone="green" title={t.more.invoices} onPress={() => router.push({ pathname: "/more/documents", params: { kind: "rechnung" } })} />
        </List>
      </Section>
      <Section title={t.settings.title}>
        <List>
          <Item icon="notifications" tone="red" title={t.more.notifications} value={unread ? String(unread) : undefined} onPress={() => router.push("/notifications")} />
          <Item icon="settings" tone="gray" title={t.more.settings} onPress={() => router.push("/more/settings")} />
        </List>
      </Section>
      <Section>
        <List>
          <Item
            icon="log-out-outline"
            tone="red"
            title={t.login.logout}
            danger
            chevron={false}
            onPress={() => Alert.alert(t.login.logout, me?.email, [{ text: t.common.cancel, style: "cancel" }, { text: t.login.logout, style: "destructive", onPress: () => void signOut() }])}
          />
        </List>
      </Section>
    </Page>
  );
}
