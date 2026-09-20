import { Suspense } from "react";
import Link from "next/link";
import { Film, SlidersHorizontal } from "lucide-react";
import { buttonClass } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { MovieGrid } from "@/components/movie-grid";
import { Pagination } from "@/components/pagination";
import { GridSkeleton } from "@/components/skeletons";
import { TabLinks } from "@/components/tab-links";
import { discoverHref } from "@/lib/discover";
import { getMovies, getShows, getTrending } from "@/lib/tmdb/media";
import { parseBrowseList, parsePage } from "@/lib/utils";
import type { BrowseList, MediaPage, MediaType } from "@/types/media";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BROWSE = {
  movie: {
    title: "Movies",
    path: "/movies",
    hasLists: true,
    discoverType: "movie" as MediaType | undefined,
    load: (list: BrowseList, page: number) => getMovies(list, page),
  },
  tv: {
    title: "TV Shows",
    path: "/tv",
    hasLists: true,
    discoverType: "tv" as MediaType | undefined,
    load: (list: BrowseList, page: number) => getShows(list, page),
  },
  trending: {
    title: "Trending",
    path: "/trending",
    hasLists: false,
    discoverType: undefined as MediaType | undefined,
    load: (_list: BrowseList, page: number) => getTrending(page),
  },
};

type BrowseKind = keyof typeof BROWSE;

const LISTS: { label: string; value: BrowseList }[] = [
  { label: "Popular", value: "popular" },
  { label: "Top Rated", value: "top_rated" },
];

function browseHref(path: string, list: BrowseList, page = 1) {
  const params = new URLSearchParams();
  if (list !== "popular") params.set("list", list);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

async function BrowseResults({ kind, list, page }: { kind: BrowseKind; list: BrowseList; page: number }) {
  const { path, load } = BROWSE[kind];
  const data: MediaPage = await load(list, page);

  if (data.items.length === 0) {
    return (
      <EmptyState icon={<Film className="size-6" />} title="Nothing to show here" description="This page doesn't exist.">
        <Link href={browseHref(path, list)} className={buttonClass("primary")}>
          Back to first page
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <MovieGrid items={data.items} />
      <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(target) => browseHref(path, list, target)} />
    </>
  );
}

/** Shared body of /movies, /tv and /trending: a titled poster grid with paging. */
export async function BrowsePage({ kind, searchParams }: { kind: BrowseKind; searchParams: SearchParams }) {
  const params = await searchParams;
  const { title, path, hasLists, discoverType } = BROWSE[kind];
  const list = hasLists ? parseBrowseList(params.list) : "popular";
  const page = parsePage(params.page);

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h1 className="text-headline-md md:text-headline-lg">{title}</h1>
        {discoverType && (
          <Link
            href={discoverHref({ type: discoverType })}
            className="inline-flex min-h-11 items-center gap-2 text-label-lg text-highlight transition-colors hover:text-foreground"
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            Filter by genre
          </Link>
        )}
      </div>
      {hasLists && (
        <div className="mt-4 max-w-xs">
          <TabLinks
            label={`${title} lists`}
            tabs={LISTS.map(({ label, value }) => ({ label, active: value === list, href: browseHref(path, value) }))}
          />
        </div>
      )}
      <div className="mt-6">
        <Suspense key={`${list}:${page}`} fallback={<GridSkeleton />}>
          <BrowseResults kind={kind} list={list} page={page} />
        </Suspense>
      </div>
    </div>
  );
}
