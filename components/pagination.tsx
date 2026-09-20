import Link from "next/link";
import { buttonClass } from "@/components/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Where page `n` lives; the caller owns its own URL shape. */
  hrefFor: (page: number) => string;
}

/** Previous / Next links with a "Page x of y" label. Renders nothing for a single page. */
export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonClass("secondary")}>
          Previous
        </Link>
      ) : (
        <span className="min-w-24" />
      )}
      <span className="text-body-md text-muted">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={buttonClass("secondary")}>
          Next
        </Link>
      ) : (
        <span className="min-w-24" />
      )}
    </nav>
  );
}
