import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

/**
 * Refreshes the session cookie for a request and reports whether the visitor is
 * signed in. Server Components cannot write cookies, so any route that reads the
 * session on the server has to pass through here first.
 *
 * `signedIn` is verified (`getClaims` checks the token), but it is still only an
 * early redirect. Data access is authorized again in the server code and by RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const config = getSupabaseConfig();
  if (!config) return { response, signedIn: false };

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // no-store, so a CDN can never serve one visitor's session to another.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Must run before any response is built, or a refreshed token would be lost.
  const { data } = await supabase.auth.getClaims();
  return { response, signedIn: Boolean(data?.claims) };
}

/** A redirect that keeps any cookies (and cache headers) the refresh just set. */
export function redirectWithSession(response: NextResponse, url: URL) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  response.headers.forEach((value, key) => {
    if (key === "cache-control" || key === "expires" || key === "pragma") redirect.headers.set(key, value);
  });
  return redirect;
}
