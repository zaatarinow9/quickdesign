import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useT } from "@/lib/i18n";
import { font, radius, space, tone as tones, useColors, type Tone } from "@/lib/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

export const TAB_BAR_SPACE = 110;

const tap = () => {
  if (Platform.OS !== "web") void Haptics.selectionAsync();
};
export const haptic = {
  success: () => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error: () => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color ?? c.text2} />;
}

/* ------------------------------------------------------------------ Text */

type Variant = "display" | "title" | "heading" | "body" | "bodyStrong" | "meta" | "label" | "caption";
const variants: Record<Variant, { size: number; family: string; line: number }> = {
  display: { size: 30, family: font.bold, line: 40 },
  title: { size: 22, family: font.bold, line: 31 },
  heading: { size: 17, family: font.semibold, line: 25 },
  body: { size: 15, family: font.regular, line: 23 },
  bodyStrong: { size: 15, family: font.semibold, line: 22 },
  meta: { size: 13, family: font.regular, line: 19 },
  label: { size: 13, family: font.semibold, line: 18 },
  caption: { size: 11.5, family: font.medium, line: 16 },
};

export function Txt({
  children,
  v = "body",
  color,
  lines,
  center,
  style,
  selectable,
}: {
  children: React.ReactNode;
  v?: Variant;
  color?: string;
  lines?: number;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  selectable?: boolean;
}) {
  const c = useColors();
  const { rtl } = useT();
  const s = variants[v];
  const muted = v === "meta" || v === "caption";
  return (
    <Text
      numberOfLines={lines}
      selectable={selectable}
      style={[
        { fontFamily: s.family, fontSize: s.size, lineHeight: s.line, color: color ?? (muted ? c.text2 : c.text), textAlign: center ? "center" : rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ Seite & Kopf */

/** Seite mit eigener Kopfzeile: Titel, Zurück, Aktionen; Inhalt scrollt, Platz für die Tab-Leiste */
export function Page({
  title,
  subtitle,
  back,
  actions,
  children,
  refreshing,
  onRefresh,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  actions?: { icon: IconName; onPress: () => void; badge?: number; loading?: boolean }[];
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const c = useColors();
  const { rtl } = useT();
  const insets = useSafeAreaInsets();
  const hasBar = back || !!actions?.length;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, direction: rtl ? "rtl" : "ltr" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: TAB_BAR_SPACE + insets.bottom }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.text2} /> : undefined}
      >
        {hasBar ? (
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space.page - 4, height: 44 }}>
            {back ? <CircleButton icon={rtl ? "chevron-forward" : "chevron-back"} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} /> : null}
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {actions?.map((a) => <CircleButton key={a.icon} icon={a.icon} onPress={a.onPress} badge={a.badge} loading={a.loading} />)}
            </View>
          </View>
        ) : null}
        {title ? (
          <View style={{ paddingHorizontal: space.page, paddingTop: hasBar ? 8 : 12, paddingBottom: 4, gap: 2 }}>
            {subtitle ? <Txt v="meta">{subtitle}</Txt> : null}
            <Txt v="display">{title}</Txt>
          </View>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}

export function shadow(dark: boolean, level: 1 | 2 = 1): ViewStyle {
  if (dark) return {};
  return Platform.select({
    web: { boxShadow: level === 1 ? "0 1px 3px rgba(17,19,23,.06)" : "0 10px 30px rgba(17,19,23,.10)" } as ViewStyle,
    default: { shadowColor: "#111317", shadowOpacity: level === 1 ? 0.05 : 0.1, shadowRadius: level === 1 ? 4 : 18, shadowOffset: { width: 0, height: level === 1 ? 1 : 8 }, elevation: level * 2 },
  }) as ViewStyle;
}

export function CircleButton({ icon, onPress, badge, loading }: { icon: IconName; onPress: () => void; badge?: number; loading?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, backgroundColor: c.card, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1, ...shadow(c.dark) })}
    >
      {loading ? <ActivityIndicator size="small" color={c.text} /> : <Icon name={icon} size={20} color={c.text} />}
      {badge ? (
        <View style={{ position: "absolute", top: -3, right: -3, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: tones.magenta, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.bg }}>
          <Text style={{ color: "#fff", fontSize: 10, fontFamily: font.bold }}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Karten & Listen */

export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.card, borderRadius: radius.lg, padding: padded ? 16 : 0, borderCurve: "continuous", ...shadow(c.dark) }, style]}>{children}</View>;
}

