import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { buttonClass } from "@/components/button";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="page-container py-12">
      <EmptyState
        as="h1"
        icon={<Clapperboard className="size-6" />}
        title="We couldn't find that"
        description="The page you're looking for doesn't exist or has moved."
      >
        <Link href="/" className={buttonClass("primary")}>
          Back to Home
        </Link>
      </EmptyState>
    </div>
  );
}
