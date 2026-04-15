import { auth } from "@/lib/auth";
import Link from "next/link";
import { headers } from "next/headers";

import { AuthHeaderMenu } from "./auth-header-menu";

export async function AuthHeader({
  session,
}: {
  session?: Awaited<ReturnType<typeof auth.api.getSession>> | null;
}) {
  let currentSession = session;
  if (!currentSession) {
    currentSession = await auth.api.getSession({
      headers: await headers(),
    });
  }

  if (!currentSession) {
    return (
      <div className="flex flex-col items-end gap-1 text-right">
        <Link
          href="/login"
          className="text-xs uppercase font-semibold tracking-widest text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-muted-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <AuthHeaderMenu
      user={{
        name: currentSession.user.name,
        email: currentSession.user.email,
        username: currentSession.user.username,
        image: currentSession.user.image,
      }}
    />
  );
}
