function buildPathname(username: string, deviceName: string, suffix: string) {
  return `/${username}/${deviceName}/${suffix}`;
}

export function buildIsletViewHref(input: {
  username: string;
  deviceName: string;
  isletPath: string;
  revisionId?: string | null;
}): string {
  const searchParams = new URLSearchParams({
    n: input.isletPath,
  });

  if (input.revisionId?.trim()) {
    searchParams.set("v", input.revisionId.trim());
  }

  return `${buildPathname(input.username, input.deviceName, "islet")}?${searchParams.toString()}`;
}

export function buildIsletHistoryHref(input: {
  username: string;
  deviceName: string;
  isletPath: string;
}): string {
  const searchParams = new URLSearchParams({
    n: input.isletPath,
  });

  return `${buildPathname(input.username, input.deviceName, "islet/history")}?${searchParams.toString()}`;
}
