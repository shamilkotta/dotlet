import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth-forms/forgot-password";

export const metadata: Metadata = {
  title: "Forgot password | dotlet",
  description: "Request a password reset link for your dotlet account.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;

  return <ForgotPasswordForm redirectTo={params.redirect} />;
}
