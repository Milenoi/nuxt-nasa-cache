import { describe, expect, it } from "vitest";
import type { ApodEntry } from "../shared/types";
import {
  getApodImageNode,
  getApodListItems,
  getApodVideoNode,
} from "../app/utils/getApodSchema";

const SITE = "https://example.com";

function makeEntry(overrides: Partial<ApodEntry> = {}): ApodEntry {
  return {
    date: "2026-07-28",
    title: "A Spiral Galaxy",
    explanation: "A very distant spiral galaxy.",
    mediaType: "image",
    url: "https://apod.nasa.gov/apod/image/2607/galaxy1024.jpg",
    hdurl: "https://apod.nasa.gov/apod/image/2607/galaxy4096.jpg",
    thumbnailUrl: null,
    copyright: "Jane Astronomer",
    formattedDate: "Jul 28, 2026",
    width: 4096,
    height: 2731,
    ...overrides,
  };
}

describe("getApodImageNode", () => {
  it("types the node as an ImageObject", () => {
    expect(getApodImageNode(makeEntry())["@type"]).toBe("ImageObject");
  });

  it("prefers hdurl as contentUrl and keeps url as the displayed image", () => {
    const node = getApodImageNode(makeEntry());

    expect(node.url).toBe("https://apod.nasa.gov/apod/image/2607/galaxy1024.jpg");
    expect(node.contentUrl).toBe(
      "https://apod.nasa.gov/apod/image/2607/galaxy4096.jpg",
    );
  });

  it("falls back to url when there is no hdurl", () => {
    const node = getApodImageNode(makeEntry({ hdurl: null }));

    expect(node.contentUrl).toBe(node.url);
  });

  it("carries the entry copyright as credit and copyright notice", () => {
    const node = getApodImageNode(makeEntry());

    expect(node.creditText).toBe("Jane Astronomer");
    expect(node.copyrightNotice).toBe("Jane Astronomer");
  });

  it("credits NASA when the entry has no copyright", () => {
    const node = getApodImageNode(makeEntry({ copyright: null }));

    expect(node.creditText).toBe("NASA");
    expect(node.copyrightNotice).toBe("NASA");
  });

  it("sets the probed dimensions", () => {
    const node = getApodImageNode(makeEntry());

    expect(node.width).toBe(4096);
    expect(node.height).toBe(2731);
  });

  it("omits the dimensions entirely when probing failed", () => {
    const node = getApodImageNode(makeEntry({ width: null, height: null }));

    expect(node).not.toHaveProperty("width");
    expect(node).not.toHaveProperty("height");
  });

  it("omits thumbnailUrl when there is none", () => {
    expect(getApodImageNode(makeEntry())).not.toHaveProperty("thumbnailUrl");
  });

  it("uses the APOD date as datePublished", () => {
    expect(getApodImageNode(makeEntry()).datePublished).toBe("2026-07-28");
  });
});

describe("getApodVideoNode", () => {
  const videoEntry = (url: string, overrides: Partial<ApodEntry> = {}) =>
    makeEntry({
      mediaType: "video",
      url,
      hdurl: null,
      thumbnailUrl: "https://img.youtube.com/vi/abc/hqdefault.jpg",
      ...overrides,
    });

  it("types the node as a VideoObject", () => {
    const node = getApodVideoNode(
      videoEntry("https://www.youtube.com/embed/abc"),
      SITE,
    );

    expect(node["@type"]).toBe("VideoObject");
  });

  it("treats a YouTube URL as an embedUrl", () => {
    const node = getApodVideoNode(
      videoEntry("https://www.youtube.com/embed/abc"),
      SITE,
    );

    expect(node.embedUrl).toBe("https://www.youtube.com/embed/abc");
    expect(node).not.toHaveProperty("contentUrl");
  });

  it("treats a Vimeo URL as an embedUrl", () => {
    const node = getApodVideoNode(videoEntry("https://vimeo.com/12345"), SITE);

    expect(node.embedUrl).toBe("https://vimeo.com/12345");
  });

  it("treats a direct media file as a contentUrl", () => {
    const node = getApodVideoNode(
      videoEntry("https://apod.nasa.gov/apod/video/clip.mp4"),
      SITE,
    );

    expect(node.contentUrl).toBe("https://apod.nasa.gov/apod/video/clip.mp4");
    expect(node).not.toHaveProperty("embedUrl");
  });

  it("treats an unknown external URL as an embedUrl", () => {
    const node = getApodVideoNode(
      videoEntry("https://example.org/player/xyz"),
      SITE,
    );

    expect(node.embedUrl).toBe("https://example.org/player/xyz");
  });

  it("points url at the detail page, not at the player", () => {
    const node = getApodVideoNode(
      videoEntry("https://www.youtube.com/embed/abc"),
      SITE,
    );

    expect(node.url).toBe("https://example.com/apod/2026-07-28");
  });

  it("uses the APOD date as uploadDate and keeps the poster", () => {
    const node = getApodVideoNode(
      videoEntry("https://www.youtube.com/embed/abc"),
      SITE,
    );

    expect(node.uploadDate).toBe("2026-07-28");
    expect(node.thumbnailUrl).toBe("https://img.youtube.com/vi/abc/hqdefault.jpg");
  });

  it("omits creditText when the entry has no copyright", () => {
    const node = getApodVideoNode(
      videoEntry("https://www.youtube.com/embed/abc", { copyright: null }),
      SITE,
    );

    expect(node).not.toHaveProperty("creditText");
  });
});

describe("getApodListItems", () => {
  it("numbers positions from 1", () => {
    const items = getApodListItems(
      [
        makeEntry({ date: "2026-07-28" }),
        makeEntry({ date: "2026-07-27" }),
        makeEntry({ date: "2026-07-26" }),
      ],
      SITE,
    );

    expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it("links each item to its detail page", () => {
    const [item] = getApodListItems([makeEntry({ date: "2026-07-01" })], SITE);

    expect(item?.url).toBe("https://example.com/apod/2026-07-01");
    expect(item?.["@type"]).toBe("ListItem");
  });

  it("uses the entry url as image for image entries", () => {
    const [item] = getApodListItems([makeEntry()], SITE);

    expect(item?.image).toBe(
      "https://apod.nasa.gov/apod/image/2607/galaxy1024.jpg",
    );
  });

  it("uses the poster as image for video entries", () => {
    const [item] = getApodListItems(
      [
        makeEntry({
          mediaType: "video",
          url: "https://www.youtube.com/embed/abc",
          thumbnailUrl: "https://img.youtube.com/vi/abc/hqdefault.jpg",
        }),
      ],
      SITE,
    );

    expect(item?.image).toBe("https://img.youtube.com/vi/abc/hqdefault.jpg");
  });

  it("omits the image when a video has no poster", () => {
    const [item] = getApodListItems(
      [
        makeEntry({
          mediaType: "video",
          url: "https://www.youtube.com/embed/abc",
          thumbnailUrl: null,
        }),
      ],
      SITE,
    );

    expect(item).not.toHaveProperty("image");
  });

  it("returns an empty list for no entries", () => {
    expect(getApodListItems([], SITE)).toEqual([]);
  });
});
