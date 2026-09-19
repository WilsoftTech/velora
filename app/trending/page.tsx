import type { Metadata } from "next";
import { BrowsePage } from "@/components/browse-page";

export const metadata: Metadata = { title: "Trending" };

export default function TrendingPage({ searchParams }: PageProps<"/trending">) {
  return <BrowsePage kind="trending" searchParams={searchParams} />;
}
