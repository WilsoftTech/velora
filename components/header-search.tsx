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
        className="h-10 w-56 rounded-default border border-border bg-canvas-subtle/80 pl-10 pr-4 text-body-md text-foreground placeholder:text-muted/80 transition-[width,border-color,box-shadow] duration-200 focus:w-72 focus:border-highlight focus:shadow-focus focus-visible:outline-none xl:w-72 xl:focus:w-80"
      />
    </form>
  );
}
