/**
 * Public Supabase settings (URL + publishable key). Both are safe for browsers;
 * the service-role key is deliberately never read anywhere in the app.
 *
 * `NEXT_PUBLIC_*` values must be referenced as literal `process.env.NAME` so
 * Next.js can inline them into the browser bundle.
 */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

/** False on a fresh checkout with no `.env.local`: Velora then runs as a guest-only discovery app. */
export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

/** For code paths that cannot work without Supabase: fail loudly instead of degrading silently. */
export function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return config;
}
