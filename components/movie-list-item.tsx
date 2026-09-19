import type { ReactNode } from "react";
import Link from "next/link";
import { PosterImage } from "@/components/media-image";
import { Rating } from "@/components/rating";
import { mediaHref, mediaTypeLabel } from "@/lib/utils";
import type { MediaSummary } from "@/types/media";

/** Glass panel (DESIGN.md → Glass Cards) holding compact rows. */
export function MovieList({ children }: { children: ReactNode }) {
  return <ul className="rounded-lg border border-border bg-surface px-4 backdrop-blur-md md:px-6">{children}</ul>;
}

interface MovieListItemProps {
  item: MediaSummary;
  /** Trailing control (e.g. remove). Rendered outside the link so it stays a valid, separate target. */
  action?: ReactNode;
}

/** Compact row form of a title, used by search results and My List. */
export function MovieListItem({ item, action }: MovieListItemProps) {
  return (
    <li className="flex items-center gap-2 border-b border-border last:border-b-0">
      <Link href={mediaHref(item)} className="flex min-w-0 flex-1 items-center gap-4 py-3">
        <PosterImage path={item.posterPath} title={item.title} sizes="56px" className="w-14 shrink-0 rounded-default" />
        <div className="min-w-0">
          <p className="truncate text-body-md font-semibold sm:text-body-lg">{item.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-body-sm text-muted">
            {item.releaseYear && <span>{item.releaseYear}</span>}
            <span aria-hidden>·</span>
            <span>{mediaTypeLabel(item.mediaType)}</span>
            {item.rating !== null && <span aria-hidden>·</span>}
            <Rating value={item.rating} />
          </p>
        </div>
      </Link>
      {action}
    </li>
  );
}
