import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { LoginForm } from "@/components/auth-forms/login";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in to your account | dotlet",
  description: "Sign in to dotlet and manage versioned islets.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect(`/${session.user.username}`);
  }

  const params = await searchParams;

  return <LoginForm redirectTo={params.redirect} />;
}
