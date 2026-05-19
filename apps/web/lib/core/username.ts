export const DEVICE_NAME_MIN_LENGTH = 3;
export const DEVICE_NAME_MAX_LENGTH = 16;
export const DEVICE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export const USERNAME_REGEX = /^[a-z0-9_-]+$/;

export function normalizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function isValidUsername(value: string): boolean {
  const normalized = normalizeUsername(value);
  if (!normalized) {
    return false;
  }
  return USERNAME_REGEX.test(normalized) && !RESERVED_USERNAMES.has(normalized);
}

export function isValidDeviceName(value: string): boolean {
  const normalized = value.trim();
  if (
    normalized.length < DEVICE_NAME_MIN_LENGTH ||
    normalized.length > DEVICE_NAME_MAX_LENGTH ||
    !DEVICE_NAME_REGEX.test(normalized)
  ) {
    return false;
  }
  return true;
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
