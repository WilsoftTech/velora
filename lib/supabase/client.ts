import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { requireSupabaseConfig } from "./config";

/** Browser client. `createBrowserClient` returns a singleton, so calling this repeatedly is cheap. */
export function createClient() {
  const { url, key } = requireSupabaseConfig();
  return createBrowserClient<Database>(url, key);
}
