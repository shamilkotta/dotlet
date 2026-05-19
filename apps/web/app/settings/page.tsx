import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppLogo } from "@/components/app-logo";
import { UsernameForm } from "@/components/settings/username-form";

export const metadata: Metadata = {
  title: "Account settings | dotlet",
  description: "Manage your dotlet account settings.",
};

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login?redirect=/settings");
  }

  const username = session.user.username;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <AppLogo imgClassName="h-6 w-6" />
          </Link>
          <Link
            href={`/${username}`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Back to profile
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
          <p className="text-sm text-muted-foreground">
            Update your public username. Email is synced from GitHub when you sign in.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-border p-6">
          <UsernameForm currentUsername={username!} email={session.user.email} />
        </div>
      </main>
    </div>
  );
}
