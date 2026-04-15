import { beforeEach, describe, expect, it, vi } from "vitest";
import { canAccessPulledIslet, parsePullDeviceTarget } from "./access";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/storage/provider", () => ({
  getStorageProvider: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { getStorageProvider } from "@/lib/storage/provider";
import { GET } from "./route";

function deviceSelectChain<T>(rows: T[]) {
  return {
    from: () => ({
      innerJoin: () => ({
        where: () => ({
          limit: () => Promise.resolve(rows),
        }),
      }),
    }),
  };
}

function limitedSelectChain<T>(rows: T[]) {
  return {
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  };
}

function selectChain<T>(rows: T[]) {
  return {
    from: () => ({
      where: () => Promise.resolve(rows),
    }),
  };
}

describe("parsePullDeviceTarget", () => {
  it("parses username/device", () => {
    expect(parsePullDeviceTarget("alice/laptop")).toEqual({
      username: "alice",
      device: "laptop",
    });
  });

  it("rejects malformed device targets", () => {
    expect(() => parsePullDeviceTarget(null)).toThrowError("device query parameter is required");
    expect(() => parsePullDeviceTarget("laptop")).toThrowError(
      "Device must be in format username/device",
    );
    expect(() => parsePullDeviceTarget("alice//laptop")).toThrowError(
      "Device must be in format username/device",
    );
  });
});

describe("canAccessPulledIslet", () => {
  it("allows owners to pull private islets", () => {
    expect(
      canAccessPulledIslet({
        isOwner: true,
        deviceVisibility: "private",
        isletVisibility: "private",
      }),
    ).toBe(true);
  });

  it("allows non-owners to pull public islets from public devices", () => {
    expect(
      canAccessPulledIslet({
        isOwner: false,
        deviceVisibility: "public",
        isletVisibility: "public",
      }),
    ).toBe(true);
  });

  it("blocks non-owners from private islets on public devices", () => {
    expect(
      canAccessPulledIslet({
        isOwner: false,
        deviceVisibility: "public",
        isletVisibility: "private",
      }),
    ).toBe(false);
  });

  it("blocks non-owners from private devices", () => {
    expect(
      canAccessPulledIslet({
        isOwner: false,
        deviceVisibility: "private",
        isletVisibility: "public",
      }),
    ).toBe(false);
  });
});

