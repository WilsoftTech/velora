import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { buttonClass } from "@/components/button";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      icon={<Clapperboard className="size-6" />}
      title="We couldn't find that"
      description="The page you're looking for doesn't exist or has moved."
    >
      <Link href="/" className={buttonClass("primary")}>
        Back to Home
      </Link>
    </EmptyState>
  );
}
