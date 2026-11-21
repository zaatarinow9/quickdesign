import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type ColorValue, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useT } from "@/lib/i18n";
import { tone as tones, useColors, type Tone } from "@/lib/theme";

export type IconName = SymbolViewProps["name"];

export function Icon({ name, size = 20, color, weight = "regular" }: { name: IconName; size?: number; color?: string; weight?: SymbolViewProps["weight"] }) {
  const c = useColors();
  return <SymbolView name={name} size={size} tintColor={color ?? (c.text2 as string)} weight={weight} style={{ width: size, height: size }} />;
}

/** Grundgerüst: gruppierter Hintergrund, Ziehen zum Aktualisieren, Leserichtung je Sprache */
export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
  scroll = true,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
}) {
  const c = useColors();
  const { rtl } = useT();
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: c.bg, direction: rtl ? "rtl" : "ltr" }, contentStyle]}>{children}</View>;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[{ paddingBottom: 40, direction: rtl ? "rtl" : "ltr" }, contentStyle]}
      keyboardDismissMode="interactive"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function T({ children, style, size = 17, weight, color, lines, selectable }: { children: React.ReactNode; style?: StyleProp<TextStyle>; size?: number; weight?: TextStyle["fontWeight"]; color?: ColorValue; lines?: number; selectable?: boolean }) {
  const c = useColors();
  const { rtl } = useT();
  return (
    <Text numberOfLines={lines} selectable={selectable} style={[{ fontSize: size, fontWeight: weight, color: color ?? c.text, textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }, style]}>
      {children}
    </Text>
  );
}

