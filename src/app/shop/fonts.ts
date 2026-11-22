import localFont from "next/font/local";

/** Thmanyah Sans – einzige Schrift im Shop und in der Shop-Verwaltung (nicht auf der Hauptseite). */
export const thmanyahSans = localFont({
  src: [
    { path: "./fonts/thmanyah-sans-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/thmanyah-sans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/thmanyah-sans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/thmanyah-sans-Bold.woff2", weight: "600 700", style: "normal" },
    { path: "./fonts/thmanyah-sans-Black.woff2", weight: "800 900", style: "normal" },
  ],
  variable: "--font-thmanyah",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Tahoma", "sans-serif"],
});
