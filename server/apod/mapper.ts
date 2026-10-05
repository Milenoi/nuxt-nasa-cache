import type {ApodApiEntry} from "#server/utils/apodSchema";
import type {ApodEntry, ApodMediaType} from "#shared/types";
import {getFormatDate} from "#server/utils/helpers";
import {decodeEntities, htmlToText} from "#server/utils/apodHtml";

const RANGE_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

// Date -> "YYYY-MM-DD" in UTC.
export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

// NASA's free-text media_type -> our strict union.
export const toMediaType = (raw: string): ApodMediaType => {
    if (raw === "image") return "image";
    if (raw === "video") return "video";
    return "other";
};

// NASA's generic stand-in, sent as `hdurl` when an entry has no featured image
// of its own (most of the early archive, many video days). It is not the APOD.
const PLACEHOLDER_IMAGE = "/cosmic-origins/images/misc/news-thumbnail";

const realImage = (url: string | null | undefined): string | null =>
    url && !url.includes(PLACEHOLDER_IMAGE) ? url : null;

// The first <img>, <iframe> or <source> in the legacy page is the featured
// media: the header above it carries none, the explanation sits below it.
const mediaSource = (html: string | null | undefined): string | null => {
    const src = html?.match(/<(?:img|iframe|source)\b[^>]*?\bsrc="([^"]+)"/i)?.[1];
    if (!src) return null;
    const url = decodeEntities(src);
    return url.startsWith("//") ? `https:${url}` : url;
};

// The image CDN encodes the original size as `?w=&h=` with `fit=clip`, which
// saves probing the file (the probe returns null in production anyway).
const sizeFromUrl = (url: string | null): { width: number | null; height: number | null } => {
    const params = url ? new URL(url).searchParams : null;
    const width = Number(params?.get("w")) || null;
    const height = Number(params?.get("h")) || null;
    return width && height ? {width, height} : {width: null, height: null};
};

const youtubeThumbnail = (url: string): string | null => {
    const id = url.match(/youtube\.com\/embed\/([\w-]{11})/)?.[1];
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

// Notes like "Tomorrow's picture" or a submissions notice follow the text after
// a double line break. They belong to the day's page, not to the explanation.
const NOTES_BREAK = /<br\s*\/?>\s*<br\s*\/?>/i;

const toExplanation = (html: string): string =>
    htmlToText(html.split(NOTES_BREAK)[0] ?? html).replace(/^Explanation:\s*/i, "");

// The field holds every credit, but only a credit labelled "Copyright" (or a bare
// name, how current entries are written) is one. "Image Credit: NASA" is public
// domain and falls back to the NASA credit, like the legacy API's empty field.
const toCopyright = (html: string | null | undefined): string | null => {
    const text = htmlToText(html ?? "");
    const label = text.match(/^[^:]*\bcredit\b[^:]*:\s*/i)?.[0];
    if (label && !/copyright/i.test(label)) return null;
    return text.slice(label?.length ?? 0).trim() || null;
};

// Raw NASA entry -> the shape the UI consumes.
export const normalizeEntry = (raw: ApodApiEntry): ApodEntry => {
    const mediaType = toMediaType(raw.media_type);
    const preview = realImage(raw.hdurl);
    const source = mediaSource(raw.basic_html);

    const media =
        mediaType === "image"
            ? {
                url: source ?? preview ?? raw.permalink,
                hdurl: preview ?? source,
                thumbnailUrl: null,
                ...sizeFromUrl(preview),
            }
            : {
                url: source ?? raw.permalink,
                hdurl: null,
                thumbnailUrl: preview ?? (source ? youtubeThumbnail(source) : null),
                width: null,
                height: null,
            };

    return {
        date: raw.date,
        title: decodeEntities(raw.title),
        explanation: toExplanation(raw.explanation),
        mediaType,
        copyright: toCopyright(raw.copyright),
        formattedDate: getFormatDate(raw.date),
        ...media,
    };
};

// The list window: the last RANGE_DAYS days, ending yesterday. `now` is
// injectable so a test can pin it to a fixed instant.
export const listRange = (now: number = Date.now()): { start: string; end: string } => {
    const endDate = new Date(now - DAY_MS);
    const startDate = new Date(endDate.getTime() - (RANGE_DAYS - 1) * DAY_MS);
    return {start: toIsoDate(startDate), end: toIsoDate(endDate)};
};

// Cache keys, in one place so nothing can drift.
export const listKey = (start: string, end: string): string => `apod:list:${start}_${end}`;
export const detailKey = (date: string): string => `apod:detail:${date}`;
