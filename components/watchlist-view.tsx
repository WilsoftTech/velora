"use client";

import Link from "next/link";
import { Bookmark, X } from "lucide-react";
import { buttonClass } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { MovieListItem } from "@/components/movie-list-item";
import { ListSkeleton } from "@/components/skeletons";
import { useWatchlist } from "@/lib/watchlist";
import type { MediaType } from "@/types/media";

const COPY: Record<MediaType, { empty: string; explore: string; href: string }> = {
  movie: { empty: "No movies saved yet", explore: "Explore Movies", href: "/movies" },
  tv: { empty: "No shows saved yet", explore: "Explore TV Shows", href: "/tv" },
};

export function WatchlistView({ mediaType }: { mediaType: MediaType }) {
  const { items, remove } = useWatchlist();

  // Storage is only readable in the browser; avoid flashing a false empty state.
  if (items === null) return <ListSkeleton />;

  const visible = items.filter((item) => item.mediaType === mediaType);
  const copy = COPY[mediaType];

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="size-6" />}
        title={copy.empty}
        description="Save titles you want to watch later and they'll show up here."
      >
        <Link href={copy.href} className={buttonClass("primary")}>
          {copy.explore}
        </Link>
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-x-10 md:grid-cols-2">
      {visible.map((item) => (
        <MovieListItem
          key={`${item.mediaType}-${item.id}`}
          item={item}
          action={
            <button
              type="button"
              aria-label={`Remove ${item.title} from My List`}
              onClick={() => remove(item)}
              className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              <X aria-hidden className="size-5" />
            </button>
          }
        />
      ))}
    </ul>
  );
}
