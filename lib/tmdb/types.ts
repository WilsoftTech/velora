// Raw TMDB response shapes. Only the fields Velora reads are declared.

export interface TmdbResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
}

export interface TmdbPaged<T> {
  page: number;
  results: T[];
  total_pages: number;
}

export interface TmdbDetail extends TmdbResult {
  tagline?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: { id: number; name: string; character?: string; profile_path?: string | null }[];
  };
  videos?: {
    results?: { key: string; site: string; type: string; official?: boolean }[];
  };
  similar?: TmdbPaged<TmdbResult>;
}
