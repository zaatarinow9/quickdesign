import localFont from "next/font/local";

/** Thmanyah Sans – nur im Shop geladen (Deutsch und Arabisch). Austausch: --font-ar-display in shop.css. */
export const thmanyah = localFont({
  src: [
    { path: "./fonts/thmanyahsans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/thmanyahsans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/thmanyahsans-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-thmanyah",
  display: "swap",
});
