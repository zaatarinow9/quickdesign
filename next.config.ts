import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
      { source: "/admin", destination: "/", permanent: false },
      { source: "/admin/:path*", destination: "/", permanent: false },
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
        ],
      },
    ];
  },
};

export default nextConfig;
