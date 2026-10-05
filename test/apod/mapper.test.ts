import {describe, expect, it} from "vitest";
import {normalizeEntry} from "#server/apod/mapper";
import type {ApodApiEntry} from "#server/utils/apodSchema";

const ASSETS = "https://assets.science.nasa.gov";
const PLACEHOLDER = `${ASSETS}/dynamicimage/assets/science/astro/programs/cosmic-origins/images/misc/news-thumbnail.png?w=594&h=516&fit=clip`;

// Trimmed from real apod-basic responses (Oct 2026), only the markup the mapper reads.
const page = (media: string) =>
    `<html><body><center><h1> Astronomy Picture of the Day </h1><p>2026 October 5<br>${media}</center></body></html>`;

const raw = (over: Partial<ApodApiEntry> = {}): ApodApiEntry => ({
    date: "2026-10-05",
    title: "M104: The Sombrero Galaxy&#039;s Tidal Streams",
    explanation:
        '<strong>Explanation: </strong>A deep image of the <a href="https://en.wikipedia.org/wiki/Sombrero_Galaxy">Sombrero galaxy</a> reveals surprises.' +
        "<br><br><strong>Tomorrow's picture: </strong>a smile",
    media_type: "image",
    permalink: "https://science.nasa.gov/image-article/apod-2026-october-5/",
    hdurl: `${ASSETS}/dynamicimage/assets/science/cds/apod/apod/2026/october/M104_4222.jpg?w=4222&h=2817&fit=clip`,
    copyright: '<a href="https://app.astrobin.com/u/Fox368">Engelbert Vollmer</a>',
    basic_html: page(`<a href="#"><IMG SRC="${ASSETS}/dynamicimage/assets/science/cds/apod/apod/2026/october/M104_4222.jpg" alt=""></a>`),
    ...over,
});

describe("normalizeEntry", () => {
    it("takes the image from the page markup, never the article link", () => {
        const entry = normalizeEntry(raw());

        expect(entry.url).toBe(`${ASSETS}/dynamicimage/assets/science/cds/apod/apod/2026/october/M104_4222.jpg`);
        expect(entry.hdurl).toContain("M104_4222.jpg?w=4222");
    });

    it("reads the image size from the CDN query", () => {
        const entry = normalizeEntry(raw());

        expect(entry.width).toBe(4222);
        expect(entry.height).toBe(2817);
    });

    it("cleans title and explanation into plain text", () => {
        const entry = normalizeEntry(raw());

        expect(entry.title).toBe("M104: The Sombrero Galaxy's Tidal Streams");
        expect(entry.explanation).toBe("A deep image of the Sombrero galaxy reveals surprises.");
    });

    it("undoes the space before punctuation in archive text", () => {
        const entry = normalizeEntry(raw({explanation: '<strong>Explanation:</strong> the <a href="#">Pleiades</a> .'}));

        expect(entry.explanation).toBe("the Pleiades.");
    });

    it("ignores the generic placeholder and falls back to the page image", () => {
        const gif = `${ASSETS}/content/dam/science/cds/apod/apod/1995/june/e_lens.gif`;
        const entry = normalizeEntry(raw({hdurl: PLACEHOLDER, basic_html: page(`<IMG SRC="${gif}">`)}));

        expect(entry.url).toBe(gif);
        expect(entry.hdurl).toBe(gif);
        expect(entry.width).toBeNull();
    });

    describe("videos", () => {
        it("plays a self-hosted file and uses the snapshot as thumbnail", () => {
            const mp4 = `${ASSETS}/content/dam/science/cds/apod/apod/2026/september/Comet.mp4`;
            const snapshot = `${ASSETS}/dynamicimage/assets/science/cds/apod/apod/2026/september/Comet_snapshot.png?w=1080&h=1350`;
            const entry = normalizeEntry(raw({
                media_type: "video",
                hdurl: snapshot,
                basic_html: page(`<video controls><source src="${mp4}" type="video/mp4"></video>`),
            }));

            expect(entry.mediaType).toBe("video");
            expect(entry.url).toBe(mp4);
            expect(entry.hdurl).toBeNull();
            expect(entry.thumbnailUrl).toBe(snapshot);
        });

        it("makes a protocol-relative YouTube embed absolute and derives its thumbnail", () => {
            const entry = normalizeEntry(raw({
                media_type: "video",
                hdurl: PLACEHOLDER,
                basic_html: page('<iframe width="960" src="//www.youtube.com/embed/UgxWkOXcdZU?rel=0"></iframe>'),
            }));

            expect(entry.url).toBe("https://www.youtube.com/embed/UgxWkOXcdZU?rel=0");
            expect(entry.thumbnailUrl).toBe("https://img.youtube.com/vi/UgxWkOXcdZU/hqdefault.jpg");
        });
    });

    describe("copyright", () => {
        it("keeps a bare name, the way current entries credit a copyright holder", () => {
            expect(normalizeEntry(raw()).copyright).toBe("Engelbert Vollmer");
        });

        it("strips a copyright label", () => {
            const entry = normalizeEntry(raw({copyright: '<b> Image Credit &amp; <a href="#">Copyright</a>: </b> <a href="#">Robert Schwarz</a>'}));

            expect(entry.copyright).toBe("Robert Schwarz");
        });

        it("drops a plain credit, which marks a public domain image", () => {
            const entry = normalizeEntry(raw({copyright: '<strong>Image Credit:</strong> <a href="#">NASA</a>, <a href="#">JPL-Caltech</a>'}));

            expect(entry.copyright).toBeNull();
        });

        it("treats an empty field as no copyright", () => {
            expect(normalizeEntry(raw({copyright: ""})).copyright).toBeNull();
        });
    });
});
