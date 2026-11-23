import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Schneller Seitenwechsel: besuchte/vorab geladene Seiten kurz im Browser behalten
    // (Änderungen kommen trotzdem sofort – das Live-Signal lädt die aktuelle Seite neu)
    staleTimes: { dynamic: 30, static: 60 },
  },
  // PDF-Erzeugung serverseitig (Schriften werden aus src/assets/pdf gelesen)
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/admin/**": ["./src/assets/pdf/**"],
    "/dokument/**": ["./src/assets/pdf/**"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Produktbilder aus der Shop-Verwaltung (Supabase Storage, öffentlicher Bucket „shop“)
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sdayndvgwhqjsroyqxlg.supabase.co").hostname,
        pathname: "/storage/v1/object/public/shop/**",
      },
    ],
  },
  async redirects() {
    return [
      // Legacy shop routes → new structure / QuickPrintly
      { source: "/services", destination: "/leistungen", permanent: true },
      { source: "/services/:slug*", destination: "/leistungen", permanent: true },
      { source: "/cart", destination: "https://quickprintly.de/", permanent: false },
      { source: "/checkout", destination: "https://quickprintly.de/", permanent: false },
      { source: "/track", destination: "/kontakt", permanent: false },
      { source: "/documents/:path*", destination: "/kontakt", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        source: "/(admin|dokument|einwilligung|abmelden)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
