import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { brand, shopStatuses, shopTone, useColors } from "@/lib/theme";
import { Chip, ErrorView, haptic, Loading, pick, QuickActions, Row, Screen, Section, T } from "@/components/ui";
import { call, mail, whatsapp } from "@/components/contact";

type O = {
  id: string; number: string | null; status: string; email: string | null; name: string | null; phone: string | null; shipping_method: string | null; livemode: boolean;
  shipping_address: { line1?: string; line2?: string; postal_code?: string; city?: string; country?: string };
  items: { description?: string; quantity?: number; amount?: number }[]; amount_subtotal: number; amount_shipping: number; amount_total: number; created_at: string;
};

export default function ShopOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const f = fmt(lang);
  const c = useColors();
  const { data, error, loading, reload, setData } = useApi<{ item: O }>(`/shop/${id}`);
  if (loading) return <Screen><Loading /></Screen>;
  if (error || !data) return <Screen><ErrorView code={error ?? "error"} onRetry={reload} /></Screen>;
  const o = data.item;
  const a = o.shipping_address ?? {};
  const address = [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.country].filter(Boolean).join("\n");

  const setStatus = (status: string) =>
    api(`/shop/${id}`, { method: "PATCH", body: { status } })
      .then(() => {
        haptic.success();
        setData({ item: { ...o, status } });
      })
      .catch(() => haptic.error());

  return (
    <>
      <Stack.Screen options={{ title: o.number ?? t.shop.title, headerLargeTitle: false }} />
      <Screen>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 6 }}>
          <T size={25} weight="700">{o.name}</T>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Chip label={t.shop.status[o.status as keyof typeof t.shop.status] ?? o.status} tone={shopTone[o.status]} />
            {!o.livemode ? <Chip label={t.shop.test} tone="amber" /> : null}
            <T size={13} color={c.text2}>{f.dateTime(o.created_at)}</T>
          </View>
        </View>
        <QuickActions
          actions={[
            ...(o.phone ? [{ icon: "phone.fill" as const, label: t.common.call, onPress: () => call(o.phone!) }, { icon: "message.fill" as const, label: t.common.whatsapp, onPress: () => whatsapp(o.phone!), color: brand.green }] : []),
            ...(o.email ? [{ icon: "envelope.fill" as const, label: t.common.email, onPress: () => mail(o.email!, `Ihre Bestellung ${o.number ?? ""}`) }] : []),
          ]}
        />
        <Section>
          <Row icon="flag.fill" iconColor={brand.magenta} title={t.common.changeStatus} value={t.shop.status[o.status as keyof typeof t.shop.status]} onPress={() => pick(t.common.changeStatus, shopStatuses.map((s) => ({ value: s, label: t.shop.status[s] })), t.common.cancel, setStatus)} last />
        </Section>
        <Section title={t.shop.items}>
          {o.items.map((it, k) => (
            <Row key={k} title={it.description ?? "–"} subtitle={`${it.quantity ?? 1}×`} value={it.amount !== undefined ? f.cents(it.amount) : undefined} lines={3} last={k === o.items.length - 1} />
          ))}
        </Section>
        <Section>
          <Row title={t.shop.subtotal} value={f.cents(o.amount_subtotal)} />
          <Row title={`${t.shop.shipping}${o.shipping_method ? ` · ${o.shipping_method}` : ""}`} value={f.cents(o.amount_shipping)} lines={2} />
          <Row title={t.shop.total} value={f.cents(o.amount_total)} last />
        </Section>
        {address ? (
          <Section title={t.shop.address}>
            <View style={{ padding: 16 }}>
              <T size={16} selectable style={{ lineHeight: 23 }}>{address}</T>
            </View>
          </Section>
        ) : null}
      </Screen>
    </>
  );
}
