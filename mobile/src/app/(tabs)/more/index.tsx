import { Alert, View } from "react-native";
import { router, Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { brand, useColors } from "@/lib/theme";
import { Row, Screen, Section, T } from "@/components/ui";

export default function More() {
  const { t } = useT();
  const c = useColors();
  const { state, signOut } = useAuth();
  const me = state.status === "ready" ? state.me : null;
  const initials = (me?.name || me?.email || "?").split(/[\s@.]/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  return (
    <>
      <Stack.Screen options={{ title: t.more.title }} />
      <Screen>
        <Section>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: brand.magenta, alignItems: "center", justifyContent: "center" }}>
              <T size={20} weight="700" color="#fff" style={{ textAlign: "center" }}>{initials}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={18} weight="600">{me?.name || me?.email}</T>
              <T size={14} color={c.text2}>{me ? `${t.settings.role[me.role]} · ${me.email}` : ""}</T>
            </View>
          </View>
        </Section>
        <Section>
          <Row icon="bag.fill" iconColor={brand.violet} title={t.more.shop} onPress={() => router.push("/more/shop")} />
          <Row icon="person.2.fill" iconColor={brand.cyan} title={t.more.customers} onPress={() => router.push("/more/customers")} />
          <Row icon="doc.richtext.fill" iconColor={brand.amber} title={t.more.offers} onPress={() => router.push({ pathname: "/more/documents", params: { kind: "angebot" } })} />
          <Row icon="doc.text.fill" iconColor={brand.green} title={t.more.invoices} onPress={() => router.push({ pathname: "/more/documents", params: { kind: "rechnung" } })} last />
        </Section>
        <Section>
          <Row icon="bell.fill" iconColor={brand.red} title={t.more.notifications} value={state.status === "ready" && state.unread ? String(state.unread) : undefined} onPress={() => router.push("/notifications")} />
          <Row icon="gearshape.fill" iconColor={brand.slate} title={t.more.settings} onPress={() => router.push("/more/settings")} last />
        </Section>
        <Section>
          <Row
            title={t.login.logout}
            destructive
            onPress={() => Alert.alert(t.login.logout, me?.email, [{ text: t.common.cancel, style: "cancel" }, { text: t.login.logout, style: "destructive", onPress: () => void signOut() }])}
            last
          />
        </Section>
      </Screen>
    </>
  );
}
