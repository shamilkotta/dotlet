import Link from "next/link";
import type { Metadata } from "next";

import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Sign up | dotlet",
  description: "Create a dotlet account and start syncing your configs.",
};

function getSafeRedirectPath(path: string | undefined): string | undefined {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return undefined;
  }
  return path;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = getSafeRedirectPath(params.redirect);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              href="/"
              className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              DOTLET
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              Get started with dotlet to sync your configs.
            </p>
          </div>
          <SignupForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
