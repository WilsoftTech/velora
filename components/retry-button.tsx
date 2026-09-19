"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/button";

/** Re-runs the current route's server work without a full page reload. */
export function RetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className={buttonClass("primary")}
    >
      {isPending ? "Retrying…" : "Try again"}
    </button>
  );
}
