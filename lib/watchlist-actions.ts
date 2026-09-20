"use server";

import { getAuthedClient } from "@/lib/auth";
import { getMediaSummaries } from "@/lib/tmdb/media";
import { mediaRefListSchema, mediaRefSchema } from "@/lib/schemas";
import type { MediaRef, MediaSummary } from "@/types/media";

/**
 * Server-side half of My List for signed-in users. Every action derives the
 * user from the verified session and never accepts a user id; Row Level
 * Security in Postgres is the second, independent guard on every query.
 */
export type WatchlistError = "signed-out" | "invalid" | "full" | "unavailable";
export type WatchlistResult = { ok: true } | { ok: false; error: WatchlistError };
export type WatchlistListResult = { ok: true; items: MediaSummary[] } | { ok: false; error: WatchlistError };

const ON_CONFLICT = "user_id,media_type,tmdb_id";
const CHECK_VIOLATION = "23514"; // raised by the watchlist limit trigger

function failure(error: { code?: string; message: string }, action: string): { ok: false; error: WatchlistError } {
  if (error.code === CHECK_VIOLATION) return { ok: false, error: "full" };
  console.error(`Watchlist ${action} failed`, error.code, error.message);
  return { ok: false, error: "unavailable" };
}

async function readList(supabase: NonNullable<Awaited<ReturnType<typeof getAuthedClient>>>["supabase"]): Promise<WatchlistListResult> {
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("tmdb_id, media_type")
    .order("created_at", { ascending: false });
  if (error) return failure(error, "load");

  try {
    const items = await getMediaSummaries(data.map((row) => ({ id: row.tmdb_id, mediaType: row.media_type })));
    return { ok: true, items };
  } catch (lookupError) {
    console.error("Watchlist titles could not be resolved from TMDB", lookupError);
    return { ok: false, error: "unavailable" };
  }
}

export async function loadWatchlist(): Promise<WatchlistListResult> {
  const session = await getAuthedClient();
  if (!session) return { ok: false, error: "signed-out" };
  return readList(session.supabase);
}

export async function addToWatchlist(input: MediaRef): Promise<WatchlistResult> {
  const ref = mediaRefSchema.safeParse(input);
  if (!ref.success) return { ok: false, error: "invalid" };
  const session = await getAuthedClient();
  if (!session) return { ok: false, error: "signed-out" };

  // Saving twice is a no-op, not an error: the unique constraint makes it idempotent.
  const { error } = await session.supabase
    .from("watchlist_items")
    .upsert({ tmdb_id: ref.data.id, media_type: ref.data.mediaType }, { onConflict: ON_CONFLICT, ignoreDuplicates: true });
  return error ? failure(error, "add") : { ok: true };
}

export async function removeFromWatchlist(input: MediaRef): Promise<WatchlistResult> {
  const ref = mediaRefSchema.safeParse(input);
  if (!ref.success) return { ok: false, error: "invalid" };
  const session = await getAuthedClient();
  if (!session) return { ok: false, error: "signed-out" };

  // No user filter needed: Row Level Security limits the delete to the caller's rows.
  const { error } = await session.supabase
    .from("watchlist_items")
    .delete()
    .eq("tmdb_id", ref.data.id)
    .eq("media_type", ref.data.mediaType);
  return error ? failure(error, "remove") : { ok: true };
}

/**
 * Merges a guest list into the account, then returns the full account list.
 * Merge, never replace: titles already saved are untouched, duplicates are
 * skipped, and running it twice with the same input changes nothing. The caller
 * clears its local copy only after this returns ok.
 */
export async function importWatchlist(input: MediaRef[]): Promise<WatchlistListResult> {
  const refs = mediaRefListSchema.safeParse(input);
  if (!refs.success) return { ok: false, error: "invalid" };
  const session = await getAuthedClient();
  if (!session) return { ok: false, error: "signed-out" };

  if (refs.data.length > 0) {
    const { error } = await session.supabase
      .from("watchlist_items")
      .upsert(
        refs.data.map((ref) => ({ tmdb_id: ref.id, media_type: ref.mediaType })),
        { onConflict: ON_CONFLICT, ignoreDuplicates: true },
      );
    if (error) return failure(error, "import");
  }
  return readList(session.supabase);
}
