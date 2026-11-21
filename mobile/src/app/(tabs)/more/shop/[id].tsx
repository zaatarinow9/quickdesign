import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api, useApi } from "@/lib/api";
import { fmt, useT } from "@/lib/i18n";
import { shopStatuses, shopTone, useColors } from "@/lib/theme";
import { Actions, Card, Chip, ErrorView, haptic, Hero, Loading, Page, pick, Section, Select, Txt } from "@/components/ui";
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
  if (loading) return <Page back><Loading /></Page>;
  if (error || !data) return <Page back><ErrorView code={error ?? "error"} onRetry={reload} /></Page>;
  const o = data.item;
  const a = o.shipping_address ?? {};
  const address = [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.country].filter(Boolean).join("\n");
  const st = (s: string) => t.shop.status[s as keyof typeof t.shop.status] ?? s;

  const setStatus = (status: string) =>
    api(`/shop/${id}`, { method: "PATCH", body: { status } })
      .then(() => {
        haptic.success();
        setData({ item: { ...o, status } });
      })
      .catch(() => haptic.error());

  const line = (label: string, value: string, strong?: boolean) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Txt v={strong ? "bodyStrong" : "body"} color={strong ? undefined : c.text2}>{label}</Txt>
      <Txt v={strong ? "heading" : "body"}>{value}</Txt>
    </View>
  );

  return (
    <Page back>
      <Hero eyebrow={`${o.number ?? ""} · ${f.dateTime(o.created_at)}`} title={o.name ?? "–"} chips={<><Chip label={st(o.status)} tone={shopTone[o.status]} />{!o.livemode ? <Chip label={t.shop.test} tone="amber" /> : null}</>} />
      <Actions
        items={[
          ...(o.phone ? [{ icon: "call" as const, label: t.common.call, onPress: () => call(o.phone!), tone: "blue" as const }, { icon: "logo-whatsapp" as const, label: t.common.whatsapp, onPress: () => whatsapp(o.phone!), tone: "green" as const }] : []),
          ...(o.email ? [{ icon: "mail" as const, label: t.common.email, onPress: () => mail(o.email!, `Ihre Bestellung ${o.number ?? ""}`), tone: "magenta" as const }] : []),
        ]}
      />
      <Section>
        <Card padded={false}>
          <Select icon="flag" label={t.common.status} value={st(o.status)} tone={shopTone[o.status]} onPress={() => pick(t.common.changeStatus, shopStatuses.map((s) => ({ value: s, label: st(s) })), t.common.cancel, setStatus)} />
        </Card>
      </Section>
      <Section title={t.shop.items}>
        <Card>
          {o.items.map((it, k) => (
            <View key={k} style={{ flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <View style={{ minWidth: 30, height: 30, borderRadius: 9, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}>
                <Txt v="label">{`${it.quantity ?? 1}×`}</Txt>
              </View>
              <Txt v="body" style={{ flex: 1 }}>{it.description ?? "–"}</Txt>
              {it.amount !== undefined ? <Txt v="bodyStrong">{f.cents(it.amount)}</Txt> : null}
            </View>
          ))}
          <View style={{ paddingTop: 8 }}>
            {line(t.shop.subtotal, f.cents(o.amount_subtotal))}
            {line(`${t.shop.shipping}${o.shipping_method ? ` · ${o.shipping_method}` : ""}`, f.cents(o.amount_shipping))}
            {line(t.shop.total, f.cents(o.amount_total), true)}
          </View>
        </Card>
      </Section>
      {address ? (
        <Section title={t.shop.address}>
          <Card>
            <Txt v="body" selectable>{address}</Txt>
          </Card>
        </Section>
      ) : null}
    </Page>
  );
}
