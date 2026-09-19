import { MovieCard } from "@/components/movie-card";
import type { MediaSummary } from "@/types/media";

const GRID_POSTER_SIZES =
  "(min-width: 1280px) 15vw, (min-width: 1024px) 19vw, (min-width: 768px) 24vw, (min-width: 640px) 32vw, 48vw";

export function MovieGrid({ items }: { items: MediaSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <li key={`${item.mediaType}-${item.id}`}>
          <MovieCard item={item} sizes={GRID_POSTER_SIZES} />
        </li>
      ))}
    </ul>
  );
}
