import type { CastMember, DiscoverFilters, Media, MediaDetail, MediaType } from "@/types/media";
import { genreNames } from "./genres";

/**
 * Small built-in catalogue used when no TMDB credentials are configured, so the
 * app is fully browsable in a fresh checkout. Ids and artwork paths are real
 * TMDB values; anything else is placeholder copy.
 */
const SAMPLE_MEDIA: Media[] = [
  {
    id: 693134,
    mediaType: "movie",
    title: "Dune: Part Two",
    overview:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    posterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdropPath: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    releaseYear: 2024,
    rating: 8.8,
    genres: ["Sci-Fi", "Adventure"],
  },
  {
    id: 872585,
    mediaType: "movie",
    title: "Oppenheimer",
    overview:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdropPath: "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    releaseYear: 2023,
    rating: 8.3,
    genres: ["Drama", "History"],
  },
  {
    id: 533535,
    mediaType: "movie",
    title: "Deadpool & Wolverine",
    overview:
      "A listless Wade Wilson toils away in civilian life until his days as a morally flexible mercenary come calling.",
    posterPath: "/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    backdropPath: "/dvBCdCohwWbsP5qAaglOXagDMtk.jpg",
    releaseYear: 2024,
    rating: 7.8,
    genres: ["Action", "Comedy", "Sci-Fi"],
  },
  {
    id: 1022789,
    mediaType: "movie",
    title: "Inside Out 2",
    overview:
      "Riley enters puberty and new emotions arrive at headquarters, shaking up everything Joy and the others thought they knew.",
    posterPath: "/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
    backdropPath: "/stKGOm8UyhuLPR9sZLjs5AkmncA.jpg",
    releaseYear: 2024,
    rating: 7.9,
    genres: ["Animation", "Family", "Comedy"],
  },
  {
    id: 100088,
    mediaType: "tv",
    title: "The Last of Us",
    overview:
      "Twenty years after modern civilization has been destroyed, a hardened survivor is hired to smuggle a 14-year-old girl out of a quarantine zone.",
    posterPath: "/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg",
    backdropPath: "/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
    releaseYear: 2023,
    rating: 8.7,
    genres: ["Drama", "Action", "Adventure"],
  },
  {
    id: 157336,
    mediaType: "movie",
    title: "Interstellar",
    overview:
      "A team of explorers travels through a wormhole in space in an attempt to ensure humanity's survival.",
    posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropPath: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    releaseYear: 2014,
    rating: 8.7,
    genres: ["Adventure", "Drama", "Sci-Fi"],
  },
  {
    id: 414906,
    mediaType: "movie",
    title: "The Batman",
    overview:
      "In his second year fighting crime, Batman uncovers corruption in Gotham City that connects to his own family.",
    posterPath: "/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    backdropPath: "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    releaseYear: 2022,
    rating: 7.8,
    genres: ["Crime", "Mystery", "Thriller"],
  },
  {
    id: 194764,
    mediaType: "tv",
    title: "The Penguin",
    overview:
      "Oz Cobb makes his ruthless rise to power through Gotham's criminal underworld in the aftermath of the Riddler's attack.",
    posterPath: null,
    backdropPath: null,
    releaseYear: 2024,
    rating: 8.4,
    genres: ["Crime", "Drama"],
  },
  {
    id: 106379,
    mediaType: "tv",
    title: "Fallout",
    overview:
      "Two hundred years after the apocalypse, a vault dweller ventures to the wasteland and finds a world far stranger than she expected.",
    posterPath: "/AnsSKR9LuK0T9bAOcPVA3PUvyWj.jpg",
    backdropPath: null,
    releaseYear: 2024,
    rating: 8.5,
    genres: ["Sci-Fi", "Adventure"],
  },
  {
    id: 1011985,
    mediaType: "movie",
    title: "Kung Fu Panda 4",
    overview:
      "Po must train a new Dragon Warrior while facing a shapeshifting sorceress who plans to steal the masters' powers.",
    posterPath: "/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg",
    backdropPath: null,
    releaseYear: 2024,
    rating: 7.1,
    genres: ["Animation", "Action", "Comedy"],
  },
  {
    id: 346698,
    mediaType: "movie",
    title: "Barbie",
    overview:
      "Barbie and Ken are having the time of their lives in Barbie Land until they venture into the real world.",
    posterPath: "/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
    backdropPath: null,
    releaseYear: 2023,
    rating: 7.1,
    genres: ["Comedy", "Adventure", "Fantasy"],
  },
  {
    id: 569094,
    mediaType: "movie",
    title: "Spider-Man: Across the Spider-Verse",
    overview:
      "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
    posterPath: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdropPath: null,
    releaseYear: 2023,
    rating: 8.6,
    genres: ["Animation", "Action", "Adventure"],
  },
  {
    id: 372058,
    mediaType: "movie",
    title: "Your Name.",
    overview:
      "Two strangers find themselves linked in a bizarre way when they wake up in each other's bodies.",
    posterPath: "/q719jXXEzOoYaps6babgKnONONX.jpg",
    backdropPath: null,
    releaseYear: 2016,
    rating: 8.4,
    genres: ["Romance", "Animation", "Drama"],
  },
  {
    id: 438631,
    mediaType: "movie",
    title: "Dune",
    overview:
      "Paul Atreides, a brilliant young man born into a great destiny, must travel to the most dangerous planet in the universe.",
    posterPath: null,
    backdropPath: null,
    releaseYear: 2021,
    rating: 8.0,
    genres: ["Sci-Fi", "Adventure"],
  },
];

