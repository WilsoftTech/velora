import { recordSearchSchema } from "@/lib/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Records one completed search (see components/search-recorder.tsx) through
 * public.record_search. The database owns everything that matters: it
 * canonicalizes the query, decides whether it is meaningful (silently dropping
 * it if not), feeds the anonymous analytics and, when the cookie session names a
 * user, that user's history. This handler only validates the shape and forwards.
 *
 * Identity is whatever the cookie session carries, verified by PostgREST when it
 * checks the token's signature. The body cannot carry a user id or a timestamp
 * (the schema is strict), and the service-role key is never involved. If the
 * session is stale or invalid the outcome is decided by Supabase, never by this
 * code: see docs/PHASE3_AUDIT.md, Checkpoint 3.
 *
 * Responses are bare statuses. Nothing about the caller's account, the database
 * or the query is ever echoed back.
 */

// A valid body is well under 1 KB (100 code points, escaped, plus two small fields).
const MAX_BODY_CHARS = 2048;

function respond(status: number) {
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  // Unlike Server Actions, Route Handlers get no Origin check from Next.js, so this
  // endpoint has to defend itself. A cross-origin page can neither attach the
  // session cookie (SameSite=Lax) nor send JSON without a preflight this route never
  // answers; the explicit checks below make that intent visible and testable.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return respond(403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return respond(415);

  // Not configured (fresh checkout): recording is simply unavailable.
  if (!isSupabaseConfigured()) return respond(503);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_CHARS) return respond(413);
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return respond(413);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return respond(400);
  }
  const parsed = recordSearchSchema.safeParse(payload);
  if (!parsed.success) return respond(400);

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_search", {
    p_query: parsed.data.query,
    p_scope: parsed.data.scope,
    p_result_count: parsed.data.resultCount,
  });
  if (error) {
    // Deliberately not logged: the query text (personal data) and the message (may name a user or row).
    console.warn("record_search failed", error.code ?? error.name);
    return respond(502);
  }
  return respond(204);
}
