import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { assertAccountsAvailable } from "@/lib/auth";
import { firstParam, safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  assertAccountsAvailable();
  const params = await searchParams;
  return <AuthForm mode="sign-up" next={safeRedirectPath(firstParam(params.next))} />;
}
