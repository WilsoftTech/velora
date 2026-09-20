"use server";

import { getAuthedClient } from "@/lib/auth";
import { searchHistoryKeySchema } from "@/lib/schemas";
import type { SearchHistoryEntry } from "@/types/media";

/**
 * Server-side half of "Recent searches". Like the watchlist actions, they derive
 * the user from the verified session and never accept a user id; Row Level
 * Security on public.search_history is the second, independent guard. History is
 * only ever written by public.record_search, so there is deliberately no "add"
 * here. Actions (not a Route Handler) so an expired token is refreshed where
 * cookies are writable, without making /search itself read the session.
 */
export type SearchHistoryError = "signed-out" | "invalid" | "unavailable";
export type SearchHistoryResult = { ok: true; entries: SearchHistoryEntry[] } | { ok: false; error: SearchHistoryError };
export type RemoveSearchHistoryResult = { ok: true } | { ok: false; error: SearchHistoryError };

/** The database keeps 20 per user; this only makes the read bound explicit. */
const HISTORY_LIMIT = 20;

function isScope(value: string): value is SearchHistoryEntry["scope"] {
  return value === "all" || value === "movie" || value === "tv";
}

export async function loadSearchHistory(): Promise<SearchHistoryResult> {
  const session = await getAuthedClient();
  if (!session) return { ok: false, error: "signed-out" };

  const { data, error } = await session.supabase
    .from("search_history")
    .select("scope, query")
    .order("searched_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) {
    console.error("Search history load failed", error.code, error.message);
    return { ok: false, error: "unavailable" };
  }

  // The scope CHECK constraint makes anything else impossible; narrow rather than cast.
  const entries = data.flatMap((row) => (isScope(row.scope) ? [{ query: row.query, scope: row.scope }] : []));
  return { ok: true, entries };
}

export async function removeSearchHistory(input: SearchHistoryEntry): Promise<RemoveSearchHistoryResult> {
  const key = searchHistoryKeySchema.safeParse(input);
  if (!key.success) return { ok: false, error: "invalid" };
  const session = await getAuthedClient();
  if (!session) return { ok: false, error: "signed-out" };

  // No user filter needed: Row Level Security limits the delete to the caller's rows.
  // Removing something already gone is a success: the outcome is the same.
  const { error } = await session.supabase
    .from("search_history")
    .delete()
    .eq("scope", key.data.scope)
    .eq("query", key.data.query);
  if (error) {
    console.error("Search history remove failed", error.code, error.message);
    return { ok: false, error: "unavailable" };
  }
  return { ok: true };
}
