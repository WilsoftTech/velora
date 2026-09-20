import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass } from "@/components/button";
import { Field } from "@/components/form-field";
import {
  DISCOVER_SORTS,
  MIN_YEAR,
  RATING_OPTIONS,
  discoverHref,
  hasActiveFilters,
  maxYear,
  parseDiscoverFilters,
} from "@/lib/discover";
import { genreOptions } from "@/lib/tmdb/genres";
import type { DiscoverFilters } from "@/types/media";

/**
 * Apply runs on the server: the submitted values go through the same parser as
 * the URL and the browser is sent to the canonical address. A plain GET form
 * would leave every empty field in the URL, and this way it also works without
 * JavaScript. Page always resets to 1 because the form has no page field.
 */
async function applyFilters(formData: FormData) {
  "use server";
  const submitted: Record<string, string> = {};
  for (const [name, value] of formData) {
    if (typeof value === "string") submitted[name] = value;
  }
  redirect(discoverHref(parseDiscoverFilters(submitted)));
}

/** Native controls only, so keyboard, screen-reader and touch behaviour come from the platform. */
export function DiscoverFilterForm({ filters }: { filters: DiscoverFilters }) {
  return (
    <form
      action={applyFilters}
      aria-label="Filter results"
      className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-4 backdrop-blur-md sm:p-5 md:grid-cols-4"
    >
      <input type="hidden" name="type" value={filters.type} />

      {/* Genre names are long ("Sci-Fi & Fantasy"), so from md up Genre and Sort get double width until lg has room for four equal columns. */}
      <div className="col-span-2 lg:col-span-1">
        <Field id="discover-genre" label="Genre">
          {(field) => (
            <select name="genre" defaultValue={filters.genre ?? ""} {...field}>
              <option value="">Any genre</option>
              {genreOptions(filters.type).map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field id="discover-year" label="Release year">
        {(field) => (
          <input
            type="number"
            name="year"
            inputMode="numeric"
            min={MIN_YEAR}
            max={maxYear()}
            step={1}
            placeholder="Any year"
            autoComplete="off"
            defaultValue={filters.year ?? ""}
            {...field}
          />
        )}
      </Field>

      <Field id="discover-rating" label="Minimum rating">
        {(field) => (
          <select name="rating" defaultValue={filters.rating ?? ""} {...field}>
            <option value="">Any</option>
            {RATING_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}+
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="col-span-2 lg:col-span-1">
        <Field id="discover-sort" label="Sort by">
          {(field) => (
            <select name="sort" defaultValue={filters.sort} {...field}>
              {DISCOVER_SORTS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="col-span-2 flex flex-wrap gap-3 md:self-end lg:col-span-4">
        <button type="submit" className={buttonClass("primary", "flex-1 sm:flex-none")}>
          Apply filters
        </button>
        {hasActiveFilters(filters) && (
          <Link
            href={discoverHref({ type: filters.type })}
            className={buttonClass("ghost", "border border-border")}
          >
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}
