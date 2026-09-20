import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Film, SearchX, TriangleAlert } from "lucide-react";
import { buttonClass } from "@/components/button";
import { DiscoverFilterForm } from "@/components/discover-filters";
import { EmptyState } from "@/components/empty-state";
import { MovieGrid } from "@/components/movie-grid";
import { Pagination } from "@/components/pagination";
import { RetryButton } from "@/components/retry-button";
import { GridSkeleton } from "@/components/skeletons";
import { TabLinks } from "@/components/tab-links";
import { DISCOVER_PATH, discoverHref, parseDiscoverFilters } from "@/lib/discover";
import { discoverMedia } from "@/lib/tmdb/media";
import type { DiscoverFilters, MediaPage, MediaType } from "@/types/media";

const TYPES: { label: string; value: MediaType }[] = [
  { label: "Movies", value: "movie" },
  { label: "TV Shows", value: "tv" },
];

export async function generateMetadata({ searchParams }: PageProps<"/discover">): Promise<Metadata> {
  const href = discoverHref(parseDiscoverFilters(await searchParams));
  return {
    title: "Discover",
    description: "Find movies and TV shows by genre, release year and rating.",
    // Malformed or redundant parameters all collapse onto one canonical address.
    alternates: { canonical: href },
    // Every filter combination is its own URL; only the unfiltered page is worth indexing.
    robots: href === DISCOVER_PATH ? undefined : { index: false, follow: true },
  };
}

async function DiscoverResults({ filters }: { filters: DiscoverFilters }) {
  let data: MediaPage;
  try {
    data = await discoverMedia(filters);
  } catch (error) {
    // Handled here rather than by the route error boundary so the filters stay usable.
    console.error(`Discover failed for ${discoverHref(filters)}`, error);
    return (
      <EmptyState
        icon={<TriangleAlert className="size-6" />}
        title="Something went wrong"
        description="We couldn't load titles right now. Please try again."
      >
        <RetryButton />
      </EmptyState>
    );
  }

  if (data.items.length === 0) {
    // Past the last page (an old link, or a hand-edited URL) versus filters that match nothing.
    if (filters.page > 1) {
      return (
        <EmptyState icon={<Film className="size-6" />} title="Nothing to show here" description="This page doesn't exist.">
          <Link href={discoverHref({ ...filters, page: 1 })} className={buttonClass("primary")}>
            Back to first page
          </Link>
        </EmptyState>
      );
    }
    return (
      <EmptyState
        icon={<SearchX className="size-6" />}
        title="No titles match these filters"
        description="Try a different genre, year or rating."
      >
        <Link href={discoverHref({ type: filters.type })} className={buttonClass("primary")}>
          Reset filters
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <MovieGrid items={data.items} />
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        hrefFor={(target) => discoverHref({ ...filters, page: target })}
      />
    </>
  );
}

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const filters = parseDiscoverFilters(await searchParams);

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="text-headline-md md:text-headline-lg">Discover</h1>
      <div className="mt-4 max-w-xs">
        <TabLinks
          label="Media type"
          tabs={TYPES.map(({ label, value }) => ({
            label,
            active: value === filters.type,
            // Genres differ between movies and TV, so only the genre is dropped when switching.
            href: discoverHref({ ...filters, type: value, genre: value === filters.type ? filters.genre : null, page: 1 }),
          }))}
        />
      </div>
      <DiscoverFilterForm filters={filters} />

      <section aria-labelledby="discover-results" className="mt-6">
        <h2 id="discover-results" className="sr-only">
          Results
        </h2>
        <Suspense key={discoverHref(filters)} fallback={<GridSkeleton />}>
          <DiscoverResults filters={filters} />
        </Suspense>
      </section>
    </div>
  );
}
