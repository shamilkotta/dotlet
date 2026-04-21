import type { Metadata } from "next";

import { LoginForm } from "@/components/auth-forms/login";

export const metadata: Metadata = {
  title: "Sign in to your account | dotlet",
  description: "Sign in to dotlet and manage versioned islets.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; verified?: string }>;
}) {
  const params = await searchParams;
  const emailJustVerified = params.verified === "1";

  return <LoginForm redirectTo={params.redirect} emailJustVerified={emailJustVerified} />;
}