const SAMPLE_CAST: Record<number, CastMember[]> = {
  693134: [
    { id: 1190668, name: "Timothée Chalamet", character: "Paul Atreides", profilePath: null },
    { id: 505710, name: "Zendaya", character: "Chani", profilePath: null },
    { id: 11045, name: "Rebecca Ferguson", character: "Lady Jessica", profilePath: null },
    { id: 19292, name: "Javier Bardem", character: "Stilgar", profilePath: null },
  ],
  100088: [
    { id: 1253360, name: "Pedro Pascal", character: "Joel Miller", profilePath: null },
    { id: 2075649, name: "Bella Ramsey", character: "Ellie", profilePath: null },
  ],
  872585: [
    { id: 2037, name: "Cillian Murphy", character: "J. Robert Oppenheimer", profilePath: null },
    { id: 5081, name: "Emily Blunt", character: "Kitty Oppenheimer", profilePath: null },
  ],
};

interface SampleQuery {
  mediaType?: MediaType;
  search?: string;
}

export function sampleMedia({ mediaType, search }: SampleQuery = {}) {
  const term = search?.trim().toLowerCase();
  return SAMPLE_MEDIA.filter(
    (item) =>
      (!mediaType || item.mediaType === mediaType) &&
      (!term || item.title.toLowerCase().includes(term)),
  );
}

/** /discover over the sample catalogue. Genres are matched by name, since the samples carry names only. */
export function sampleDiscover({ type, genre, year, rating, sort }: Omit<DiscoverFilters, "page">) {
  const [genreName] = genreNames(genre ? [genre] : []);
  const matches = sampleMedia({ mediaType: type }).filter(
    (item) =>
      (!genre || (genreName !== undefined && item.genres.includes(genreName))) &&
      (!year || item.releaseYear === year) &&
      (!rating || (item.rating ?? 0) >= rating),
  );
  if (sort === "rating") return matches.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (sort === "newest") return matches.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
  return matches;
}

export function sampleDetail(mediaType: MediaType, id: number): MediaDetail | null {
  const item = SAMPLE_MEDIA.find((candidate) => candidate.mediaType === mediaType && candidate.id === id);
  if (!item) return null;
  return {
    ...item,
    tagline: "",
    runtimeMinutes: mediaType === "movie" ? 120 : 55,
    seasons: mediaType === "tv" ? 2 : null,
    trailerKey: null,
    cast: SAMPLE_CAST[id] ?? [],
    similar: sampleMedia({ mediaType }).filter((other) => other.id !== id),
  };
}
