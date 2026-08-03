import { describe, expect, it } from "vitest";
import {
  getSeoDescription,
  SEO_DESCRIPTION_MAX,
  SOCIAL_DESCRIPTION_MAX,
} from "../app/utils/getSeoDescription";

describe("getSeoDescription", () => {
  it("leaves text that already fits untouched", () => {
    expect(getSeoDescription("Short enough.", 40)).toBe("Short enough.");
  });

  it("collapses the line breaks NASA sends", () => {
    expect(getSeoDescription("A nebula\n  glowing\tpink", 40)).toBe(
      "A nebula glowing pink",
    );
  });

  it("never exceeds the limit, ellipsis included", () => {
    const text = "word ".repeat(80);
    for (const max of [20, SOCIAL_DESCRIPTION_MAX, SEO_DESCRIPTION_MAX]) {
      expect(getSeoDescription(text, max).length).toBeLessThanOrEqual(max);
    }
  });

  it("cuts on a word boundary, not mid-word", () => {
    expect(getSeoDescription("alpha beta gamma delta", 16)).toBe("alpha beta…");
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(getSeoDescription("alpha beta, gamma delta", 18)).toBe(
      "alpha beta…",
    );
  });

  it("falls back to a hard cut when there is no boundary to use", () => {
    expect(getSeoDescription("Supermassiveblackhole", 10)).toBe(
      "Supermass…",
    );
  });

  it("handles empty text", () => {
    expect(getSeoDescription("", SEO_DESCRIPTION_MAX)).toBe("");
  });
});
