import { Suspense } from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import { buttonClass } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { MovieGrid } from "@/components/movie-grid";
import { GridSkeleton } from "@/components/skeletons";
import { TabLinks } from "@/components/tab-links";
import { getMovies, getShows, getTrending } from "@/lib/tmdb/media";
import { parseBrowseList, parsePage } from "@/lib/utils";
import type { BrowseList, MediaPage } from "@/types/media";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BROWSE = {
  movie: {
    title: "Movies",
    path: "/movies",
    hasLists: true,
    load: (list: BrowseList, page: number) => getMovies(list, page),
  },
  tv: {
    title: "TV Shows",
    path: "/tv",
    hasLists: true,
    load: (list: BrowseList, page: number) => getShows(list, page),
  },
  trending: {
    title: "Trending",
    path: "/trending",
    hasLists: false,
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
    return <EmptyState icon={<Film className="size-6" />} title="Nothing to show here" description="Try another list." />;
  }

  return (
    <>
      <MovieGrid items={data.items} />
      {data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link href={browseHref(path, list, page - 1)} className={buttonClass("secondary")}>
              Previous
            </Link>
          ) : (
            <span className="min-w-24" />
          )}
          <span className="text-sm text-muted">
            Page {data.page} of {data.totalPages}
          </span>
          {page < data.totalPages ? (
            <Link href={browseHref(path, list, page + 1)} className={buttonClass("secondary")}>
              Next
            </Link>
          ) : (
            <span className="min-w-24" />
          )}
        </nav>
      )}
    </>
  );
}

/** Shared body of /movies, /tv and /trending: a titled poster grid with paging. */
export async function BrowsePage({ kind, searchParams }: { kind: BrowseKind; searchParams: SearchParams }) {
  const params = await searchParams;
  const { title, path, hasLists } = BROWSE[kind];
  const list = hasLists ? parseBrowseList(params.list) : "popular";
  const page = parsePage(params.page);

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
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
