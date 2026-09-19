import { useSyncExternalStore } from "react";
import { toSummary } from "@/lib/utils";
import type { MediaSummary } from "@/types/media";

/**
 * My List, persisted in localStorage until Supabase auth and a watchlist table
 * exist. Only the fields needed to render a row are stored, so swapping the
 * storage later does not change any component.
 */
const STORAGE_KEY = "velora:my-list";

let cache: MediaSummary[] | null = null;
const listeners = new Set<() => void>();

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

function read(): MediaSummary[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(isSummary) : [];
  } catch (error) {
    console.warn("Could not read My List from storage.", error);
    cache = [];
  }
  return cache;
}

function write(next: MediaSummary[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Could not save My List to storage.", error);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function isSame(a: Pick<MediaSummary, "id" | "mediaType">, b: Pick<MediaSummary, "id" | "mediaType">) {
  return a.id === b.id && a.mediaType === b.mediaType;
}

/**
 * `items` is null on the server and during hydration (storage is unreadable
 * there), so callers can show a skeleton instead of a false "empty" state.
 */
export function useWatchlist() {
  const items = useSyncExternalStore<MediaSummary[] | null>(subscribe, read, () => null);

  return {
    items,
    has: (media: Pick<MediaSummary, "id" | "mediaType">) => items?.some((item) => isSame(item, media)) ?? false,
    toggle: (media: MediaSummary) => {
      const current = read();
      write(current.some((item) => isSame(item, media)) ? current.filter((item) => !isSame(item, media)) : [toSummary(media), ...current]);
    },
    remove: (media: Pick<MediaSummary, "id" | "mediaType">) => {
      write(read().filter((item) => !isSame(item, media)));
    },
  };
}
