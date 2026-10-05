import { describe, expect, it } from "vitest";
import { getApodEmbed } from "../app/utils/getApodEmbed";

describe("getApodEmbed", () => {
  describe("youtube", () => {
    it("classifies a watch URL", () => {
      expect(getApodEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
        type: "youtube",
        src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
    });

    it("classifies a short youtu.be URL", () => {
      const url = "https://youtu.be/dQw4w9WgXcQ";
      expect(getApodEmbed(url)).toEqual({ type: "youtube", src: url });
    });

    it("is case-insensitive on the host", () => {
      const url = "https://www.YouTube.com/embed/abc";
      expect(getApodEmbed(url).type).toBe("youtube");
    });
  });

  describe("vimeo", () => {
    it("classifies a vimeo URL", () => {
      const url = "https://vimeo.com/123456789";
      expect(getApodEmbed(url)).toEqual({ type: "vimeo", src: url });
    });
  });

  describe("file", () => {
    it("classifies a direct mp4", () => {
      const url = "https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2026/july/Auroras_Esa.mp4";
      expect(getApodEmbed(url)).toEqual({ type: "file", src: url });
    });

    it("classifies webm and ogv", () => {
      expect(getApodEmbed("https://x.test/a.webm").type).toBe("file");
      expect(getApodEmbed("https://x.test/a.ogv").type).toBe("file");
    });

    it("classifies a media file with a trailing query string", () => {
      expect(getApodEmbed("https://x.test/a.mp4?v=2").type).toBe("file");
    });

    it("is case-insensitive on the extension", () => {
      expect(getApodEmbed("https://x.test/A.MP4").type).toBe("file");
    });
  });

  describe("external", () => {
    it("falls back to external for anything else", () => {
      const url = "https://example.com/some-interactive-page";
      expect(getApodEmbed(url)).toEqual({ type: "external", src: url });
    });

    it("does not treat an mp4 substring mid-path as a file", () => {
      // The extension must terminate the URL (optionally before a query).
      expect(getApodEmbed("https://x.test/mp4-gallery/index.html").type).toBe(
        "external",
      );
    });
  });
});
