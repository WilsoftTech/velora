import type { Metadata } from "next";
import { BrowsePage } from "@/components/browse-page";

export const metadata: Metadata = { title: "Movies" };

export default function MoviesPage({ searchParams }: PageProps<"/movies">) {
  return <BrowsePage kind="movie" searchParams={searchParams} />;
}
