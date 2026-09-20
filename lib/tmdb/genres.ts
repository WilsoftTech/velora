import type { MediaType } from "@/types/media";

// TMDB genre ids are stable, so they are mapped locally instead of spending a
// request on /genre/*/list.
const GENRE_NAMES: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Sci-Fi",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  10770: "TV Movie",
};

// Movies and TV use different genre lists, and /discover only accepts a genre
// from the list of the type being browsed. Checked against TMDB's
// /genre/movie/list and /genre/tv/list on 2026-09-20.
const GENRE_IDS: Record<MediaType, number[]> = {
  movie: [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37],
  tv: [10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766, 10767, 10768, 37],
};

export function genreNames(ids: number[] | undefined) {
  return (ids ?? []).flatMap((id) => GENRE_NAMES[id] ?? []);
}

export function isGenreOf(mediaType: MediaType, id: number) {
  return GENRE_IDS[mediaType].includes(id);
}

/** Filter choices for a media type, alphabetical. */
export function genreOptions(mediaType: MediaType) {
  return GENRE_IDS[mediaType]
    .map((id) => ({ id, name: GENRE_NAMES[id] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Shortens TMDB's verbose names, e.g. "Science Fiction" → "Sci-Fi". */
export function shortGenreName(name: string) {
  return name === "Science Fiction" ? "Sci-Fi" : name;
}
