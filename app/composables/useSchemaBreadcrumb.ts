/**
 * BreadcrumbList for the current page, built from the same nav entries the
 * header renders (`content.menu`), so a label can never drift between the
 * visible navigation and the structured data.
 *
 * The trail is always Home -> section, plus the entry title on an APOD detail
 * page. Pass `leaf` for that last crumb; omit it on section pages.
 *
 * Computed once during setup rather than reactively: the site content is already
 * in the Vue Query cache at this point (the plugin awaits its prefetch on the
 * server), and every route change re-runs the page's setup anyway.
 *
 * @param {string} [leaf] - label of the final crumb (the current, unlinked page)
 *   when it is not a nav entry itself
 * @return {void} registers the node with useSchemaOrg
 */
export default function useSchemaBreadcrumb(leaf?: string): void {
  const { content } = useSiteContent();
  const route = useRoute();

  const menu = content.value?.menu;
  if (!menu) return;

  const itemListElement: { name: string; item?: string }[] = [
    { name: menu.home.label, item: "/" },
  ];

  // The section this route belongs to: /apod/2026-07-28 still lives under the
  // gallery, mirroring the header's active state.
  const section = [menu.apod, menu.how, menu.faq, menu.about].find((entry) =>
    entry.link === "/apod"
      ? route.path.startsWith("/apod")
      : route.path === entry.link,
  );

  if (section) {
    itemListElement.push({ name: section.label, item: section.link });
    // A leaf crumb carries no `item`: it is the page the user is already on.
    if (leaf) itemListElement.push({ name: leaf });
  }

  useSchemaOrg([defineBreadcrumb({ itemListElement })]);
}
