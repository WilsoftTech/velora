import * as z from "zod";
import { isGenreOf } from "@/lib/tmdb/genres";
import { firstParam, parsePage } from "@/lib/utils";
import type { DiscoverFilters, DiscoverSort } from "@/types/media";

/**
 * The /discover URL contract: parsing, validation and canonical URLs. Free of
 * Next.js imports, like lib/schemas.ts, so a future Expo client can reuse it.
 */

export const DISCOVER_PATH = "/discover";

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  type: "movie",
  genre: null,
  year: null,
  rating: null,
  sort: "popular",
  page: 1,
};

export const DISCOVER_SORTS: { value: DiscoverSort; label: string }[] = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

/** Minimum-rating choices. A TMDB average of 9+ leaves almost nothing worth browsing. */
export const RATING_OPTIONS = [5, 6, 7, 8];

export const MIN_YEAR = 1900;

/** Titles announced for next year are already in TMDB. */
export function maxYear() {
  return new Date().getFullYear() + 1;
}

const wholeNumber = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,5}$/)
    .transform(Number)
    .pipe(z.number().min(min).max(max))
    .nullable()
    .catch(null);

/**
 * Reads /discover query params. Never throws: every invalid, out-of-range or
 * repeated value falls back to its default, and a genre that does not belong to
 * the chosen media type is dropped (movie and TV genre ids differ).
 */
export function parseDiscoverFilters(params: Record<string, string | string[] | undefined>): DiscoverFilters {
  const raw = z
    .object({
      type: z.enum(["movie", "tv"]).catch("movie"),
      genre: wholeNumber(1, 99_999),
      year: wholeNumber(MIN_YEAR, maxYear()),
      rating: wholeNumber(1, 9),
      sort: z.enum(["popular", "rating", "newest"]).catch("popular"),
    })
    .parse({
      type: firstParam(params.type),
      genre: firstParam(params.genre),
      year: firstParam(params.year),
      rating: firstParam(params.rating),
      sort: firstParam(params.sort),
    });

  return {
    type: raw.type,
    genre: raw.genre !== null && isGenreOf(raw.type, raw.genre) ? raw.genre : null,
    year: raw.year,
    rating: raw.rating !== null && RATING_OPTIONS.includes(raw.rating) ? raw.rating : null,
    sort: raw.sort,
    page: parsePage(params.page),
  };
}

/** The one canonical URL for a filter set: defaults are omitted and the parameter order is fixed. */
export function discoverHref(input: Partial<DiscoverFilters> = {}) {
  const filters = { ...DEFAULT_DISCOVER_FILTERS, ...input };
  const params = new URLSearchParams();
  if (filters.type !== DEFAULT_DISCOVER_FILTERS.type) params.set("type", filters.type);
  if (filters.genre) params.set("genre", String(filters.genre));
  if (filters.year) params.set("year", String(filters.year));
  if (filters.rating) params.set("rating", String(filters.rating));
  if (filters.sort !== DEFAULT_DISCOVER_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `${DISCOVER_PATH}?${query}` : DISCOVER_PATH;
}

/** True when anything besides the media type narrows or reorders the results. */
export function hasActiveFilters({ genre, year, rating, sort }: DiscoverFilters) {
  return genre !== null || year !== null || rating !== null || sort !== DEFAULT_DISCOVER_FILTERS.sort;
}
