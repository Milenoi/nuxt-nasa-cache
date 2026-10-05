import type {ApodSourcePort} from "#server/apod/ports";
import type {ApodApiEntry} from "#server/utils/apodSchema";
import getApodApi from "#server/utils/getApodApi";
import {ApodApiEntrySchema, ApodApiListSchema} from "#server/utils/apodSchema";

// Turn any upstream/validation failure into a clean HTTP error, so a bad
// response never reaches the cache.
const toNasaError = (error: unknown) =>
    createError({
        statusCode: (error as { status?: number }).status ?? 502,
        statusMessage: "Failed to fetch or validate data from the NASA APOD API.",
    });

const fetchDetail = async (date: string): Promise<ApodApiEntry> => {
    try {
        return ApodApiEntrySchema.parse(await $fetch(getApodApi({date})));
    } catch (error) {
        throw toNasaError(error);
    }
};

// The endpoint caps a page at 25 entries. The first page reports the page
// count, the rest are fetched in parallel.
const fetchList = async (start: string, end: string): Promise<ApodApiEntry[]> => {
    try {
        const range = {startDate: start, endDate: end};
        const first = await $fetch.raw(getApodApi(range));
        const totalPages = Number(first.headers.get("x-wp-totalpages") ?? 1);

        const rest = await Promise.all(
            Array.from({length: totalPages - 1}, (_, i) =>
                $fetch(getApodApi({...range, page: i + 2})),
            ),
        );

        return [first._data, ...rest].flatMap((page) => ApodApiListSchema.parse(page));
    } catch (error) {
        throw toNasaError(error);
    }
};

export const nasaApodSource: ApodSourcePort = {fetchDetail, fetchList};
