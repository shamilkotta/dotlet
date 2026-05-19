import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    const loginRedirect = params.redirect
      ? `/login?redirect=${encodeURIComponent(params.redirect)}`
      : "/login";
    redirect(loginRedirect);
  }

  if (params.redirect) {
    redirect(params.redirect);
  }

  const username = session.user.username;
  if (username) {
    redirect(`/${username}`);
  }

  redirect("/settings");
}
