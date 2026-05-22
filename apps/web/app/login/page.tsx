import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { LoginForm } from "@/components/auth-forms/login";
import { auth } from "@/lib/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Sign in",
  description: "Sign in to dotlet and manage versioned islets.",
  path: "/login",
  noIndex: true,
});

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
