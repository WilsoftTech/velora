import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";

/**
 * Landing point of the email-confirmation link. Exchanges the one-time `code`
 * for a session cookie, then sends the user on to a same-origin path.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.warn("Email confirmation code exchange failed.", error.code ?? error.status, error.message);
  }
  return NextResponse.redirect(new URL("/sign-in?error=callback", origin));
}
