import type {ApodApiEntry} from "#server/utils/apodSchema";
import type {ApodEntry, ApodMediaType} from "#shared/types";
import {getFormatDate} from "#server/utils/helpers";

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

// Raw NASA entry -> the shape the UI consumes.
export const normalizeEntry = (raw: ApodApiEntry): ApodEntry => ({
    date: raw.date,
    title: raw.title,
    explanation: raw.explanation,
    mediaType: toMediaType(raw.media_type),
    url: raw.url,
    hdurl: raw.hdurl ?? null,
    thumbnailUrl: raw.thumbnail_url || null,
    copyright: raw.copyright?.replace(/\s+/g, " ").trim() || null,
    formattedDate: getFormatDate(raw.date),
    width: null,
    height: null,
});

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
