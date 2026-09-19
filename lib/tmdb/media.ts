import type {
  BrowseList,
  CastMember,
  Media,
  MediaDetail,
  MediaPage,
  MediaRef,
  MediaSummary,
  MediaType,
  SearchScope,
} from "@/types/media";
import { isTmdbConfigured, tmdbFetch, tmdbFetchPage } from "./client";
import { genreNames, shortGenreName } from "./genres";
import { sampleDetail, sampleMedia } from "./sample";
import { normalizeSearchQuery, toSummary } from "@/lib/utils";
import type { TmdbDetail, TmdbPaged, TmdbResult } from "./types";

const YOUTUBE_KEY = /^[\w-]{6,20}$/;
const CAST_LIMIT = 16;

let warnedAboutSampleData = false;

function usingSampleData() {
  if (isTmdbConfigured()) return false;
  if (!warnedAboutSampleData) {
    warnedAboutSampleData = true;
    console.warn("TMDB_ACCESS_TOKEN / TMDB_API_KEY is not set — serving the built-in sample catalogue.");
  }
  return true;
}

function toYear(date: string | undefined) {
  const year = Number.parseInt(date?.slice(0, 4) ?? "", 10);
  return Number.isNaN(year) ? null : year;
}

function toMedia(raw: TmdbResult, fallbackType?: MediaType): Media | null {
  const mediaType = raw.media_type ?? fallbackType;
  if (mediaType !== "movie" && mediaType !== "tv") return null; // people, etc.
  const title = raw.title ?? raw.name;
  if (!title) return null;

  return {
    id: raw.id,
    mediaType,
    title,
    overview: raw.overview ?? "",
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    releaseYear: toYear(raw.release_date ?? raw.first_air_date),
    rating: raw.vote_count ? Math.round((raw.vote_average ?? 0) * 10) / 10 : null,
    genres: genreNames(raw.genre_ids),
  };
}

function toMediaPage(data: TmdbPaged<TmdbResult>, fallbackType?: MediaType): MediaPage {
  return {
    items: data.results.flatMap((raw) => toMedia(raw, fallbackType) ?? []),
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
  };
}

// The sample catalogue is a single page, like a short TMDB list.
function samplePage(items: Media[], page: number): MediaPage {
  return { items: page === 1 ? items : [], page, totalPages: 1 };
}

export async function getTrending(page = 1): Promise<MediaPage> {
  if (usingSampleData()) return samplePage(sampleMedia(), page);
  return toMediaPage(await tmdbFetchPage<TmdbResult>("/trending/all/week", { page }));
}

export async function getMovies(list: BrowseList, page = 1): Promise<MediaPage> {
  if (usingSampleData()) return samplePage(sampleMedia({ mediaType: "movie" }), page);
  return toMediaPage(await tmdbFetchPage<TmdbResult>(`/movie/${list}`, { page }), "movie");
}

export async function getShows(list: BrowseList, page = 1): Promise<MediaPage> {
  if (usingSampleData()) return samplePage(sampleMedia({ mediaType: "tv" }), page);
  return toMediaPage(await tmdbFetchPage<TmdbResult>(`/tv/${list}`, { page }), "tv");
}

export async function searchMedia(rawQuery: string, scope: SearchScope = "all"): Promise<MediaPage> {
  const query = normalizeSearchQuery(rawQuery);
  if (usingSampleData()) {
    return samplePage(sampleMedia({ mediaType: scope === "all" ? undefined : scope, search: query }), 1);
  }
  const endpoint = scope === "all" ? "multi" : scope;
  const data = await tmdbFetchPage<TmdbResult>(`/search/${endpoint}`, {
    query,
    include_adult: "false",
  });
  return toMediaPage(data, scope === "all" ? undefined : scope);
}

function pickTrailerKey(videos: TmdbDetail["videos"]) {
  const youtube = (videos?.results ?? []).filter(
    (video) => video.site === "YouTube" && YOUTUBE_KEY.test(video.key),
  );
  const best =
    youtube.find((video) => video.type === "Trailer" && video.official) ??
    youtube.find((video) => video.type === "Trailer") ??
    youtube.find((video) => video.type === "Teaser");
  return best?.key ?? null;
}

function toCast(credits: TmdbDetail["credits"]): CastMember[] {
  return (credits?.cast ?? []).slice(0, CAST_LIMIT).map((person) => ({
    id: person.id,
    name: person.name,
    character: person.character ?? "",
    profilePath: person.profile_path ?? null,
  }));
}

const SUMMARY_BATCH = 20;

/**
 * Card-sized data for a set of saved titles, in the order given. TMDB stays the
 * source of truth: only ids are stored, and these lookups ride the same hourly
 * fetch cache as every other TMDB call. Titles TMDB no longer has are dropped;
 * any other failure throws, so a flaky lookup can never look like a shorter list.
 */
export async function getMediaSummaries(refs: MediaRef[]): Promise<MediaSummary[]> {
  const summaries: (MediaSummary | null)[] = [];
  // Small batches keep a long list from bursting past TMDB's rate limit.
  for (let start = 0; start < refs.length; start += SUMMARY_BATCH) {
    const batch = refs.slice(start, start + SUMMARY_BATCH);
    summaries.push(...(await Promise.all(batch.map(getMediaSummary))));
  }
  return summaries.flatMap((summary) => summary ?? []);
}

async function getMediaSummary({ mediaType, id }: MediaRef): Promise<MediaSummary | null> {
  if (usingSampleData()) {
    const sample = sampleDetail(mediaType, id);
    return sample && toSummary(sample);
  }
  const raw = await tmdbFetch<TmdbResult>(`/${mediaType}/${id}`);
  const media = raw && toMedia(raw, mediaType);
  return media && toSummary(media);
}

export async function getMediaDetail(mediaType: MediaType, id: number): Promise<MediaDetail | null> {
  if (usingSampleData()) return sampleDetail(mediaType, id);

  const raw = await tmdbFetch<TmdbDetail>(`/${mediaType}/${id}`, {
    append_to_response: "credits,videos,similar",
  });
  if (!raw) return null;
  const base = toMedia(raw, mediaType);
  if (!base) return null;

  return {
    ...base,
    genres: (raw.genres ?? []).map((genre) => shortGenreName(genre.name)),
    tagline: raw.tagline ?? "",
    runtimeMinutes: raw.runtime ?? raw.episode_run_time?.[0] ?? null,
    seasons: raw.number_of_seasons ?? null,
    trailerKey: pickTrailerKey(raw.videos),
    cast: toCast(raw.credits),
    similar: (raw.similar?.results ?? []).flatMap((item) => toMedia(item, mediaType) ?? []),
  };
}
