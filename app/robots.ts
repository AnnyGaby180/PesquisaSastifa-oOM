import type { MetadataRoute } from "next";

// Pede aos buscadores (Google etc.) que não indexem o site.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