/** Abschnitt: Überschrift + optionale Aktion + Inhalt */
export function Section({ title, action, children, style }: { title?: string; action?: { label: string; onPress: () => void }; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 26, paddingHorizontal: space.page }, style]}>
      {title || action ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          {title ? <Txt v="heading">{title}</Txt> : <View />}
          {action ? (
            <Pressable onPress={action.onPress} hitSlop={10}>
              <Txt v="label" color={tones.magenta}>{action.label}</Txt>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Liste in einer Karte mit feinen Trennlinien */
export function List({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  return (
    <Card padded={false} style={{ overflow: "hidden" }}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: c.line, marginStart: 66 }} /> : null}
          {child}
        </View>
      ))}
    </Card>
  );
}

/** Symbol in getönter Fläche */
export function Badge({ icon, tone = "gray", size = 40, initials }: { icon?: IconName; tone?: Tone; size?: number; initials?: string }) {
  const color = tones[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: `${color}17`, alignItems: "center", justifyContent: "center", borderCurve: "continuous" }}>
      {initials ? <Text style={{ color, fontFamily: font.bold, fontSize: size * 0.36 }}>{initials}</Text> : icon ? <Icon name={icon} size={size * 0.5} color={color} /> : null}
    </View>
  );
}

/** Listeneintrag: Symbol, Titel, Unterzeile, rechts Status/Wert */
export function Item({
  icon,
  tone,
  initials,
  title,
  subtitle,
  meta,
  trailing,
  value,
  onPress,
  chevron = true,
  danger,
  lines = 1,
}: {
  icon?: IconName;
  tone?: Tone;
  initials?: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  trailing?: React.ReactNode;
  value?: string | null;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
  lines?: number;
}) {
  const c = useColors();
  const { rtl } = useT();
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: pressed ? c.fill : "transparent" })}
    >
      {icon || initials ? <Badge icon={icon} tone={tone} initials={initials} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="bodyStrong" lines={lines} color={danger ? tones.red : undefined}>{title}</Txt>
        {subtitle ? <Txt v="meta" lines={2}>{subtitle}</Txt> : null}
        {meta ? <Txt v="caption" color={c.text3} lines={1}>{meta}</Txt> : null}
      </View>
      {value ? <Txt v="bodyStrong" style={{ fontVariant: ["tabular-nums"] }}>{value}</Txt> : null}
      {trailing}
      {onPress && chevron ? <Icon name={rtl ? "chevron-back" : "chevron-forward"} size={16} color={c.text3} /> : null}
    </Pressable>
  );
}

/** Zeile „Bezeichnung – Wert“ */
export function Info({ icon, label, value, onPress, last }: { icon: IconName; label: string; value: string; onPress?: () => void; last?: boolean }) {
  const c = useColors();
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={19} color={c.text3} />
      <View style={{ flex: 1, gap: 1 }}>
        <Txt v="caption" color={c.text3}>{label}</Txt>
        <Txt v="body" color={onPress ? tones.magenta : undefined} selectable>{value}</Txt>
      </View>
    </Pressable>
  );
}

