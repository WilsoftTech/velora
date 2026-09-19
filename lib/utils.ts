import type { BrowseList, MediaSummary, MediaType, SearchScope } from "@/types/media";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Narrows any media object to the fields safe to store or send to the client. */
export function toSummary({ id, mediaType, title, posterPath, releaseYear, rating }: MediaSummary): MediaSummary {
  return { id, mediaType, title, posterPath, releaseYear, rating };
}

export function mediaHref({ mediaType, id }: Pick<MediaSummary, "mediaType" | "id">) {
  return `/${mediaType}/${id}`;
}

export function mediaTypeLabel(mediaType: MediaType) {
  return mediaType === "movie" ? "Movie" : "TV Show";
}

/** Meta-description length: trimmed at a word boundary, undefined when empty. */
export function summarize(text: string, maxLength = 160) {
  const clean = text.trim();
  if (!clean) return undefined;
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).replace(/\s+\S*$/, "")}…`;
}

export function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

type SearchParamValue = string | string[] | undefined;

export function firstParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

// TMDB rejects pages above 500.
const MAX_PAGE = 500;

export function parsePage(value: SearchParamValue) {
  const page = Number.parseInt(firstParam(value) ?? "", 10);
  return Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
}

export function parseBrowseList(value: SearchParamValue): BrowseList {
  return firstParam(value) === "top_rated" ? "top_rated" : "popular";
}

export function parseSearchScope(value: SearchParamValue): SearchScope {
  const scope = firstParam(value);
  return scope === "movie" || scope === "tv" ? scope : "all";
}

export function parseMediaType(value: string): MediaType | null {
  return value === "movie" || value === "tv" ? value : null;
}
