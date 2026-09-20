import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SearchX, SlidersHorizontal, TriangleAlert, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MovieList, MovieListItem } from "@/components/movie-list-item";
import { RetryButton } from "@/components/retry-button";
import { SearchInput } from "@/components/search-input";
import { ListSkeleton } from "@/components/skeletons";
import { TabLinks } from "@/components/tab-links";
import { discoverHref } from "@/lib/discover";
import { getTrending, searchMedia } from "@/lib/tmdb/media";
import { firstParam, normalizeSearchQuery, parseSearchScope } from "@/lib/utils";
import type { SearchScope } from "@/types/media";

export const metadata: Metadata = { title: "Search" };

const SCOPES: { label: string; value: SearchScope }[] = [
  { label: "All", value: "all" },
  { label: "Movies", value: "movie" },
  { label: "TV Shows", value: "tv" },
];

const TRENDING_SEARCH_COUNT = 6;

async function SearchResults({ query, scope }: { query: string; scope: SearchScope }) {
  let items;
  try {
    ({ items } = await searchMedia(query, scope));
  } catch (error) {
    // Handled here rather than by the route error boundary so the input stays usable.
    console.error(`Search failed for "${query}"`, error);
    return (
      <EmptyState
        icon={<TriangleAlert className="size-6" />}
        title="Something went wrong"
        description="We couldn't load results right now. Please try again."
      >
        <RetryButton />
      </EmptyState>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="size-6" />}
        title={`No results for “${query}”`}
        description="Check the spelling or try a different title."
      />
    );
  }

  return (
    <MovieList>
      {items.map((item) => (
        <MovieListItem key={`${item.mediaType}-${item.id}`} item={item} />
      ))}
    </MovieList>
  );
}

async function TrendingSearches() {
  let titles: string[];
  try {
    titles = (await getTrending()).items.slice(0, TRENDING_SEARCH_COUNT).map((item) => item.title);
  } catch (error) {
    // Suggestions are optional; search itself should stay usable without them.
    console.error("Could not load trending searches", error);
    return null;
  }

  return (
    <section aria-labelledby="trending-searches">
      <h2 id="trending-searches" className="mb-1 text-label-md uppercase text-muted">
        Trending searches
      </h2>
      <ul>
        {titles.map((title) => (
          <li key={title}>
            <Link
              href={`/search?q=${encodeURIComponent(title)}`}
              replace
              className="flex min-h-12 items-center gap-3 border-b border-border text-body-md transition-colors hover:text-highlight"
            >
              <TrendingUp aria-hidden className="size-4 text-muted" />
              {title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const query = normalizeSearchQuery(firstParam(params.q));
  const scope = parseSearchScope(params.type);

  return (
    <div className="page-container max-w-3xl py-6 sm:py-8">
      <h1 className="mb-4 text-headline-md md:text-headline-lg">Search</h1>
      <SearchInput query={query} scope={scope} />

      <div className="mt-6">
        {query ? (
          <>
            <TabLinks
              label="Result type"
              tabs={SCOPES.map(({ label, value }) => ({
                label,
                active: value === scope,
                href: `/search?q=${encodeURIComponent(query)}${value === "all" ? "" : `&type=${value}`}`,
              }))}
            />
            <div className="mt-2">
              <Suspense key={`${scope}:${query}`} fallback={<ListSkeleton />}>
                <SearchResults query={query} scope={scope} />
              </Suspense>
            </div>
          </>
        ) : (
          <>
            <Link
              href={discoverHref()}
              className="mb-2 inline-flex min-h-11 items-center gap-2 text-label-lg text-highlight transition-colors hover:text-foreground"
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              Browse by genre
            </Link>
            <Suspense>
              <TrendingSearches />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
}