export function Chip({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  const color = tones[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${color}14`, paddingHorizontal: 9, height: 24, borderRadius: 12, alignSelf: "flex-start" }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color, fontSize: 12, fontFamily: font.semibold }}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ Kennzahlen */

export function Kpi({ label, value, icon, tone = "gray", onPress }: { label: string; value: string | number; icon: IconName; tone?: Tone; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      disabled={!onPress}
      style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.card, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 14, opacity: pressed ? 0.75 : 1, borderCurve: "continuous", ...shadow(c.dark) })}
    >
      <Badge icon={icon} tone={tone} size={40} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: font.bold, fontSize: 22, lineHeight: 28, color: c.text, fontVariant: ["tabular-nums"] }}>{value}</Text>
        <Txt v="caption" lines={1}>{label}</Txt>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Filter, Suche, Knöpfe */

export function Segments<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string; count?: number }[]; onChange: (v: V) => void }) {
  const c = useColors();
  const { rtl } = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.page, paddingVertical: 4, direction: rtl ? "rtl" : "ltr" }} style={{ flexGrow: 0, marginTop: 12 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 15, height: 36, borderRadius: 18, backgroundColor: on ? c.primary : c.card, ...(on ? {} : shadow(c.dark)) }}
          >
            <Text style={{ color: on ? c.onPrimary : c.text, fontSize: 14, fontFamily: on ? font.semibold : font.medium }}>{o.label}</Text>
            {o.count !== undefined ? <Text style={{ color: on ? c.onPrimary : c.text3, opacity: on ? 0.7 : 1, fontSize: 13, fontFamily: font.medium }}>{o.count}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const c = useColors();
  const { rtl } = useT();
  return (
    <View style={{ marginHorizontal: space.page, marginTop: 14, height: 46, borderRadius: 15, backgroundColor: c.card, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, ...shadow(c.dark) }}>
      <Icon name="search" size={18} color={c.text3} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.text3}
        returnKeyType="search"
        style={{ flex: 1, height: 46, fontFamily: font.regular, fontSize: 15, color: c.text, textAlign: rtl ? "right" : "left" }}
      />
      {value ? (
        <Pressable onPress={() => onChange("")} hitSlop={10}>
          <Icon name="close-circle" size={18} color={c.text3} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({ label, onPress, kind = "primary", icon, loading, disabled, style }: { label: string; onPress: () => void; kind?: "primary" | "secondary" | "accent" | "plain" | "danger"; icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const bg = { primary: c.primary, accent: tones.magenta, danger: tones.red, secondary: c.card, plain: "transparent" }[kind];
  const fg = { primary: c.onPrimary, accent: "#fff", danger: "#fff", secondary: c.text, plain: tones.magenta }[kind];
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [{ height: 52, borderRadius: 16, backgroundColor: bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, opacity: disabled ? 0.4 : pressed ? 0.8 : 1, borderCurve: "continuous", ...(kind === "secondary" ? shadow(c.dark) : {}) }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 16, fontFamily: font.semibold }}>{label}</Text>
    </Pressable>
  );
}

/** Schnellaktionen als Kacheln mit Symbol und Beschriftung */
export function Actions({ items }: { items: { icon: IconName; label: string; onPress: () => void; tone?: Tone }[] }) {
  const c = useColors();
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: space.page, marginTop: 18 }}>
      {items.map((a) => (
        <Pressable
          key={a.label}
          onPress={() => {
            tap();
            a.onPress();
          }}
          style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: c.card, opacity: pressed ? 0.7 : 1, ...shadow(c.dark) })}
        >
          <Badge icon={a.icon} tone={a.tone ?? "magenta"} size={36} />
          <Txt v="caption" color={c.text} center>{a.label}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ Zustände */

export function Loading() {
  const c = useColors();
  return (
    <View style={{ paddingHorizontal: space.page, marginTop: 20, gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 70, borderRadius: radius.lg, backgroundColor: c.card, opacity: 1 - i * 0.25 }} />
      ))}
    </View>
  );
}

export function Empty({ text, icon = "file-tray-outline" }: { text: string; icon?: IconName }) {
  const c = useColors();
  return (
    <View style={{ paddingVertical: 56, alignItems: "center", gap: 12, paddingHorizontal: 40 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, alignItems: "center", justifyContent: "center", ...shadow(c.dark) }}>
        <Icon name={icon} size={28} color={c.text3} />
      </View>
      <Txt v="body" color={c.text2} center>{text}</Txt>
    </View>
  );
}

export function ErrorView({ code, onRetry }: { code: string; onRetry: () => void }) {
  const { t } = useT();
  const c = useColors();
  return (
    <View style={{ paddingVertical: 56, alignItems: "center", gap: 14, paddingHorizontal: 40 }}>
      <Icon name="cloud-offline-outline" size={36} color={c.text3} />
      <Txt v="body" color={c.text2} center>{code === "network" ? t.common.network : code === "forbidden" ? t.common.noAccess : t.common.error}</Txt>
      <Button label={t.common.retry} onPress={onRetry} kind="secondary" style={{ height: 44 }} />
    </View>
  );
}

/* ------------------------------------------------------------------ Eingaben & Auswahl */

export function pick<T extends string>(title: string, options: { value: T; label: string }[], cancel: string, onPick: (v: T) => void) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions({ title, options: [...options.map((o) => o.label), cancel], cancelButtonIndex: options.length }, (i) => {
      if (i < options.length) onPick(options[i].value);
    });
    return;
  }
  if (Platform.OS === "web") {
    const labels = options.map((o, i) => `${i + 1}. ${o.label}`).join("\n");
    const r = globalThis.prompt?.(`${title}\n${labels}`);
    const n = Number(r) - 1;
    if (options[n]) onPick(options[n].value);
    return;
  }
  Alert.alert(title, undefined, [...options.slice(0, 6).map((o) => ({ text: o.label, onPress: () => onPick(o.value) })), { text: cancel, style: "cancel" as const }]);
}

export function Field({ value, onChangeText, placeholder, multiline, secure, keyboard, autoFocus, style }: { value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean; secure?: boolean; keyboard?: "email-address" | "number-pad" | "default"; autoFocus?: boolean; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  const { rtl } = useT();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.text3}
      multiline={multiline}
      secureTextEntry={secure}
      keyboardType={keyboard}
      autoCapitalize={keyboard === "email-address" || secure ? "none" : "sentences"}
      autoCorrect={!(keyboard === "email-address" || secure)}
      autoFocus={autoFocus}
      style={[
        { minHeight: multiline ? 100 : 52, borderRadius: 16, backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: multiline ? 14 : 0, fontFamily: font.regular, fontSize: 16, color: c.text, textAlign: rtl ? "right" : "left", textAlignVertical: multiline ? "top" : "center", ...shadow(c.dark) },
        style,
      ]}
    />
  );
}

/** Kopfbereich einer Detailseite */
export function Hero({ eyebrow, title, subtitle, chips }: { eyebrow?: string; title: string; subtitle?: string | null; chips?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ paddingHorizontal: space.page, paddingTop: 8, gap: 4 }}>
      {eyebrow ? <Txt v="label" color={tones.magenta}>{eyebrow}</Txt> : null}
      <Txt v="title" selectable>{title}</Txt>
      {subtitle ? <Txt v="body" color={c.text2}>{subtitle}</Txt> : null}
      {chips ? <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 }}>{chips}</View> : null}
    </View>
  );
}

/** Auswahlzeile (Status, Zuweisung …) */
export function Select({ icon, label, value, onPress, tone = "magenta", trailing }: { icon: IconName; label: string; value: string; onPress?: () => void; tone?: Tone; trailing?: React.ReactNode }) {
  const c = useColors();
  const { rtl } = useT();
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, opacity: pressed ? 0.6 : 1 })}
    >
      <Badge icon={icon} tone={tone} size={36} />
      <View style={{ flex: 1 }}>
        <Txt v="caption" color={c.text3}>{label}</Txt>
        <Txt v="bodyStrong">{value}</Txt>
      </View>
      {trailing}
      {onPress ? <Icon name={rtl ? "chevron-back" : "chevron-forward"} size={16} color={c.text3} /> : null}
    </Pressable>
  );
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
export const typeIcon = (t: string | null): IconName => (t === "montage" ? "construct" : t === "lieferung" ? "cube" : t === "abholung" ? "walk" : t === "besorgung" ? "cart" : "checkbox");
