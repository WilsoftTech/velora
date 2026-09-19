"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { buttonClass } from "@/components/button";
import { EmptyState } from "@/components/empty-state";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={<TriangleAlert className="size-6" />}
      title="Something went wrong"
      description="We couldn't load this right now. Please try again."
    >
      <button type="button" onClick={() => retry()} className={buttonClass("primary")}>
        Try again
      </button>
    </EmptyState>
  );
}
