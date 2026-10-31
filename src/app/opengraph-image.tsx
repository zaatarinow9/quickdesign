import { ImageResponse } from "next/og";
import { LOGO_CORE, LOGO_SEGMENTS, LOGO_TAGLINE, LOGO_WORDMARK } from "@/components/brand/logo-paths";

export const alt = "QuickDesign – Wir machen Marken sichtbar.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
        <svg
          width="640"
          height="654"
          viewBox="58 146 634 648"
          fill="#f4f2ed"
          style={{ position: "absolute", right: -120, top: -12, opacity: 0.12 }}
        >
          {LOGO_SEGMENTS.map((d) => (
            <path key={d.slice(0, 24)} d={d} />
          ))}
          <path d={LOGO_CORE} fillRule="evenodd" />
        </svg>
        <svg width="360" height="150" viewBox="58 146 1556 648" fill="#f4f2ed">
          {LOGO_SEGMENTS.map((d) => (
            <path key={d.slice(0, 24)} d={d} />
          ))}
          <path d={LOGO_CORE} fillRule="evenodd" />
          <path d={LOGO_WORDMARK} fillRule="evenodd" />
          <path d={LOGO_TAGLINE} fillRule="evenodd" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>Wir machen Marken</div>
          <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -4, lineHeight: 1.05, color: "#ff4f1f" }}>sichtbar.</div>
          <div style={{ marginTop: 28, fontSize: 28, color: "rgba(244,242,237,0.6)" }}>
            Grafikdesign · Druck · Werbetechnik · Schilder · Fahrzeugbeschriftung
          </div>
        </div>
      </div>
    ),
    size,
  );
}
