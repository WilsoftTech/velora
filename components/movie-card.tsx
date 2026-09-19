import Link from "next/link";
import { PosterImage } from "@/components/media-image";
import { Rating } from "@/components/rating";
import { cn, mediaHref } from "@/lib/utils";
import type { MediaSummary } from "@/types/media";

interface MovieCardProps {
  item: MediaSummary;
  /** Responsive `sizes` for the poster; defaults suit the scroll rows. */
  sizes?: string;
  className?: string;
}

export const ROW_POSTER_SIZES = "(min-width: 1024px) 176px, (min-width: 640px) 160px, 128px";

/** The one poster card, used by scroll rows, grids and "similar" sections. */
export function MovieCard({ item, sizes = ROW_POSTER_SIZES, className }: MovieCardProps) {
  return (
    <Link href={mediaHref(item)} className={cn("group block", className)}>
      <PosterImage
        path={item.posterPath}
        title={item.title}
        sizes={sizes}
        className="ring-1 ring-inset ring-white/5 transition duration-200 group-hover:-translate-y-0.5 group-hover:ring-white/20"
      />
      <h3 className="mt-2 truncate text-sm font-medium">{item.title}</h3>
      <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
        {item.releaseYear && <span>{item.releaseYear}</span>}
        <Rating value={item.rating} />
      </p>
    </Link>
  );
}
