export type MediaType = "movie" | "tv";

/** The fields needed to render a card or a list row, and to persist My List. */
export interface MediaSummary {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  /** TMDB average on a 0–10 scale, or null when the title is unrated. */
  rating: number | null;
}

/** Identity of a title: all that is persisted for a saved item. */
export type MediaRef = Pick<MediaSummary, "id" | "mediaType">;

export interface Media extends MediaSummary {
  overview: string;
  backdropPath: string | null;
  genres: string[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface MediaDetail extends Media {
  tagline: string;
  runtimeMinutes: number | null;
  seasons: number | null;
  /** YouTube video id of the best available trailer. */
  trailerKey: string | null;
  cast: CastMember[];
  similar: Media[];
}

export interface MediaPage {
  items: Media[];
  page: number;
  totalPages: number;
}

export type BrowseList = "popular" | "top_rated";
export type SearchScope = "all" | MediaType;

/** One remembered search of a signed-in user. `query` is the canonical form the database stored. */
export interface SearchHistoryEntry {
  query: string;
  scope: SearchScope;
}

export type DiscoverSort = "popular" | "rating" | "newest";

/** A validated /discover query. `genre`, `year` and `rating` are null when that filter is off. */
export interface DiscoverFilters {
  type: MediaType;
  /** A TMDB genre id that is valid for `type`. */
  genre: number | null;
  year: number | null;
  /** Minimum TMDB average (whole number). */
  rating: number | null;
  sort: DiscoverSort;
  page: number;
}
