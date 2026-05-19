import {
  DEVICE_NAME_MAX_LENGTH,
  DEVICE_NAME_MIN_LENGTH,
  DEVICE_NAME_REGEX,
  isValidUsername,
  isValidDeviceName,
  normalizeUsername,
} from "@/lib/core/username";

export type DeviceTarget = {
  username: string | null;
  device: string;
};

function validateDeviceSegment(value: string): string {
  const normalized = normalizeUsername(value.trim());
  if (!normalized || !isValidDeviceName(normalized)) {
    throw new Error("Invalid device");
  }

  return normalized;
}

function validateUsernameSegment(value: string): string {
  const normalized = normalizeUsername(value.trim());
  if (!normalized || !isValidUsername(normalized)) {
    throw new Error("Invalid username");
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
      device: validateDeviceSegment(parts[0] ?? ""),
    };
  }

  if (parts.length === 2) {
    return {
      username: validateUsernameSegment(parts[0] ?? ""),
      device: validateDeviceSegment(parts[1] ?? ""),
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