/** Gruppierte Karte im iOS-Stil mit optionaler Überschrift */
export function Section({ title, children, footer, action, style }: { title?: string; children: React.ReactNode; footer?: string; action?: { label: string; onPress: () => void }; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[{ marginTop: 22, marginHorizontal: 16 }, style]}>
      {title || action ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 7 }}>
          {title ? <T size={13} weight="600" color={c.text2} style={{ textTransform: "uppercase", letterSpacing: 0.3, flex: 1 }}>{title}</T> : <View />}
          {action ? (
            <Pressable onPress={action.onPress} hitSlop={8}>
              <Text style={{ color: tones.magenta, fontSize: 15 }}>{action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={{ backgroundColor: c.card, borderRadius: 14, overflow: "hidden", borderCurve: "continuous" }}>{children}</View>
      {footer ? <T size={13} color={c.text2} style={{ paddingHorizontal: 4, marginTop: 7 }}>{footer}</T> : null}
    </View>
  );
}

/** Listenzeile: Symbol, Titel, Untertitel, rechts Wert/Chip, Pfeil */
export function Row({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  right,
  onPress,
  last,
  lines = 1,
  destructive,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string | null;
  value?: string | null;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  lines?: number;
  destructive?: boolean;
}) {
  const c = useColors();
  const { rtl } = useT();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ backgroundColor: pressed && onPress ? (c.fill as string) : "transparent" })}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16, minHeight: 50 }}>
        {icon ? (
          <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: iconColor ?? tones.magenta, alignItems: "center", justifyContent: "center", marginEnd: 12, borderCurve: "continuous" }}>
            <Icon name={icon} size={17} color="#fff" weight="semibold" />
          </View>
        ) : null}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingEnd: 14, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.line as string }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T size={16} lines={lines} color={destructive ? tones.red : undefined}>{title}</T>
            {subtitle ? <T size={13} color={c.text2} lines={2}>{subtitle}</T> : null}
          </View>
          {value ? <T size={15} color={c.text2} style={{ marginStart: 8 }}>{value}</T> : null}
          {right ? <View style={{ marginStart: 8 }}>{right}</View> : null}
          {onPress ? <Icon name={rtl ? "chevron.left" : "chevron.right"} size={13} color={c.text3 as string} weight="semibold" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function Chip({ label, tone = "gray", small }: { label: string; tone?: Tone; small?: boolean }) {
  const color = tones[tone];
  return (
    <View style={{ backgroundColor: `${color}1f`, paddingHorizontal: small ? 7 : 9, paddingVertical: small ? 2 : 4, borderRadius: 99, alignSelf: "flex-start" }}>
      <Text style={{ color, fontSize: small ? 11 : 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

/** Kennzahl-Kachel für die Startseite */
export function Stat({ label, value, icon, color, onPress }: { label: string; value: string | number; icon: IconName; color: string; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, backgroundColor: c.card, borderRadius: 16, padding: 14, gap: 10, borderCurve: "continuous", opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${color}22`, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={17} color={color} weight="semibold" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: "700", color: c.text as string, fontVariant: ["tabular-nums"] }}>{value}</Text>
      </View>
      <T size={13} color={c.text2} lines={2}>{label}</T>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={{ paddingVertical: 60, alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}

export function Empty({ text, icon = "tray" }: { text: string; icon?: IconName }) {
  const c = useColors();
  return (
    <View style={{ paddingVertical: 60, alignItems: "center", gap: 10, paddingHorizontal: 30 }}>
      <Icon name={icon} size={34} color={c.text3 as string} />
      <T size={15} color={c.text2} style={{ textAlign: "center" }}>{text}</T>
    </View>
  );
}

export function ErrorView({ code, onRetry }: { code: string; onRetry: () => void }) {
  const { t } = useT();
  const c = useColors();
  return (
    <View style={{ paddingVertical: 60, alignItems: "center", gap: 14, paddingHorizontal: 30 }}>
      <Icon name="wifi.exclamationmark" size={34} color={c.text3 as string} />
      <T size={15} color={c.text2} style={{ textAlign: "center" }}>{code === "network" ? t.common.network : code === "forbidden" ? t.common.noAccess : t.common.error}</T>
      <Button label={t.common.retry} onPress={onRetry} kind="secondary" />
    </View>
  );
}

export function Button({ label, onPress, kind = "primary", icon, loading, disabled, style }: { label: string; onPress: () => void; kind?: "primary" | "secondary" | "plain" | "danger"; icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const bg = kind === "primary" ? tones.magenta : kind === "danger" ? tones.red : kind === "secondary" ? (c.fill as string) : "transparent";
  const fg = kind === "primary" || kind === "danger" ? "#fff" : tones.magenta;
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [{ height: 50, borderRadius: 14, backgroundColor: bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, opacity: disabled ? 0.45 : pressed ? 0.75 : 1, borderCurve: "continuous" }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={17} color={fg} weight="semibold" /> : null}
      <Text style={{ color: fg, fontSize: 17, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

/** Schnellaktionen (Anrufen, E-Mail, …) als runde Knöpfe */
export function QuickActions({ actions }: { actions: { icon: IconName; label: string; onPress: () => void; color?: string }[] }) {
  const c = useColors();
  if (!actions.length) return null;
  return (
    <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 16 }}>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => ({ flex: 1, backgroundColor: c.card, borderRadius: 14, paddingVertical: 11, alignItems: "center", gap: 5, opacity: pressed ? 0.7 : 1, borderCurve: "continuous" })}>
          <Icon name={a.icon} size={21} color={a.color ?? tones.magenta} />
          <Text style={{ fontSize: 12, color: a.color ?? tones.magenta, fontWeight: "500" }}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Natives Auswahlmenü (iOS Action Sheet, sonst Dialog) */
export function pick<T extends string>(title: string, options: { value: T; label: string }[], cancel: string, onPick: (v: T) => void) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions({ title, options: [...options.map((o) => o.label), cancel], cancelButtonIndex: options.length }, (i) => {
      if (i < options.length) onPick(options[i].value);
    });
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
      placeholderTextColor={c.text3 as string}
      multiline={multiline}
      secureTextEntry={secure}
      keyboardType={keyboard}
      autoCapitalize={keyboard === "email-address" || secure ? "none" : "sentences"}
      autoCorrect={!(keyboard === "email-address" || secure)}
      autoFocus={autoFocus}
      style={[{ minHeight: multiline ? 96 : 50, paddingHorizontal: 16, paddingVertical: multiline ? 12 : 0, fontSize: 17, color: c.text as string, textAlign: rtl ? "right" : "left", textAlignVertical: multiline ? "top" : "center" }, style]}
    />
  );
}

export const haptic = {
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

/** Umschalter (Segmente) – horizontal scrollbar bei vielen Optionen */
export function Segments<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string; count?: number }[]; onChange: (v: V) => void }) {
  const c = useColors();
  const { rtl } = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12, direction: rtl ? "rtl" : "ltr" }} style={{ flexGrow: 0 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 99, backgroundColor: on ? tones.magenta : (c.card as string), borderCurve: "continuous" }}
          >
            <Text style={{ color: on ? "#fff" : (c.text as string), fontSize: 14, fontWeight: on ? "600" : "500" }}>{o.label}</Text>
            {o.count !== undefined ? (
              <Text style={{ color: on ? "#ffffffcc" : (c.text2 as string), fontSize: 13, fontVariant: ["tabular-nums"] }}>{o.count}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
