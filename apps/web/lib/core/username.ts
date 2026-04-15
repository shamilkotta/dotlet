export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 16;
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export function isValidUsername(value: string): boolean {
  const normalized = value.toLowerCase();
  return USERNAME_REGEX.test(value) && !RESERVED_USERNAMES.has(normalized);
}

export const RESERVED_USERNAMES = new Set([
  "about",
  "admin",
  "api",
  "auth",
  "blog",
  "dashboard",
  "docs",
  "help",
  "home",
  "login",
  "logout",
  "pricing",
  "register",
  "settings",
  "signin",
  "signup",
  "support",
  "terms",
  "verify",
  "user",
  "users",
  "device",
  "devices",
  "islet",
  "islets",
  "revision",
  "revisions",
  "storage",
  "dotlet",
]);
