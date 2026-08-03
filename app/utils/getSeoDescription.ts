// Two limits, because one string cannot sit in both windows: a SERP snippet is
// cut around 160 characters, a social preview around 125 on mobile.
export const SEO_DESCRIPTION_MAX = 155;
export const SOCIAL_DESCRIPTION_MAX = 120;

/**
 * Normalise NASA copy for a meta tag: one line, typographic apostrophe.
 */
export function getMetaText(text: string): string {
  // The apostrophe is not cosmetics. A straight one inside content="..." breaks
  // parsers that treat ' as a quote: opengraph.xyz reads "NASA's ..." as 29
  // characters and stops there. The typographic form is correct English anyway.
  return text.replace(/\s+/g, " ").trim().replaceAll("'", "’");
}

/**
 * Shorten free-form text (an APOD explanation) to `max`, on a word boundary.
 */
export function getSeoDescription(text: string, max: number): string {
  const clean = getMetaText(text);
  if (clean.length <= max) return clean;

  // The ellipsis has to fit inside `max`, so search one character short of it.
  const window = clean.slice(0, max - 1);
  const lastSpace = window.lastIndexOf(" ");
  const head = lastSpace > 0 ? window.slice(0, lastSpace) : window;

  // A dangling comma before the ellipsis reads like a truncation bug.
  return `${head.replace(/[\s,;:.]+$/, "")}…`;
}
