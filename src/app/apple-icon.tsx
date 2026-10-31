import { ImageResponse } from "next/og";
import { MARK_VIEWBOX } from "@/components/brand/Logo";
import { BRAND_COLORS, LOGO_ARCS, LOGO_CORE, LOGO_SEGMENTS } from "@/components/brand/logo-paths";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#0b0b0c" }}>
        <svg width="130" height="130" viewBox={MARK_VIEWBOX} fill="#f4f2ed">
          {LOGO_SEGMENTS.map((s) => (
            <path key={s.d.slice(0, 24)} d={s.d} fill={BRAND_COLORS[s.color]} />
          ))}
          {LOGO_ARCS.map((d) => (
            <path key={d.slice(0, 24)} d={d} />
          ))}
          <path d={LOGO_CORE} />
        </svg>
      </div>
    ),
    size,
  );
}
