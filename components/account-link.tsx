"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { buttonClass } from "@/components/button";
import { cn } from "@/lib/utils";
import { refreshSession, useSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Header account control. It has to be a client island: reading the session on
 * the server would make every page dynamic, and the header lives on all of them.
 * Every state occupies the same space, so nothing shifts when the session resolves.
 */
export function AccountLink() {
  const pathname = usePathname();
  const session = useSession();

  // Server Actions change the session behind the SDK's back; look again on
  // navigation and when the tab regains focus (e.g. after signing in elsewhere).
  useEffect(() => {
    void refreshSession();
  }, [pathname]);
  useEffect(() => {
    const onFocus = () => void refreshSession();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (!isSupabaseConfigured()) return null;

  const iconButton = "-mr-2 grid size-11 place-items-center rounded-default text-foreground transition-colors hover:bg-surface-elevated xl:hidden";

  return (
    <>
      {/* Phones and tablets: one icon, same footprint in every state. The full buttons need xl-width to fit beside the nav and search. */}
      {session === "unknown" ? (
        <span aria-hidden className="-mr-2 size-11 xl:hidden" />
      ) : session === "signed-in" ? (
        <Link href="/account" aria-label="Account" className={iconButton}>
          <User aria-hidden className="size-5" />
        </Link>
      ) : (
        <Link href="/sign-in" aria-label="Sign in" className={iconButton}>
          <User aria-hidden className="size-5" />
        </Link>
      )}

      {/* Desktop: the signed-out pair always sizes the box, hidden while it does not apply. */}
      <div className="relative ml-4 hidden xl:block">
        <div aria-hidden={session !== "signed-out"} className={cn("flex items-center gap-2", session !== "signed-out" && "invisible")}>
          <Link href="/sign-in" className={buttonClass("ghost", "px-3")}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonClass("primary", "px-4")}>
            Create account
          </Link>
        </div>
        {session === "signed-in" && (
          <Link href="/account" className={buttonClass("secondary", "absolute inset-y-0 right-0 min-h-0 px-4")}>
            <User aria-hidden className="size-4" />
            Account
          </Link>
        )}
      </div>
    </>
  );
}
