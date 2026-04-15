import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_REGEX } from "@/lib/core/username";

export type DeviceTarget = {
  username: string | null;
  device: string;
};

function validateNameSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  if (
    normalized.length < USERNAME_MIN_LENGTH ||
    normalized.length > USERNAME_MAX_LENGTH ||
    !USERNAME_REGEX.test(normalized)
  ) {
    throw new Error(`Invalid ${label.toLowerCase()}`);
  }

  return normalized;
}

export function parseOptionalDeviceTarget(rawTarget: string | null): DeviceTarget {
  if (!rawTarget) {
    return { username: null, device: "" };
  }

  const parts = rawTarget
    .trim()
    .split("/")
    .map((part) => part.trim());

  if (parts.length === 1) {
    return {
      username: null,
      device: validateNameSegment(parts[0] ?? "", "Device"),
    };
  }

  if (parts.length === 2) {
    return {
      username: validateNameSegment(parts[0] ?? "", "Username"),
      device: validateNameSegment(parts[1] ?? "", "Device"),
    };
  }

  throw new Error("Device must be in format device or username/device");
}

export function parseRequiredDeviceTarget(rawTarget: string | null): {
  username: string;
  device: string;
} {
  const target = parseOptionalDeviceTarget(rawTarget);
  if (!target.username) {
    throw new Error("Device must be in format username/device");
  }

  return {
    username: target.username,
    device: target.device,
  };
}
