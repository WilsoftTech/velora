import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { buttonClass } from "@/components/button";
import { ProfileForm } from "@/components/profile-form";
import { assertAccountsAvailable, getAuthedClient } from "@/lib/auth";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  assertAccountsAvailable();
  // proxy.ts redirects signed-out visitors early; this is the check that counts.
  const session = await getAuthedClient();
  if (!session) redirect("/sign-in?next=/account");

  const { data: profile, error } = await session.supabase
    .from("profiles")
    .select("display_name")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) {
    console.error("Could not load the profile", error.code, error.message);
    throw new Error("Could not load your account.");
  }

  return (
    <div className="page-container max-w-xl py-6 sm:py-8">
      <h1 className="text-headline-md md:text-headline-lg">Account</h1>
      <p className="mt-2 text-body-md text-muted">
        Signed in as <span className="font-semibold text-foreground">{session.user.email ?? "your account"}</span>
      </p>

      <section aria-labelledby="profile-heading" className="mt-6 rounded-lg border border-border bg-surface p-5 backdrop-blur-md sm:p-6">
        <h2 id="profile-heading" className="mb-4 text-headline-sm">
          Profile
        </h2>
        <ProfileForm displayName={profile?.display_name ?? ""} />
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/my-list" className={buttonClass("secondary")}>
          Go to My List
        </Link>
        <form action={signOut}>
          <button type="submit" className={buttonClass("ghost", "border border-border")}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
