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
