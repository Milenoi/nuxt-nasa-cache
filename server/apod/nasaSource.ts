import type {ZodType} from "zod";
import type {ApodSourcePort} from "#server/apod/ports";
import getApodApi from "#server/utils/getApodApi";
import {ApodApiEntrySchema, ApodApiListSchema} from "#server/utils/apodSchema";

// Fetch from NASA and validate with Zod; turn any upstream/validation failure
// into a clean HTTP error, so a bad response never reaches the cache.
const fetchFromNasa = async <T>(url: string, schema: ZodType<T>): Promise<T> => {
    try {
        return schema.parse(await $fetch(url));
    } catch (error) {
        const status = (error as { status?: number }).status ?? 502;
        throw createError({
            statusCode: status,
            statusMessage: "Failed to fetch or validate data from the NASA APOD API.",
        });
    }
};

export const nasaApodSource: ApodSourcePort = {
    fetchDetail: (date) => fetchFromNasa(getApodApi({date}), ApodApiEntrySchema),
    fetchList: (start, end) =>
        fetchFromNasa(getApodApi({startDate: start, endDate: end}), ApodApiListSchema),
};
