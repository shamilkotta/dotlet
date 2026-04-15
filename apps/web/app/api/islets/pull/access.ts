import { parseRequiredDeviceTarget } from "@/lib/core/device-target";

export function parsePullDeviceTarget(rawTarget: string | null) {
  if (!rawTarget?.trim()) {
    throw new Error("device query parameter is required");
  }

  try {
    return parseRequiredDeviceTarget(rawTarget);
  } catch {
    throw new Error("Device must be in format username/device");
  }
}

export function canAccessPulledIslet(input: {
  isOwner: boolean;
  deviceVisibility: "public" | "private";
  isletVisibility: "public" | "private";
}): boolean {
  if (input.isOwner) {
    return true;
  }

  return input.deviceVisibility === "public" && input.isletVisibility === "public";
}
