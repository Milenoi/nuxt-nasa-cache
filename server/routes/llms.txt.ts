// llms.txt: a short, LLM-friendly map of the site (see llmstxt.org). Every piece
// of copy comes from the content API (the same cache chain the app rides), so
// nothing here is hardcoded.
import type { SiteContent } from "#shared/types";

export default defineEventHandler(async (event) => {
  const { siteUrl } = useRuntimeConfig().public;
  const { header, hero, how, faq, about, apod, menu } = await $fetch<SiteContent>("/api/content");

  // One-line descriptor per route, each pulled from that page's own content.
  const descriptions: Record<string, string> = {
    "/": hero.tagline,
    "/apod": apod.listPage.heading,
    "/how": how.heading,
    "/faq": faq.heading,
    "/about": about.heading,
  };

  const pages = Object.values(menu)
    .map((item) => {
      const desc = descriptions[item.link];
      return `- [${item.label}](${siteUrl}${item.link})${desc ? `: ${desc}` : ""}`;
    })
    .join("\n");

  setHeader(event, "content-type", "text/plain; charset=utf-8");
  return `# ${header.brand}\n\n> ${about.lead1}\n\n## Pages\n${pages}\n`;
});
