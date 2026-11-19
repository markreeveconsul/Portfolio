import type { MetadataRoute } from "next";
import { projects } from "@/data/projects";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl.origin;
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    ...projects.map(({ slug }) => ({ url: `${baseUrl}/portfolio/${slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
