import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo";

/**
 * The public site is indexable; the signed-in app, the API routes and
 * personal links (unsubscribe, shared setlists and gigs) are not.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/*/dashboard",
          "/*/unsubscribe",
          "/s/",
          "/g/",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
