import { useSyncExternalStore } from "react";
import { getSession, subscribeSession, type SessionState } from "@/lib/session";
import { toSummary } from "@/lib/utils";
import {
  addToWatchlist,
  importWatchlist,
  loadWatchlist,
  removeFromWatchlist,
  type WatchlistError,
  type WatchlistResult,
} from "@/lib/watchlist-actions";
import type { MediaRef, MediaSummary } from "@/types/media";

/**
 * My List. One interface, two homes:
 *
 *   guest      → localStorage (this file; only what is needed to render a row)
 *   signed in  → Postgres via server actions (ids only; TMDB supplies the rest)
 *
 * When a guest signs in, their local list is merged into the account and the
 * local copy is cleared only after the server confirms (see `runSync`).
 * Signed-in items are never written to localStorage.
 */
const STORAGE_KEY = "velora:my-list";

export type WatchlistStatus = "loading" | "ready" | "error";
export type MutationError = WatchlistError | "loading";

interface Snapshot {
  /** null until the current source is readable, so callers can show a skeleton instead of a false "empty" state. */
  items: MediaSummary[] | null;
  status: WatchlistStatus;
  /** Guest items could not be moved into the account. They remain safe in this browser. */
  importFailed: boolean;
  loadError: WatchlistError | null;
  /** The last change that had to be rolled back, keyed to the title it concerned. */
  mutationError: { key: string; error: MutationError } | null;
}

const LOADING: Snapshot = { items: null, status: "loading", importFailed: false, loadError: null, mutationError: null };

let snapshot = LOADING;
let session: SessionState = "unknown";
const listeners = new Set<() => void>();

function publish(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch };
  // "Still loading" stops being true the moment the list arrives; don't leave it on screen.
  if (snapshot.items && snapshot.mutationError?.error === "loading") snapshot = { ...snapshot, mutationError: null };
  listeners.forEach((listener) => listener());
}

/** Stable identity of a title, for matching a rolled-back change to the button that made it. */
export function watchlistKey({ mediaType, id }: MediaRef) {
  return `${mediaType}-${id}`;
}

function isSame(a: MediaRef, b: MediaRef) {
  return a.id === b.id && a.mediaType === b.mediaType;
}

function refOf({ id, mediaType }: MediaRef): MediaRef {
  return { id, mediaType };
}

// ---------------------------------------------------------------------------
// Guest storage
// ---------------------------------------------------------------------------

let guestCache: MediaSummary[] | null = null;

function isSummary(value: unknown): value is MediaSummary {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    (item.mediaType === "movie" || item.mediaType === "tv") &&
    typeof item.title === "string" &&
    (typeof item.posterPath === "string" || item.posterPath === null) &&
    (typeof item.releaseYear === "number" || item.releaseYear === null) &&
    (typeof item.rating === "number" || item.rating === null)
  );
}

function readGuest(): MediaSummary[] {
  if (guestCache) return guestCache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    guestCache = Array.isArray(parsed) ? parsed.filter(isSummary) : [];
  } catch (error) {
    console.warn("Could not read My List from storage.", error);
    guestCache = [];
  }
  return guestCache;
}

function writeGuest(next: MediaSummary[]) {
  guestCache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Could not save My List to storage.", error);
  }
}

function removeFromGuest(imported: MediaRef[]) {
  // Re-read first: anything saved in another tab in the meantime must survive.
  guestCache = null;
  writeGuest(readGuest().filter((item) => !imported.some((gone) => isSame(gone, item))));
}

// ---------------------------------------------------------------------------
// Account sync
// ---------------------------------------------------------------------------

let syncing = false;
let syncAgain = false;

/** Serialises syncs; a request that arrives mid-sync runs once more afterwards. */
async function syncAccount() {
  if (syncing) {
    syncAgain = true;
    return;
  }
  syncing = true;
  try {
    do {
      syncAgain = false;
      await runSync();
    } while (syncAgain && session === "signed-in");
  } catch (error) {
    console.error("Could not sync My List with the account.", error);
    if (session === "signed-in") publish({ status: "error", loadError: "unavailable" });
  } finally {
    syncing = false;
  }
}

