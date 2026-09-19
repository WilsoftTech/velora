import { useSyncExternalStore } from "react";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Browser-side view of "is someone signed in?", used only to decide what to
 * show. It is a UX hint: the server re-derives identity from the session on
 * every request, and the database enforces access with Row Level Security.
 *
 * The Supabase SDK is ~66 KB gzipped, so it is loaded only when an auth cookie
 * exists. Guests (the common case) never download it.
 */
export type SessionState = "unknown" | "signed-out" | "signed-in";

let state: SessionState = "unknown";
let started = false;
let watchingAuthEvents = false;
const listeners = new Set<() => void>();

function set(next: SessionState) {
  if (next === state) return;
  state = next;
  listeners.forEach((listener) => listener());
}

/** @supabase/ssr stores the session in `sb-<project-ref>-auth-token` (possibly chunked as `.0`, `.1`). */
function hasAuthCookie(url: string) {
  const prefix = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  return document.cookie.split("; ").some((cookie) => cookie.startsWith(prefix));
}

async function loadClient() {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  if (!watchingAuthEvents) {
    watchingAuthEvents = true;
    // Keeps this tab honest about sign-outs and token loss in other tabs.
    supabase.auth.onAuthStateChange((_event, session) => set(session ? "signed-in" : "signed-out"));
  }
  return supabase;
}

/**
 * Re-reads the session. Call after anything that may have changed it outside
 * the SDK's knowledge, e.g. a Server Action that signed the user in or out.
 */
export async function refreshSession() {
  const config = getSupabaseConfig();
  if (!config || !hasAuthCookie(config.url)) return set("signed-out");

  try {
    const supabase = await loadClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) console.warn("Could not read the Supabase session.", error.message);
    set(data.session ? "signed-in" : "signed-out");
  } catch (error) {
    console.error("Could not load the Supabase client.", error);
    set("signed-out");
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void refreshSession();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getSession() {
  return state;
}

/** Subscribes a non-React module (the watchlist store) to session changes. */
export function subscribeSession(listener: () => void) {
  return subscribe(listener);
}

/** "unknown" on the server and until the first check, so nothing flashes the wrong state. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSession, () => "unknown");
}
