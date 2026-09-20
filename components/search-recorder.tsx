"use client";

import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MAX_SEARCH_RESULT_COUNT } from "@/lib/utils";
import type { SearchScope } from "@/types/media";

/** Long enough that a still-being-typed prefix is unmounted (and so cancelled) before it fires. */
const DWELL_MS = 1500;
const STORAGE_KEY = "velora:recorded-searches";
const MAX_REMEMBERED = 50;

// Same-page-load memory, so the dedupe still works when sessionStorage is unavailable.
const remembered = new Set<string>();

function readRecorded(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch (error) {
    console.warn("Could not read recorded searches from session storage.", error);
    return [];
  }
}

function markRecorded(key: string) {
  remembered.add(key);
  const next = [...readRecorded().filter((entry) => entry !== key), key].slice(-MAX_REMEMBERED);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Could not remember a recorded search in session storage.", error);
  }
}

interface SearchRecorderProps {
  /** The query exactly as it was searched (already trimmed and capped). The database canonicalizes it. */
  query: string;
  scope: SearchScope;
  /** Items in the result that was just rendered. Approximate by design: see the clamp below. */
  resultCount: number;
}

/**
 * Reports a completed search to POST /api/search-events, once, after the person
 * has looked at the results for DWELL_MS. Renders nothing.
 *
 * It exists as a client island (rather than recording while the page renders) so
 * that: only searches someone actually stayed on are counted, since navigating to
 * the next query unmounts it and cancels the timer; a bot's or prefetch's GET
 * writes nothing; and guests download no Supabase SDK for analytics. The browser
 * never says who it is: the server reads the session cookie.
 *
 * The same (scope, query) is recorded at most once per browser tab session, so
 * re-renders, back/forward and reloads do not inflate the numbers. The key is the
 * text as searched, not a canonical form: the database owns canonicalization, and
 * a differently-cased repeat costs at most one extra event.
 */
export function SearchRecorder({ query, scope, resultCount }: SearchRecorderProps) {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const key = `${scope}:${query}`;
    if (remembered.has(key) || readRecorded().includes(key)) return;

    const timer = window.setTimeout(() => {
      markRecorded(key);
      const count = Math.min(Math.max(Math.trunc(resultCount), 0), MAX_SEARCH_RESULT_COUNT);
      fetch("/api/search-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, scope, resultCount: count }),
        // Lets the request finish if the tab is closed right after the dwell.
        keepalive: true,
      })
        .then((response) => {
          if (!response.ok) console.warn("A search could not be recorded.", response.status);
        })
        .catch((error: unknown) => console.warn("A search could not be recorded.", error));
    }, DWELL_MS);

    return () => window.clearTimeout(timer);
  }, [query, scope, resultCount]);

  return null;
}
