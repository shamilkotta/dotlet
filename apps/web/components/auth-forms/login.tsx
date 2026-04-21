"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { toast } from "@workspace/ui/components/sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { authClient } from "@/lib/auth-client";
import { AuthFormLayout } from "./layout";

export function LoginForm({
  redirectTo,
  emailJustVerified,
}: {
  redirectTo?: string;
  emailJustVerified?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number | null>(null);
  const [, bumpResendCooldown] = useState(0);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const router = useRouter();

  const resendCooldownSeconds =
    resendCooldownUntil !== null
      ? Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000))
      : 0;

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;
    const id = setInterval(() => bumpResendCooldown((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldownSeconds, resendCooldownUntil]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setShowResendVerification(false);
    setLoading(true);

    const response = await authClient.signIn.email({
      email,
      password,
    });

    setLoading(false);
    if (response.error) {
      const status = (response.error as { status?: number }).status;
      if (status === 403) {
        setShowResendVerification(true);
        setError("Please verify your email before signing in.");
        return;
      }
      setError(response.error.message ?? "Authentication failed");
      return;
    }
    const userName = (response.data.user as { username?: string }).username;
    const nextPath = redirectTo ?? `/${userName}`;
    router.push(nextPath);
    router.refresh();
  }

  async function resendVerification() {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }
    if (resendCooldownSeconds > 0) return;
    setResendLoading(true);
    const { error: resendError } = await authClient.sendVerificationEmail({
      email,
    });
    setResendLoading(false);
    const cooldownMs = 60_000;
    if (resendError) {
      const status = (resendError as { status?: number }).status;
      if (status === 429) {
        setResendCooldownUntil(Date.now() + cooldownMs);
      }
      toast.error(resendError.message ?? "Could not send verification email.");
      return;
    }
    setResendCooldownUntil(Date.now() + cooldownMs);
    toast.success("Verification email sent if an account exists for that address.");
  }

  const forgotHref = redirectTo
    ? `/forgot-password?redirect=${encodeURIComponent(redirectTo)}`
    : "/forgot-password";

  return (
    <AuthFormLayout
      title="Welcome back"
      description="Enter your credentials to access your account"
      footerLink={{
        href: redirectTo ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup",
        label: "Don't have an account?",
        linkText: "Sign up",
      }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {emailJustVerified ? (
          <div className="p-3 text-sm font-medium text-foreground bg-muted/50 rounded-md border border-border text-center">
            Email verified. You can sign in now.
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Password
            </label>
            <Link
              href={forgotHref}
              className="text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11"
            autoComplete="current-password"
          />
        </div>

        {error ? (
          <div className="p-3 text-sm font-medium text-destructive-foreground bg-destructive-foreground/10 rounded-md">
            {error}
          </div>
        ) : null}

        {showResendVerification ? (
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            disabled={resendLoading || !email.trim() || resendCooldownSeconds > 0}
            onClick={() => void resendVerification()}
          >
            {resendLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : resendCooldownSeconds > 0 ? (
              `Resend in ${resendCooldownSeconds}s`
            ) : (
              "Resend verification email"
            )}
          </Button>
        ) : null}

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>
    </AuthFormLayout>
  );
}
