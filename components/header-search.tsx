"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Desktop header search. A plain GET form, so it works before hydration and
 * hands off to the live search page on submit. Hidden on that page, which has
 * its own input.
 */
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === "/search") return null;

  return (
    <form action="/search" role="search" className="relative hidden md:block">
      <label htmlFor="header-search" className="sr-only">
        Search movies and shows
      </label>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        id="header-search"
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Search movies, shows…"
        className="h-10 w-56 rounded-full border border-border bg-surface pl-10 pr-4 text-sm text-foreground placeholder:text-muted transition-[width,border-color] duration-200 focus:w-72 focus:border-accent focus:outline-none lg:w-72 lg:focus:w-80"
      />
    </form>
  );
}
