import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

let cachedLogoDataUri: string | null = null;

async function getLogoDataUri(): Promise<string> {
  if (cachedLogoDataUri) {
    return cachedLogoDataUri;
  }

  const logoBuffer = await readFile(join(process.cwd(), "public", "logo.png"));
  cachedLogoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  return cachedLogoDataUri;
}

export async function buildBrandImageResponse(
  width: number,
  height: number,
): Promise<ImageResponse> {
  const logoDataUri = await getLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top left, #dbeafe 0%, #f8fafc 38%, #f8fafc 100%)",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "88%",
            height: "80%",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: Math.max(28, Math.round(height * 0.1)),
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            boxShadow: "0 24px 64px rgba(15, 23, 42, 0.12)",
          }}
        >
          <img
            src={logoDataUri}
            alt="QuickDesign"
            style={{
              width: "72%",
              height: "42%",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    ),
    {
      width,
      height,
    },
  );
}
