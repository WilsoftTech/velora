"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { History, X } from "lucide-react";
import { SEARCH_SCOPE_LABELS, searchHref } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { loadSearchHistory, removeSearchHistory } from "@/lib/search-history-actions";
import type { SearchHistoryEntry } from "@/types/media";

const keyOf = ({ scope, query }: SearchHistoryEntry) => `${scope}:${query}`;

/**
 * A signed-in person's recent searches. A client island for the same reason as
 * the header account link: the page stays session-free (identical for everyone,
 * no token refresh during render), and this loads through a Server Action once
 * the browser knows someone is signed in. Guests render nothing and make no
 * request. Every failure degrades to "no list": search itself never depends on it.
 */
export function RecentSearches() {
  const session = useSession();
  // The list is its own component so its state is discarded on sign-out.
  return session === "signed-in" ? <RecentSearchesList /> : null;
}

function RecentSearchesList() {
  const [entries, setEntries] = useState<SearchHistoryEntry[] | null>(null);
  const [removeFailed, setRemoveFailed] = useState(false);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const emptyNote = useRef<HTMLParagraphElement>(null);
  // Where focus goes once the next render has settled: a row key, or "empty".
  const pendingFocus = useRef<{ key: string; target: "link" | "button" } | "empty" | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSearchHistory()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setEntries(result.entries);
        else if (result.error !== "signed-out") console.error("Could not load recent searches.", result.error);
      })
      .catch((error: unknown) => console.error("Could not load recent searches.", error));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "empty") emptyNote.current?.focus();
    else if (target) rows.current.get(target.key)?.querySelector<HTMLElement>(target.target === "link" ? "a" : "button")?.focus();
  }, [entries]);

  if (entries === null) return null;

  async function remove(entry: SearchHistoryEntry) {
    if (!entries) return;
    const index = entries.findIndex((candidate) => keyOf(candidate) === keyOf(entry));
    if (index === -1) return;

    // Optimistic, and rolled back below if the server refuses. Focus moves to the
    // neighbouring row (or the empty note) so keyboard and screen-reader users are not dropped.
    const neighbour = entries[index + 1] ?? entries[index - 1];
    pendingFocus.current = neighbour ? { key: keyOf(neighbour), target: "link" } : "empty";
    setRemoveFailed(false);
    setEntries((current) => current?.filter((candidate) => keyOf(candidate) !== keyOf(entry)) ?? current);

    let ok = false;
    try {
      ok = (await removeSearchHistory(entry)).ok;
    } catch (error) {
      console.error("A recent search could not be removed.", error);
    }
    if (ok) return;

    // Put it back where it was, tell the person, and return focus to its remove button to retry.
    setRemoveFailed(true);
    pendingFocus.current = { key: keyOf(entry), target: "button" };
    setEntries((current) => {
      if (!current || current.some((candidate) => keyOf(candidate) === keyOf(entry))) return current;
      return [...current.slice(0, index), entry, ...current.slice(index)];
    });
  }

  return (
    <section aria-labelledby="recent-searches" className="mt-6">
      <h2 id="recent-searches" className="mb-1 text-label-md uppercase text-muted">
        Recent searches
      </h2>
      {removeFailed && (
        <p role="alert" className="mb-2 rounded-default border border-destructive/40 px-4 py-3 text-body-md text-destructive">
          Couldn&apos;t remove that search. Try again.
        </p>
      )}
      {entries.length === 0 ? (
        <p ref={emptyNote} tabIndex={-1} className="py-3 text-body-md text-muted focus-visible:outline-none">
          Searches you make while signed in show up here.
        </p>
      ) : (
        <ul>
          {entries.map((entry) => {
            const key = keyOf(entry);
            const scopeLabel = SEARCH_SCOPE_LABELS[entry.scope];
            return (
              <li
                key={key}
                ref={(node) => {
                  if (node) rows.current.set(key, node);
                  else rows.current.delete(key);
                }}
                className="flex items-center gap-1 border-b border-border"
              >
                <Link
                  href={searchHref(entry.query, entry.scope)}
                  replace
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-body-md transition-colors hover:text-highlight"
                >
                  <History aria-hidden className="size-4 shrink-0 text-muted" />
                  <span className="min-w-0 truncate">{entry.query}</span>
                  <span className="shrink-0 text-body-sm text-muted">
                    <span className="sr-only">in </span>
                    {scopeLabel}
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label={`Remove “${entry.query}” in ${scopeLabel} from recent searches`}
                  onClick={() => void remove(entry)}
                  className="grid size-11 shrink-0 place-items-center rounded-default text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
