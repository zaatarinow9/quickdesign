import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/dokument", "/einwilligung", "/abmelden", "/api"] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
