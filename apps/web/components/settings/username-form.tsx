"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { toast } from "@workspace/ui/components/sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { isValidUsername, normalizeUsername } from "@/lib/core/username";
import { authClient } from "@/lib/auth-client";

export function UsernameForm({
  currentUsername,
  email,
}: {
  currentUsername: string;
  email: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalized = normalizeUsername(username.trim());
    if (normalized === currentUsername) {
      toast.message("Username unchanged");
      return;
    }

    if (!normalized) {
      setError("Username cannot be empty.");
      return;
    }

    if (!isValidUsername(normalized)) {
      setError("That username is reserved or invalid.");
      return;
    }

    setLoading(true);

    const availability = await authClient.isUsernameAvailable({ username: normalized });
    if (availability.error) {
      setLoading(false);
      setError(availability.error.message ?? "Could not check username availability.");
      return;
    }

    if (!availability.data?.available) {
      setLoading(false);
      setError("That username is already taken.");
      return;
    }

    const response = await authClient.updateUser({ username: normalized });
    setLoading(false);

    if (response.error) {
      setError(response.error.message ?? "Could not update username.");
      return;
    }

    toast.success("Username updated");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled className="h-11" />
        <p className="text-xs text-muted-foreground">Synced from your GitHub account.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, underscores, and hyphens only. Your profile URL is /
          {normalizeUsername(username) || "username"}.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive-foreground/10 p-3 text-sm font-medium text-destructive-foreground">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={loading} className="h-11">
        Save username {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : ""}
      </Button>
    </form>
  );
}