async function runSync() {
  // Merge, never replace. Idempotent on the server, so a retry (or two tabs
  // racing) is harmless, and local items go away only once the server confirms.
  const pending = readGuest();
  let importFailed = false;

  if (pending.length > 0) {
    const imported = await importWatchlist(pending.map(refOf));
    if (session !== "signed-in") return;
    if (imported.ok) {
      removeFromGuest(pending);
      publish({ items: imported.items, status: "ready", importFailed: false, loadError: null });
      return;
    }
    console.warn("Could not move the guest My List into the account.", imported.error);
    importFailed = true;
  }

  const loaded = await loadWatchlist();
  if (session !== "signed-in") return;
  if (loaded.ok) publish({ items: loaded.items, status: "ready", importFailed, loadError: null });
  else publish({ status: "error", importFailed, loadError: loaded.error });
}

function onSessionChange() {
  const next = getSession();
  if (next === session) return;
  session = next;

  if (next === "signed-out") {
    guestCache = null;
    publish({ items: readGuest(), status: "ready", importFailed: false, loadError: null, mutationError: null });
  } else if (next === "signed-in") {
    publish({ ...LOADING });
    void syncAccount();
  } else {
    publish({ ...LOADING });
  }
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  guestCache = null;
  if (session === "signed-out") publish({ items: readGuest() });
  else if (session === "signed-in" && readGuest().length > 0) void syncAccount();
}

function onVisibilityChange() {
  // Cheap cross-tab / cross-device freshness for the signed-in list.
  if (document.visibilityState === "visible" && session === "signed-in" && snapshot.status === "ready") void syncAccount();
}

let active = false;

/** Wires the browser listeners once, on the first subscriber (client only). */
function activate() {
  if (active) return;
  active = true;
  subscribeSession(onSessionChange);
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisibilityChange);
  onSessionChange();
}

// ---------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------

function currentList() {
  return session === "signed-in" ? snapshot.items : readGuest();
}

function guestSet(summary: MediaSummary, saved: boolean) {
  const others = readGuest().filter((item) => !isSame(item, summary));
  const next = saved ? [summary, ...others] : others;
  writeGuest(next);
  publish({ items: next, mutationError: null });
}

async function accountSet(summary: MediaSummary, saved: boolean) {
  const key = watchlistKey(summary);
  const before = snapshot.items;
  if (!before) {
    publish({ mutationError: { key, error: "loading" } });
    return;
  }

  // Optimistic: the list changes now and is rolled back if the server refuses.
  const without = (list: MediaSummary[]) => list.filter((item) => !isSame(item, summary));
  publish({ items: saved ? [summary, ...without(before)] : without(before), mutationError: null });

  let result: WatchlistResult;
  try {
    result = await (saved ? addToWatchlist(refOf(summary)) : removeFromWatchlist(refOf(summary)));
  } catch (error) {
    console.error("My List change did not reach the server.", error);
    result = { ok: false, error: "unavailable" };
  }
  if (result.ok) return;

  // Undo against the current list, so unrelated changes made meanwhile survive.
  const current = snapshot.items ?? [];
  publish({ items: saved ? without(current) : [summary, ...without(current)], mutationError: { key, error: result.error } });
}

function setSaved(summary: MediaSummary, saved: boolean) {
  if (session === "signed-in") void accountSet(summary, saved);
  else guestSet(summary, saved);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  activate();
  return () => {
    listeners.delete(listener);
  };
}

export function useWatchlist() {
  const { items, status, importFailed, loadError, mutationError } = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => LOADING,
  );

  return {
    items,
    status,
    importFailed,
    loadError,
    mutationError,
    has: (media: MediaRef) => items?.some((item) => isSame(item, media)) ?? false,
    toggle: (media: MediaSummary) => {
      const saved = currentList()?.some((item) => isSame(item, media)) ?? false;
      setSaved(toSummary(media), !saved);
    },
    remove: (media: MediaRef) => {
      const item = currentList()?.find((candidate) => isSame(candidate, media));
      if (item) setSaved(item, false);
    },
    /** Tries the account sync again after a load or import failure. */
    retry: () => {
      publish({ status: "loading", loadError: null });
      void syncAccount();
    },
  };
}
