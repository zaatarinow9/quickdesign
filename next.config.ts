import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // PDF-Erzeugung serverseitig (Schriften werden aus src/assets/pdf gelesen)
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/admin/**": ["./src/assets/pdf/**"],
    "/dokument/**": ["./src/assets/pdf/**"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
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
