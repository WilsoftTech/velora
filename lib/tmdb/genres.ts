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
  10765: "Sci-Fi & Fantasy",
  10768: "War & Politics",
};

export function genreNames(ids: number[] | undefined) {
  return (ids ?? []).flatMap((id) => GENRE_NAMES[id] ?? []);
}

/** Shortens TMDB's verbose names, e.g. "Science Fiction" → "Sci-Fi". */
export function shortGenreName(name: string) {
  return name === "Science Fiction" ? "Sci-Fi" : name;
}
