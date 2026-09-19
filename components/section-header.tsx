import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  id?: string;
  /** Adds a "See all" link when provided. */
  href?: string;
}

export function SectionHeader({ title, id, href }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 sm:mb-4">
      <h2 id={id} className="text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="-my-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          See all
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  );
}
