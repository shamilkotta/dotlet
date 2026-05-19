import { inArray } from "drizzle-orm";
import { randomSuffix } from "@/lib/core/crypto";

import { isValidUsername, normalizeUsername } from "@/lib/core/username";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";

type GithubProfile = {
  login?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

function emailLocalPart(email: string): string {
  const local = email.split("@")[0] ?? "";
  return normalizeUsername(local);
}

export function buildUsernameCandidates(base: string, email?: string | null): string[] {
  const normalizedBase = normalizeUsername(base);
  if (!normalizedBase) {
    return [];
  }

  const candidates: string[] = [normalizedBase];

  if (email) {
    const local = emailLocalPart(email);
    if (local && local !== normalizedBase) {
      candidates.push(`${normalizedBase}-${local}`);
    }
  }

  candidates.push(`${normalizedBase}-${randomSuffix()}`);
  candidates.push(`${normalizedBase}-${randomSuffix()}`);

  return [...new Set(candidates.filter(isValidUsername))];
}

export async function findFirstAvailableUsername(candidates: string[]): Promise<string | null> {
  const uniqueCandidates = [...new Set(candidates.filter(isValidUsername))];
  if (uniqueCandidates.length === 0) {
    return null;
  }

  const takenRows = await db
    .select({ username: user.username })
    .from(user)
    .where(inArray(user.username, uniqueCandidates));

  const taken = new Set(
    takenRows.map((row) => row.username).filter((value): value is string => value !== null),
  );

  return uniqueCandidates.find((candidate) => !taken.has(candidate)) ?? null;
}

export async function allocateUniqueUsername(base: string, email?: string | null): Promise<string> {
  const candidates = buildUsernameCandidates(base, email);
  if (candidates.length === 0) {
    throw new Error("Could not derive a username from GitHub login");
  }

  const available = await findFirstAvailableUsername(candidates);
  if (available) {
    return available;
  }

  throw new Error("Could not allocate a unique username");
}

export function mapGithubProfileToUser(profile: GithubProfile) {
  const login = profile.login?.trim();
  if (!login) {
    throw new Error("GitHub profile is missing login");
  }

  const email = profile.email?.trim();
  if (!email) {
    throw new Error("GitHub profile is missing email. Grant user:email scope.");
  }

  const username = normalizeUsername(login);
  if (!username) {
    throw new Error("GitHub login could not be normalized to a username");
  }

  return {
    name: profile.name?.trim() || login,
    email,
    emailVerified: true,
    image: profile.avatar_url ?? undefined,
    username,
    displayUsername: login,
  };
}
