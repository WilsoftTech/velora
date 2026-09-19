import type { Metadata } from "next";
import { BrowsePage } from "@/components/browse-page";

export const metadata: Metadata = { title: "TV Shows" };

export default function TvPage({ searchParams }: PageProps<"/tv">) {
  return <BrowsePage kind="tv" searchParams={searchParams} />;
}
