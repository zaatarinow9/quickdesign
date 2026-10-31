import { ImageResponse } from "next/og";
import { LOGO_VIEWBOX, MARK_VIEWBOX } from "@/components/brand/Logo";
import { BRAND_COLORS, LOGO_ARCS, LOGO_CORE, LOGO_SEGMENTS, LOGO_TAGLINE, LOGO_WORDMARK } from "@/components/brand/logo-paths";

export const alt = "QuickDesign – Wir machen Marken sichtbar.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  // Satori does not support fragments inside <svg>, so build a flat array.
  const mark = [
    ...LOGO_SEGMENTS.map((s) => <path key={s.d.slice(0, 24)} d={s.d} fill={BRAND_COLORS[s.color]} />),
    ...LOGO_ARCS.map((d) => <path key={d.slice(0, 24)} d={d} />),
    <path key="core" d={LOGO_CORE} />,
  ];
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#0b0b0c",
          color: "#f4f2ed",
          padding: 72,
          position: "relative",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <svg width="620" height="620" viewBox={MARK_VIEWBOX} fill="#f4f2ed" style={{ position: "absolute", right: -110, top: 5, opacity: 0.18 }}>
          {mark}
        </svg>
        <svg width="380" height="159" viewBox={LOGO_VIEWBOX} fill="#f4f2ed">
          {mark}
          {LOGO_WORDMARK.map((d) => (
            <path key={d.slice(0, 24)} d={d} />
          ))}
          {LOGO_TAGLINE.map((d) => (
            <path key={d.slice(0, 24)} d={d} fill={BRAND_COLORS.magenta} />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>Wir machen Marken</div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 600,
              letterSpacing: -4,
              lineHeight: 1.05,
              backgroundImage: "linear-gradient(90deg, #df1986, #2fa7df)",
              backgroundClip: "text",
              color: "transparent",
              display: "flex",
            }}
          >
            sichtbar.
          </div>
          <div style={{ marginTop: 28, fontSize: 28, color: "rgba(244,242,237,0.6)" }}>
            Grafikdesign · Druck · Werbetechnik · Schilder · Fahrzeugbeschriftung
          </div>
        </div>
      </div>
    ),
    size,
  );
}
