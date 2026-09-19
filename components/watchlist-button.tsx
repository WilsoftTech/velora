"use client";

import { Check, Plus } from "lucide-react";
import { buttonClass, type ButtonVariant } from "@/components/button";
import { useWatchlist } from "@/lib/watchlist";
import type { MediaSummary } from "@/types/media";

interface WatchlistButtonProps {
  item: MediaSummary;
  variant?: ButtonVariant;
  className?: string;
}

export function WatchlistButton({ item, variant = "secondary", className }: WatchlistButtonProps) {
  const { has, toggle } = useWatchlist();
  const saved = has(item);
  const Icon = saved ? Check : Plus;

  return (
    <button type="button" aria-pressed={saved} onClick={() => toggle(item)} className={buttonClass(variant, className)}>
      <Icon aria-hidden className="size-4" />
      {saved ? "In My List" : "Add to My List"}
    </button>
  );
}
