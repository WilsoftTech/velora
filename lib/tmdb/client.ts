import type { TmdbPaged } from "./types";

const API_BASE = "https://api.themoviedb.org/3";
const ONE_HOUR = 60 * 60;

export function isTmdbConfigured() {
  return Boolean(process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_API_KEY);
}

type Params = Record<string, string | number>;

/**
 * Server-side TMDB request. Credentials come from non-public env vars and
 * never reach the browser. Resolves to null on 404; any other failure throws so
 * the route's error boundary can offer a retry.
 */
export async function tmdbFetch<T>(path: string, params: Params = {}): Promise<T | null> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const headers: HeadersInit = { Accept: "application/json" };
  if (process.env.TMDB_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.TMDB_ACCESS_TOKEN}`;
  } else if (process.env.TMDB_API_KEY) {
    url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  }

  const response = await fetch(url, { headers, next: { revalidate: ONE_HOUR } });
  if (response.status === 404) return null;
  if (!response.ok) {
    console.error(`TMDB request failed: ${response.status} ${path}`);
    throw new Error("Could not load content from TMDB.");
  }
  return (await response.json()) as T;
}

export async function tmdbFetchPage<T>(path: string, params: Params = {}): Promise<TmdbPaged<T>> {
  const data = await tmdbFetch<TmdbPaged<T>>(path, params);
  if (!data) throw new Error(`TMDB returned no data for ${path}`);
  return data;
}
