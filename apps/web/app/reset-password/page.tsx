import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth-forms/reset-password";
import { AuthFormLayout } from "@/components/auth-forms/layout";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Set a new password | dotlet",
  description: "Choose a new password for your dotlet account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  const invalidToken = error === "INVALID_TOKEN" || error?.toLowerCase().includes("invalid");

  if (invalidToken || (!token && error)) {
    return (
      <AuthFormLayout
        title="Link expired"
        description="This password reset link is no longer valid. Request a fresh link to continue."
        footerLink={{ href: "/login", label: "Back to", linkText: "Sign in" }}
      >
        <Button asChild className="w-full h-11">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthFormLayout>
    );
  }

  if (!token) {
    return (
      <AuthFormLayout
        title="Reset password"
        description="Open the link from your email, or request a new reset email from the sign-in page."
        footerLink={{ href: "/login", label: "Back to", linkText: "Sign in" }}
      >
        <Button asChild className="w-full h-11" variant="secondary">
          <Link href="/forgot-password">Forgot password</Link>
        </Button>
      </AuthFormLayout>
    );
  }

  return <ResetPasswordForm token={token} />;
}
