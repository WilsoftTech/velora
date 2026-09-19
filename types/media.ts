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