describe("GET /api/islets/pull", () => {
  const device = {
    id: "dev-1",
    userId: "user-1",
    name: "laptop",
    visibility: "public" as const,
  };
  const makeIsletRow = (path: string, currentRevisionId: string | null, visibility = "public") => ({
    id: `islet-${path}`,
    path,
    visibility: visibility as "public" | "private",
    currentRevisionId,
  });
  const makeRevision = (id: string, storageKey = id) => ({
    id,
    isletId: `islet-${id}`,
    parentRevisionId: null as string | null,
    contentHash: "ab".repeat(32),
    storageKey,
    message: null as string | null,
    createdAt: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    vi.mocked(getStorageProvider).mockReturnValue({
      upload: vi.fn(async () => {}),
      get: vi.fn(async () => Buffer.from("hello", "utf8")),
      exists: vi.fn(async () => false),
      presignGetUrl: vi.fn(async (key: string) => `https://example.com/download/${key}`),
      presignPutUrl: vi.fn(async () => "https://example.com/upload"),
    });
  });

  it("returns exactly one file from the current revision", async () => {
    const isletRow = makeIsletRow(".zshrc", "rev-1");
    const revision = makeRevision("rev-1", "k1");

    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([isletRow]) as never)
      .mockReturnValueOnce(selectChain([revision]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=.zshrc"),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { files: Array<{ path: string; downloadUrl: string }> };
    expect(json.files).toHaveLength(1);
    expect(json.files[0]).toEqual({
      path: ".zshrc",
      downloadUrl: "https://example.com/download/k1",
    });
  });

  it("returns file for revision in v when it is not the current revision", async () => {
    const isletRow = makeIsletRow(".zshrc", "rev-current");
    const revision = { ...makeRevision("rev-old", "k-old"), isletId: isletRow.id };

    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([isletRow]) as never)
      .mockReturnValueOnce(selectChain([revision]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=.zshrc&v=rev-old"),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { files: Array<{ path: string; downloadUrl: string }> };
    expect(json.files).toEqual([
      {
        path: ".zshrc",
        downloadUrl: "https://example.com/download/k-old",
      },
    ]);
  });

  it("returns 404 when v does not match any revision", async () => {
    const isletRow = makeIsletRow(".zshrc", "rev-1");
    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([isletRow]) as never)
      .mockReturnValueOnce(selectChain([]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=.zshrc&v=missing"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when v points to a revision from another islet", async () => {
    const isletRow = makeIsletRow(".zshrc", "rev-1");
    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([isletRow]) as never)
      .mockReturnValueOnce(selectChain([]) as never);

    const res = await GET(
      new Request(
        "http://localhost/api/islets/pull?device=alice/laptop&islet=.zshrc&v=rev-from-other-islet",
      ),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when islet row is missing", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([]) as never)
      .mockReturnValueOnce(selectChain([]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=missing"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when revision row is missing", async () => {
    const isletRow = makeIsletRow(".zshrc", "rev-1");
    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([isletRow]) as never)
      .mockReturnValueOnce(selectChain([]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=.zshrc"),
    );
    expect(res.status).toBe(404);
  });

  it("ignores v when using folder prefix match and returns current revisions", async () => {
    const presignGetUrl = vi.fn(async (storageKey: string) => {
      if (storageKey === "rev-auth") {
        return "https://example.com/download/rev-auth";
      }
      if (storageKey === "rev-config") {
        return "https://example.com/download/rev-config";
      }
      throw new Error(`Unexpected storage key: ${storageKey}`);
    });
    vi.mocked(getStorageProvider).mockReturnValue({
      upload: vi.fn(async () => {}),
      get: vi.fn(async () => Buffer.from("", "utf8")),
      exists: vi.fn(async () => false),
      presignGetUrl,
      presignPutUrl: vi.fn(async () => "https://example.com/upload"),
    });

    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([]) as never)
      .mockReturnValueOnce(
        selectChain([
          makeIsletRow("~/.config/ghostty/config.json", "rev-config"),
          makeIsletRow("~/.config/ghostty/auth.json", "rev-auth"),
        ]) as never,
      )
      .mockReturnValueOnce(
        selectChain([makeRevision("rev-config"), makeRevision("rev-auth")]) as never,
      );

    const res = await GET(
      new Request(
        "http://localhost/api/islets/pull?device=alice/laptop&islet=~/.config/ghostty&v=some-other-rev",
      ),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { files: Array<{ path: string; downloadUrl: string }> };
    expect(json.files).toEqual([
      {
        path: "~/.config/ghostty/auth.json",
        downloadUrl: "https://example.com/download/rev-auth",
      },
      {
        path: "~/.config/ghostty/config.json",
        downloadUrl: "https://example.com/download/rev-config",
      },
    ]);
  });

  it("falls back to folder matches and returns multiple files in path order", async () => {
    const presignGetUrl = vi.fn(async (storageKey: string) => {
      if (storageKey === "rev-auth") {
        return "https://example.com/download/rev-auth";
      }
      if (storageKey === "rev-config") {
        return "https://example.com/download/rev-config";
      }
      throw new Error(`Unexpected storage key: ${storageKey}`);
    });
    vi.mocked(getStorageProvider).mockReturnValue({
      upload: vi.fn(async () => {}),
      get: vi.fn(async () => Buffer.from("", "utf8")),
      exists: vi.fn(async () => false),
      presignGetUrl,
      presignPutUrl: vi.fn(async () => "https://example.com/upload"),
    });

    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([]) as never)
      .mockReturnValueOnce(
        selectChain([
          makeIsletRow("~/.config/ghostty/config.json", "rev-config"),
          makeIsletRow("~/.config/ghostty/auth.json", "rev-auth"),
        ]) as never,
      )
      .mockReturnValueOnce(
        selectChain([makeRevision("rev-config"), makeRevision("rev-auth")]) as never,
      );

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=~/.config/ghostty"),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { files: Array<{ path: string; downloadUrl: string }> };
    expect(json.files).toEqual([
      {
        path: "~/.config/ghostty/auth.json",
        downloadUrl: "https://example.com/download/rev-auth",
      },
      {
        path: "~/.config/ghostty/config.json",
        downloadUrl: "https://example.com/download/rev-config",
      },
    ]);
  });

  it("treats folder fallback as boundary-safe and excludes sibling-like prefixes", async () => {
    const presignGetUrl = vi.fn(
      async (storageKey: string) => `https://example.com/download/${storageKey}`,
    );
    vi.mocked(getStorageProvider).mockReturnValue({
      upload: vi.fn(async () => {}),
      get: vi.fn(async () => Buffer.from("", "utf8")),
      exists: vi.fn(async () => false),
      presignGetUrl,
      presignPutUrl: vi.fn(async () => "https://example.com/upload"),
    });

    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([]) as never)
      .mockReturnValueOnce(
        selectChain([makeIsletRow("~/.config/ghostty/config.json", "rev-config")]) as never,
      )
      .mockReturnValueOnce(selectChain([makeRevision("rev-config")]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=~/.config/ghostty"),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { files: Array<{ path: string; downloadUrl: string }> };
    expect(json.files).toEqual([
      {
        path: "~/.config/ghostty/config.json",
        downloadUrl: "https://example.com/download/rev-config",
      },
    ]);
  });

  it("returns 404 when folder matches exist but none have a current revision", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([]) as never)
      .mockReturnValueOnce(
        selectChain([makeIsletRow("~/.config/ghostty/config.json", null)]) as never,
      );

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=~/.config/ghostty"),
    );

    expect(res.status).toBe(404);
  });

  it("allows owners to pull private files through folder fallback", async () => {
    const ownerOnlyDevice = { ...device, visibility: "private" as const };
    const presignGetUrl = vi.fn(async () => "https://example.com/download/rev-private");
    vi.mocked(getStorageProvider).mockReturnValue({
      upload: vi.fn(async () => {}),
      get: vi.fn(async () => Buffer.from("", "utf8")),
      exists: vi.fn(async () => false),
      presignGetUrl,
      presignPutUrl: vi.fn(async () => "https://example.com/upload"),
    });

    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([ownerOnlyDevice]) as never)
      .mockReturnValueOnce(limitedSelectChain([]) as never)
      .mockReturnValueOnce(
        selectChain([
          makeIsletRow("~/.config/ghostty/auth.json", "rev-private", "private"),
        ]) as never,
      )
      .mockReturnValueOnce(selectChain([makeRevision("rev-private")]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=~/.config/ghostty"),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { files: Array<{ path: string; downloadUrl: string }> };
    expect(json.files).toEqual([
      {
        path: "~/.config/ghostty/auth.json",
        downloadUrl: "https://example.com/download/rev-private",
      },
    ]);
  });

  it("allows non-owners to pull public files through folder fallback", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "other-user" },
    } as never);
    const publicDevice = { ...device, userId: "owner-user", visibility: "public" as const };
    const presignGetUrl = vi.fn(async () => "https://example.com/download/rev-public");
    vi.mocked(getStorageProvider).mockReturnValue({
      upload: vi.fn(async () => {}),
      get: vi.fn(async () => Buffer.from("", "utf8")),
      exists: vi.fn(async () => false),
      presignGetUrl,
      presignPutUrl: vi.fn(async () => "https://example.com/upload"),
    });

    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([publicDevice]) as never)
      .mockReturnValueOnce(limitedSelectChain([]) as never)
      .mockReturnValueOnce(
        selectChain([
          makeIsletRow("~/.config/ghostty/config.json", "rev-public", "public"),
        ]) as never,
      )
      .mockReturnValueOnce(selectChain([makeRevision("rev-public")]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=~/.config/ghostty"),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { files: Array<{ path: string; downloadUrl: string }> };
    expect(json.files).toEqual([
      {
        path: "~/.config/ghostty/config.json",
        downloadUrl: "https://example.com/download/rev-public",
      },
    ]);
  });

  it("returns 404 for non-owner folder fallback when no public child islets match", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "other-user" },
    } as never);
    vi.mocked(db.select)
      .mockReturnValueOnce(deviceSelectChain([device]) as never)
      .mockReturnValueOnce(limitedSelectChain([]) as never)
      .mockReturnValueOnce(selectChain([]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=~/.config/ghostty"),
    );

    expect(res.status).toBe(404);
  });

  it("returns 404 for non-owner when device is private", async () => {
    const privateDevice = { ...device, userId: "other-user", visibility: "private" as const };
    vi.mocked(db.select).mockReturnValueOnce(deviceSelectChain([privateDevice]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/pull?device=alice/laptop&islet=.zshrc"),
    );
    expect(res.status).toBe(404);
    expect(db.select).toHaveBeenCalledTimes(1);
  });
});
