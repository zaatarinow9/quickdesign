import { Platform, PlatformColor, useColorScheme, type ColorValue } from "react-native";

/** QuickDesign-Farben (Logo: Magenta, Cyan, Gelb, Schwarz) */
export const brand = {
  magenta: "#df1986",
  cyan: "#2fa7df",
  yellow: "#f2b705",
  ink: "#16181d",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  violet: "#7c3aed",
  slate: "#64748b",
};

/** iOS-Systemfarben (Hell/Dunkel automatisch), Android mit festen Werten */
export function useColors() {
  const dark = useColorScheme() === "dark";
  const ios = Platform.OS === "ios";
  const pc = (name: string, light: string, darkV: string): ColorValue => (ios ? PlatformColor(name) : dark ? darkV : light);
  return {
    dark,
    bg: pc("systemGroupedBackground", "#f2f2f7", "#000000"),
    card: pc("secondarySystemGroupedBackground", "#ffffff", "#1c1c1e"),
    fill: pc("tertiarySystemFill", "#7676801f", "#7676803d"),
    text: pc("label", "#000000", "#ffffff"),
    text2: pc("secondaryLabel", "#3c3c4399", "#ebebf599"),
    text3: pc("tertiaryLabel", "#3c3c434d", "#ebebf54d"),
    line: pc("separator", "#3c3c434a", "#54545899"),
    tint: brand.magenta,
  };
}
export type Colors = ReturnType<typeof useColors>;

/** Ton je Status → Farbe */
export const tone = {
  blue: brand.cyan,
  magenta: brand.magenta,
  amber: brand.amber,
  green: brand.green,
  gray: brand.slate,
  red: brand.red,
  violet: brand.violet,
} as const;
export type Tone = keyof typeof tone;

export const inquiryTone: Record<string, Tone> = { neu: "magenta", in_bearbeitung: "amber", erledigt: "green", archiviert: "gray" };
export const shopTone: Record<string, Tone> = { bezahlt: "magenta", in_produktion: "amber", versendet: "blue", abholbereit: "violet", abgeschlossen: "green", storniert: "gray" };
export const projectTone: Record<string, Tone> = { angenommen: "blue", in_arbeit: "amber", fertig: "violet", abgeschlossen: "green" };
export const fileTone: Record<string, Tone> = { neu: "magenta", bearbeitung: "amber", freigabe: "violet", druckfertig: "blue", im_druck: "amber", erledigt: "green" };
const docTones: Record<string, Tone> = { entwurf: "gray", offen: "blue", versendet: "blue", angenommen: "green", bezahlt: "green", teilbezahlt: "amber", ueberfaellig: "red", abgelehnt: "red", storniert: "gray", abgelaufen: "gray" };
export const docTone = (s: string): Tone => docTones[s] ?? "gray";

export const fileStatuses = ["neu", "bearbeitung", "freigabe", "druckfertig", "im_druck", "erledigt"] as const;
export const projectStatuses = ["angenommen", "in_arbeit", "fertig", "abgeschlossen"] as const;
export const shopStatuses = ["bezahlt", "in_produktion", "versendet", "abholbereit", "abgeschlossen", "storniert"] as const;
export const inquiryStatuses = ["neu", "in_bearbeitung", "erledigt", "archiviert"] as const;
