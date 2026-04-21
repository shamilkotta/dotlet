"use client";

import { type FormEvent, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@workspace/ui/components/sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { authClient } from "@/lib/auth-client";
import { AuthFormLayout } from "./layout";

export function ForgotPasswordForm({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const loginHref = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      setIsLoading(true);
      try {
        const { error } = await authClient.requestPasswordReset({
          email: email.trim(),
        });
        if (error) {
          setFormError(error.message ?? "Something went wrong. Try again in a moment.");
          return;
        }
        setSubmitted(true);
        toast.success("If an account exists for that email, we sent reset instructions.");
      } finally {
        setIsLoading(false);
      }
    },
    [email],
  );

  return (
    <AuthFormLayout
      title="Forgot password"
      description={
        submitted
          ? "If that email is registered, you will receive a reset link shortly."
          : "Enter your email and we will send you a link to choose a new password."
      }
      footerLink={{ href: loginHref, label: "Remember your password?", linkText: "Sign in" }}
    >
      {submitted ? (
        <p className="text-sm text-muted-foreground text-center">
          You can close this page after you check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {formError ? (
            <div className="p-3 text-sm font-medium text-destructive-foreground bg-destructive-foreground/10 rounded-md">
              {formError}
            </div>
          ) : null}
          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthFormLayout>
  );
}
