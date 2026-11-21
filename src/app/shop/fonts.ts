import localFont from "next/font/local";

/** itf Qomra Arabic – Schrift der neuen syrischen Staatsidentität, nur im Shop geladen. */
export const qomra = localFont({
  src: [
    { path: "./fonts/qomra-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/qomra-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/qomra-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/qomra-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/qomra-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-qomra",
  display: "swap",
});

/** Qatar 2022 Arabic – Hauptschrift des Shops (nur Bold und Heavy vorhanden; dünnere Schnitte nutzen Bold). */
export const qatar = localFont({
  src: [
    { path: "./fonts/qatar-ar-Bold.woff2", weight: "100 700", style: "normal" },
    { path: "./fonts/qatar-ar-Heavy.woff2", weight: "800 900", style: "normal" },
  ],
  variable: "--font-qatar",
  display: "swap",
});
