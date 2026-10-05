import type { ApodQueryParams } from "#shared/types";

// The legacy api.nasa.gov/planetary/apod scraper broke when APOD moved to
// science.nasa.gov (Sept 2026) and now returns the NASA logo for every date.
const APOD_BASE = "https://science.nasa.gov/wp-json/wp/v2/apod-basic";

// The endpoint ignores larger values and silently returns 25.
export const APOD_PAGE_SIZE = 25;

// "2026-10-04" -> "261004", the only date format the endpoint accepts.
const toApodDate = (isoDate: string): string => isoDate.slice(2).replaceAll("-", "");

// A range is paginated by the endpoint, so the caller walks it with `page`.
const getApodApi = (params: ApodQueryParams = {}): string => {
  if (params.date) return `${APOD_BASE}/${toApodDate(params.date)}`;

  const search = new URLSearchParams({ per_page: String(APOD_PAGE_SIZE) });

  if (params.startDate) search.set("date_from", toApodDate(params.startDate));
  if (params.endDate) search.set("date_to", toApodDate(params.endDate));
  if (params.page) search.set("page", String(params.page));

  return `${APOD_BASE}?${search.toString()}`;
};

export default getApodApi;
