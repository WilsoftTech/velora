import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/**
 * Server client bound to the current request's cookies. Create one per request
 * (never share it): identity always comes from the session cookie, never from
 * anything the browser sends in a payload.
 */
export async function createClient() {
  const { url, key } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch (error) {
          // Server Components cannot write cookies. That only matters for a token
          // refresh, which proxy.ts and Server Actions handle where writing is allowed.
          console.warn("Could not persist refreshed Supabase session cookies here.", error);
        }
      },
    },
  });
}
