"use client";

import { useState } from "react";
import { Github, Loader2 } from "lucide-react";

import { toast } from "@workspace/ui/components/sonner";
import { Button } from "@workspace/ui/components/button";
import { authClient } from "@/lib/auth-client";
import { AuthFormLayout } from "./layout";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [loading, setLoading] = useState(false);

  async function signInWithGithub() {
    setLoading(true);

    const callbackURL = redirectTo
      ? `/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
      : "/auth/callback";

    const response = await authClient.signIn.social({
      provider: "github",
      callbackURL,
    });

    setLoading(false);

    if (response.error) {
      toast.error(response.error.message ?? "GitHub sign in failed");
    }
  }

  return (
    <AuthFormLayout
      title="Welcome to dotlet"
      description="Sign in with your GitHub account to access dotlet"
    >
      <Button
        type="button"
        className="h-11 w-full"
        disabled={loading}
        onClick={() => void signInWithGithub()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Github className="h-4 w-4" />
            Continue with GitHub
          </>
        )}
      </Button>
    </AuthFormLayout>
  );
}
