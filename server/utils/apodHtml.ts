const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// One pass on purpose: decoding `&amp;` first would turn `&amp;lt;` into `<`.
export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, code: string) => {
    if (code[0] !== "#") return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    const point =
      code[1] === "x" || code[1] === "X"
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10);
    return Number.isNaN(point) ? match : String.fromCodePoint(point);
  });

// Block tags become a space so words on either side don't fuse. The archive was
// converted from old HTML with a space before punctuation ("cluster</a> ."),
// which is undone at the end.
export const htmlToText = (html: string): string =>
  decodeEntities(
    html
      .replace(/<(?:br|p|div)\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
