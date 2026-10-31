import { ImageResponse } from "next/og";
import { LOGO_CORE, LOGO_SEGMENTS } from "@/components/brand/logo-paths";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#0b0b0c" }}>
        <svg width="120" height="124" viewBox="58 146 634 648" fill="#f4f2ed">
          {LOGO_SEGMENTS.map((d) => (
            <path key={d.slice(0, 24)} d={d} />
          ))}
          <path d={LOGO_CORE} fillRule="evenodd" />
        </svg>
      </div>
    ),
    size,
  );
}
