import { Star } from "lucide-react";

export function Rating({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <Star aria-hidden className="size-3.5 fill-star text-star" />
      <span>{value.toFixed(1)}</span>
      <span className="sr-only">out of 10</span>
    </span>
  );
}
