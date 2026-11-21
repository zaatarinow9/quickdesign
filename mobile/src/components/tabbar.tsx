import { Platform, Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "expo-router/tabs";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { font, tone, useColors } from "@/lib/theme";
import { Icon, type IconName, shadow } from "./ui";

const ICONS: Record<string, [IconName, IconName]> = {
  "(home)": ["home-outline", "home"],
  inquiries: ["mail-unread-outline", "mail-unread"],
  work: ["calendar-outline", "calendar"],
  files: ["folder-open-outline", "folder-open"],
  more: ["grid-outline", "grid"],
};

/** Schwebende Tab-Leiste unten: Glas-Effekt, Symbol + Beschriftung, aktiver Reiter hervorgehoben */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const { t, rtl } = useT();
  const insets = useSafeAreaInsets();
  const { state: auth } = useAuth();
  const unread = auth.status === "ready" ? auth.unread : 0;
  const labels: Record<string, string> = { "(home)": t.tabs.home, inquiries: t.tabs.inquiries, work: t.tabs.work, files: t.tabs.files, more: t.tabs.more };
  const routes = rtl ? [...state.routes].reverse() : state.routes;

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom - 6, 12) }}>
      <View style={{ borderRadius: 28, overflow: "hidden", ...shadow(c.dark, 2), borderWidth: c.dark ? 1 : 0, borderColor: c.line }}>
        <BlurView intensity={Platform.OS === "ios" ? 80 : 100} tint={c.dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 6, backgroundColor: Platform.OS === "ios" ? "transparent" : c.dark ? "rgba(22,24,28,.94)" : "rgba(255,255,255,.94)" }}>
          {routes.map((route) => {
            const focused = state.routes[state.index]?.key === route.key;
            const [off, on] = ICONS[route.name] ?? ["ellipse-outline", "ellipse"];
            const badge = route.name === "(home)" && unread ? unread : 0;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                onPress={() => {
                  if (Platform.OS !== "web") void Haptics.selectionAsync();
                  const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!e.defaultPrevented) navigateToTab(route.key);
                }}
                style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 }}
              >
                <View style={{ width: 52, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: focused ? `${tone.magenta}16` : "transparent" }}>
                  <Icon name={focused ? on : off} size={22} color={focused ? tone.magenta : c.text2} />
                  {badge ? (
                    <View style={{ position: "absolute", top: -1, right: 6, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: tone.magenta, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontFamily: font.bold }}>{badge > 99 ? "99+" : badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: focused ? font.semibold : font.medium, color: focused ? tone.magenta : c.text2 }}>{labels[route.name] ?? route.name}</Text>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}
