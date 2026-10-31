import type { MetadataRoute } from "next";
import { services } from "@/content/services";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/leistungen", "/projekte", "/ueber-uns", "/kontakt", "/impressum", "/datenschutz"];
  return [
    ...pages.map((path) => ({
      url: `${site.url}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : path.startsWith("/leistungen") ? 0.9 : 0.6,
    })),
    ...services.map((service) => ({
      url: `${site.url}/leistungen/${service.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
