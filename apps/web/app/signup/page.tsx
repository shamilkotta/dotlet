import type { Metadata } from "next";

import { SignupForm } from "@/components/auth-forms/signup";

export const metadata: Metadata = {
  title: "Create an account | dotlet",
  description: "Create a dotlet account and start syncing your configs.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;

  return <SignupForm redirectTo={params.redirect} />;
}
