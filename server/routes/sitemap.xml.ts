// Static pages + the last 60 days of APOD detail pages (the gallery's range).
// Detail pages aren't linked from any static nav, so the sitemap is their main
// discovery path.
import type { SiteContent } from "#shared/types";

export default defineEventHandler(async (event) => {
  const { siteUrl } = useRuntimeConfig().public;

  // Static routes come from the shared nav via the content API (the same cache
  // chain the rest of the app rides), not a hardcoded list — add a page to the
  // menu and it shows up here automatically.
  const { menu } = await $fetch<SiteContent>("/api/content");
  const staticPaths = Object.values(menu).map((item) => item.link);

  const DAY = 86_400_000;
  const end = Date.now() - DAY; // yesterday, matching the list endpoint
  const dates = Array.from({ length: 60 }, (_, i) =>
    new Date(end - i * DAY).toISOString().slice(0, 10),
  );

  const paths = [...staticPaths, ...dates.map((d) => `/apod/${d}`)];
  const urls = paths
    .map((p) => `  <url><loc>${siteUrl}${p}</loc></url>`)
    .join("\n");

  setHeader(event, "content-type", "application/xml; charset=utf-8");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
});
