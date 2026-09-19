import type { Metadata } from "next";
import { TabLinks } from "@/components/tab-links";
import { WatchlistView } from "@/components/watchlist-view";
import { firstParam, parseMediaType } from "@/lib/utils";

export const metadata: Metadata = { title: "My List" };

export default async function MyListPage({ searchParams }: PageProps<"/my-list">) {
  const params = await searchParams;
  const mediaType = parseMediaType(firstParam(params.tab) ?? "") ?? "movie";

  return (
    <div className="page-container mx-auto max-w-4xl py-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My List</h1>
      <div className="mt-4 max-w-xs">
        <TabLinks
          label="My List sections"
          tabs={[
            { label: "Movies", href: "/my-list", active: mediaType === "movie" },
            { label: "TV Shows", href: "/my-list?tab=tv", active: mediaType === "tv" },
          ]}
        />
      </div>
      <div className="mt-2">
        <WatchlistView mediaType={mediaType} />
      </div>
    </div>
  );
}
