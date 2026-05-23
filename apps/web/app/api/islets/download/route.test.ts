import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const chain = {
    innerJoin: () => chain,
    where: () => ({
      limit: () => Promise.resolve(rows),
    }),
  };
  return {
    from: () => chain,
  };
}

describe("GET /api/islets/download", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset();
    vi.mocked(auth.api.getSession).mockReset();
    vi.mocked(getStorageProvider).mockReset();
  });

  it("returns 400 when device or n is missing", async () => {
    const res = await GET(new Request("http://localhost/api/islets/download?device=a/b"));
    expect(res.status).toBe(400);
  });

  it("redirects to a presigned URL when access is allowed", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const target = {
      isletPath: "cfg/init.lua",
      storageKey: "sk1",
    };

    vi.mocked(db.select).mockReturnValueOnce(deviceSelectChain([target]) as never);

    const presignGetUrl = vi.fn(async () => "https://storage.example.com/obj");
    vi.mocked(getStorageProvider).mockReturnValue({ presignGetUrl } as never);

    const res = await GET(
      new Request("http://localhost/api/islets/download?device=alice/laptop&n=cfg/init.lua"),
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://storage.example.com/obj");
    expect(presignGetUrl).toHaveBeenCalledWith(
      "sk1",
      expect.objectContaining({
        responseContentDisposition: expect.stringContaining("attachment"),
      }),
    );
  });

  it("returns 404 for a private device when unauthenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    vi.mocked(db.select).mockReturnValueOnce(deviceSelectChain([]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/download?device=alice/laptop&n=cfg/init.lua"),
    );

    expect(res.status).toBe(404);
    expect(getStorageProvider).not.toHaveBeenCalled();
  });

  it("returns 404 for a private islet when viewer is not the owner", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "other" },
    } as never);

    vi.mocked(db.select).mockReturnValueOnce(deviceSelectChain([]) as never);

    const res = await GET(
      new Request("http://localhost/api/islets/download?device=alice/laptop&n=secret"),
    );

    expect(res.status).toBe(404);
    expect(getStorageProvider).not.toHaveBeenCalled();
  });
});
