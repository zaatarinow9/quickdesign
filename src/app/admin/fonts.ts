import localFont from "next/font/local";

/**
 * Thmanyah Sans nur für arabische Zeichen (unicode-range) – steht in der Schriftliste vor Inter.
 * Wichtig: ohne Ersatzschrift, sonst würde Arial (enthält Arabisch) die Zeichen vorher übernehmen.
 */
export const arabicFont = localFont({
  src: [
    { path: "../shop/fonts/thmanyah-sans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../shop/fonts/thmanyah-sans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../shop/fonts/thmanyah-sans-Bold.woff2", weight: "600 700", style: "normal" },
    { path: "../shop/fonts/thmanyah-sans-Black.woff2", weight: "800 900", style: "normal" },
  ],
  variable: "--font-ar",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-089F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F" }],
});
