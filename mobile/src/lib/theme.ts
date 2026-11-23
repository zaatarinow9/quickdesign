import { useColorScheme } from "react-native";

/** QuickDesign-Farben (Logo: Magenta, Cyan, Gelb, Schwarz) */
export const brand = {
  magenta: "#E0177F",
  cyan: "#1E9BD7",
  yellow: "#F2B705",
  ink: "#111317",
  green: "#12A150",
  amber: "#E07B00",
  red: "#E5383B",
  violet: "#7048E8",
  slate: "#6B7280",
};

/** Ruhige, klare Flächen – hell und dunkel */
export function useColors() {
  const dark = useColorScheme() === "dark";
  return dark
    ? { dark, bg: "#0B0C0E", card: "#16181C", raised: "#1E2025", text: "#F5F6F8", text2: "#A0A6B1", text3: "#5F6672", line: "#24272D", fill: "#1F2227", primary: "#F5F6F8", onPrimary: "#111317", tint: brand.magenta }
    : { dark, bg: "#F4F5F7", card: "#FFFFFF", raised: "#FFFFFF", text: "#111317", text2: "#6B7280", text3: "#A3A9B4", line: "#EDEFF2", fill: "#F1F2F5", primary: "#111317", onPrimary: "#FFFFFF", tint: brand.magenta };
}
export type Colors = ReturnType<typeof useColors>;

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

/** Schrift: IBM Plex Sans Arabic (Arabisch + Latein in einer Familie) */
export const font = {
  regular: "IBMPlexSansArabic_400Regular",
  medium: "IBMPlexSansArabic_500Medium",
  semibold: "IBMPlexSansArabic_600SemiBold",
  bold: "IBMPlexSansArabic_700Bold",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };
export const space = { page: 20 };

export const inquiryTone: Record<string, Tone> = { neu: "magenta", in_bearbeitung: "amber", erledigt: "green", archiviert: "gray" };
export const shopTone: Record<string, Tone> = { bezahlt: "magenta", in_produktion: "amber", versendet: "blue", abholbereit: "violet", abgeschlossen: "green", storniert: "gray" };
export const projectTone: Record<string, Tone> = { angenommen: "blue", in_arbeit: "amber", fertig: "violet", abgeschlossen: "green" };
export const fileTone: Record<string, Tone> = { neu: "blue", bearbeitung: "amber", erledigt: "green" };
const docTones: Record<string, Tone> = { entwurf: "gray", offen: "blue", versendet: "blue", angenommen: "green", bezahlt: "green", teilbezahlt: "amber", ueberfaellig: "red", abgelehnt: "red", storniert: "gray", abgelaufen: "gray" };
export const docTone = (s: string): Tone => docTones[s] ?? "gray";

export const fileStatuses = ["neu", "bearbeitung", "erledigt"] as const;
export const projectStatuses = ["angenommen", "in_arbeit", "fertig", "abgeschlossen"] as const;
export const shopStatuses = ["bezahlt", "in_produktion", "versendet", "abholbereit", "abgeschlossen", "storniert"] as const;
export const inquiryStatuses = ["neu", "in_bearbeitung", "erledigt", "archiviert"] as const;
