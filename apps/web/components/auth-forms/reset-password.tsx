"use client";

import { type FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "@workspace/ui/components/sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { authClient } from "@/lib/auth-client";
import { AuthFormLayout } from "./layout";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      if (!token) {
        setFormError(
          "This reset link is missing a token. Request a new link from the sign-in page.",
        );
        return;
      }
      if (password.length < 8) {
        setFormError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setFormError("Passwords do not match.");
        return;
      }
      setIsLoading(true);
      try {
        const { error } = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (error) {
          const msg = error.message ?? "";
          setFormError(
            msg.toLowerCase().includes("token") || msg.toLowerCase().includes("invalid")
              ? "This link is invalid or expired. Request a new one from the sign-in page."
              : "Could not reset your password. Try again.",
          );
          return;
        }
        toast.success("Password updated. You can sign in now.");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    },
    [token, password, confirm, router],
  );

  return (
    <AuthFormLayout
      title="Choose a new password"
      description="Enter a new password for your account."
      footerLink={{ href: "/login", label: "Rather sign in?", linkText: "Back to sign in" }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            New password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-11"
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="confirm"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Confirm password
          </label>
          <Input
            id="confirm"
            type="password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="h-11"
            autoComplete="new-password"
          />
        </div>
        {formError ? (
          <div className="p-3 text-sm font-medium text-destructive-foreground bg-destructive-foreground/10 rounded-md">
            {formError}
          </div>
        ) : null}
        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
        </Button>
      </form>
    </AuthFormLayout>
  );
}
