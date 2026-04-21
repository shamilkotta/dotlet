"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { authClient } from "@/lib/auth-client";
import { AuthFormLayout } from "./layout";

export function SignupForm({ redirectTo }: { redirectTo?: string }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await authClient.signUp.email({
      email,
      password,
      name,
      username,
    });

    setLoading(false);
    if (response.error) {
      setError(response.error.message ?? "Account creation failed");
      return;
    }

    if (!response.data?.token) {
      setAwaitingVerification(true);
      return;
    }

    const userName = (response.data.user as { username?: string }).username;
    const nextPath = redirectTo ?? `/${userName}`;
    router.push(nextPath);
    router.refresh();
  }

  const loginHref = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";

  if (awaitingVerification) {
    return (
      <AuthFormLayout
        title="Check your email"
        description="We sent you a link to verify your address. Open it on this device to finish setting up your account."
        footerLink={{ href: loginHref, label: "Already verified?", linkText: "Sign in" }}
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Mail className="h-8 w-8 text-primary" aria-hidden />
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Did not get the email? Check spam, or sign in and use &quot;Resend verification&quot; if
            your inbox is quiet.
          </p>
          <Button asChild className="w-full h-11" variant="secondary">
            <Link href={loginHref}>Back to sign in</Link>
          </Button>
        </div>
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout
      title="Create an account"
      description="Enter your details to get started"
      footerLink={{ href: loginHref, label: "Already have an account?", linkText: "Log in" }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="name"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11"
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="username"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Username
          </label>
          <Input
            id="username"
            type="text"
            placeholder="your-handle"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="h-11"
            autoComplete="username"
          />
        </div>
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
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11"
            autoComplete="new-password"
          />
        </div>

        {error ? (
          <div className="p-3 text-sm font-medium text-destructive-foreground bg-destructive-foreground/10 rounded-md">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
        </Button>
      </form>
    </AuthFormLayout>
  );
}
