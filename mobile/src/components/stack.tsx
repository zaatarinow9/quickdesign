import { Stack } from "expo-router";
import { useT } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

/** Stapel je Reiter: eigene Kopfzeilen in den Seiten, Wischgeste zurück */
export function TabStack() {
  const c = useColors();
  const { rtl } = useT();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: rtl ? "slide_from_left" : "slide_from_right", gestureEnabled: true }} />;
}
