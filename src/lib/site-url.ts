/** Canonical URL is consul.dev, with an environment override for previews. */
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://consul.dev");
