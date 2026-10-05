import { z } from "zod";

// Source of truth for the raw response of NASA's `apod-basic` endpoint. The TS
// type is inferred from the schema, so it can never drift from what we actually
// validate at runtime. Text fields arrive as HTML; the mapper cleans them.
export const ApodApiEntrySchema = z.object({
  date: z.string(),
  title: z.string(),
  explanation: z.string(),
  media_type: z.string(),
  permalink: z.string(),
  hdurl: z.string().nullish(),
  copyright: z.string().nullish(),
  alt: z.string().nullish(),
  // The legacy single-page markup. `url` in the JSON is the article link, not
  // the media, so the real image or video source is only found in here.
  basic_html: z.string().nullish(),
});

export const ApodApiListSchema = z.array(ApodApiEntrySchema);

export type ApodApiEntry = z.infer<typeof ApodApiEntrySchema>;
