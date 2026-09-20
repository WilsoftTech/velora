import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, requireSupabaseConfig } from "@/lib/supabase/config";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/**
 * A request-scoped Supabase client plus the user its verified session token
 * names, or null when signed out. This is the only place the server learns who
 * is calling: never accept a user id from a payload. The client acts as that
 * user, so Row Level Security applies to everything it does.
 */
export async function getAuthedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (!data) {
    // "No session" is the normal signed-out state; anything else deserves a trace.
    if (error && error.name !== "AuthSessionMissingError") console.warn("Could not verify the session.", error.message);
    return null;
  }
  const user: CurrentUser = { id: data.claims.sub, email: data.claims.email ?? null };
  return { supabase, user };
}

export const getCurrentUser = cache(async () => (await getAuthedClient())?.user ?? null);

export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Guard for account pages. Without Supabase configured, local development just
 * has no account routes (404), while a production deploy fails loudly.
 */
export function assertAccountsAvailable() {
  if (isSupabaseConfigured()) return;
  if (process.env.NODE_ENV === "production") requireSupabaseConfig();
  notFound();
}
