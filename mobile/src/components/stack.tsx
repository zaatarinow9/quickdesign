import { Platform } from "react-native";
import { Stack } from "expo-router";
import { useT } from "@/lib/i18n";
import { brand, useColors } from "@/lib/theme";

/** Gemeinsame Kopfzeile: große Titel, Glas-Effekt auf iOS, Leserichtung je Sprache */
export function TabStack() {
  const c = useColors();
  const { rtl } = useT();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: Platform.OS === "ios",
        headerBlurEffect: Platform.OS === "ios" ? "systemChromeMaterial" : undefined,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTintColor: brand.magenta,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: c.bg as string },
        headerStyle: Platform.OS === "ios" ? undefined : { backgroundColor: c.bg as string },
        headerTitleAlign: rtl ? "center" : undefined,
        animation: rtl ? "slide_from_left" : "default",
      }}
    />
  );
}
