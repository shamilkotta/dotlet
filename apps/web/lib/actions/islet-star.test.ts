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
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { starIslet, unstarIslet } from "./islet-star";

function contextSelectChain<T>(rows: T[]) {
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

function countSelectChain(n: number) {
  return {
    from: () => ({
      where: () => Promise.resolve([{ n }]),
    }),
  };
}

describe("islet star actions", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset();
    vi.mocked(db.insert).mockReset();
    vi.mocked(db.delete).mockReset();
    vi.mocked(auth.api.getSession).mockReset();
  });

  it("starIslet returns Unauthorized when there is no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const res = await starIslet("550e8400-e29b-41d4-a716-446655440000");

    expect(res).toEqual({ ok: false, error: "Unauthorized" });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("starIslet returns Not found for invalid uuid", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({} as never);

    const res = await starIslet("not-a-uuid");

    expect(res).toEqual({ ok: false, error: "Not found" });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("starIslet returns Not found when islet does not exist", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1" },
    } as never);

    vi.mocked(db.select).mockImplementation(() => contextSelectChain([]) as never);

    const res = await starIslet("550e8400-e29b-41d4-a716-446655440000");

    expect(res).toEqual({ ok: false, error: "Not found" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("starIslet returns Not found when caller cannot access private islet", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "stranger" },
    } as never);

    const ctx = {
      isletId: "550e8400-e29b-41d4-a716-446655440000",
      isletVisibility: "private" as const,
      deviceVisibility: "public" as const,
      deviceOwnerId: "owner",
    };

    vi.mocked(db.select).mockImplementation(() => contextSelectChain([ctx]) as never);

    const res = await starIslet("550e8400-e29b-41d4-a716-446655440000");

    expect(res).toEqual({ ok: false, error: "Not found" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("starIslet inserts and returns count for public islet", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1" },
    } as never);

    const ctx = {
      isletId: "550e8400-e29b-41d4-a716-446655440000",
      isletVisibility: "public" as const,
      deviceVisibility: "public" as const,
      deviceOwnerId: "owner",
    };

    let selectPass = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectPass += 1;
      if (selectPass === 1) {
        return contextSelectChain([ctx]) as never;
      }
      return countSelectChain(7) as never;
    });

    vi.mocked(db.insert).mockReturnValue({
      values: () => ({
        onConflictDoNothing: () => Promise.resolve(),
      }),
    } as never);

    const res = await starIslet("550e8400-e29b-41d4-a716-446655440000");

    expect(res).toEqual({ ok: true, starred: true, starCount: 7 });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("starIslet is idempotent when insert is no-op", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1" },
    } as never);

    const ctx = {
      isletId: "550e8400-e29b-41d4-a716-446655440000",
      isletVisibility: "public" as const,
      deviceVisibility: "public" as const,
      deviceOwnerId: "owner",
    };

    let selectPass = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectPass += 1;
      if (selectPass % 2 === 1) {
        return contextSelectChain([ctx]) as never;
      }
      return countSelectChain(3) as never;
    });

    vi.mocked(db.insert).mockReturnValue({
      values: () => ({
        onConflictDoNothing: () => Promise.resolve(),
      }),
    } as never);

    const first = await starIslet("550e8400-e29b-41d4-a716-446655440000");
    const second = await starIslet("550e8400-e29b-41d4-a716-446655440000");

    expect(first).toEqual({ ok: true, starred: true, starCount: 3 });
    expect(second).toEqual({ ok: true, starred: true, starCount: 3 });
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it("unstarIslet deletes and returns starred false", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1" },
    } as never);

    const ctx = {
      isletId: "550e8400-e29b-41d4-a716-446655440000",
      isletVisibility: "public" as const,
      deviceVisibility: "public" as const,
      deviceOwnerId: "owner",
    };

    let selectPass = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectPass += 1;
      if (selectPass === 1) {
        return contextSelectChain([ctx]) as never;
      }
      return countSelectChain(0) as never;
    });

    vi.mocked(db.delete).mockReturnValue({
      where: () => Promise.resolve(),
    } as never);

    const res = await unstarIslet("550e8400-e29b-41d4-a716-446655440000");

    expect(res).toEqual({ ok: true, starred: false, starCount: 0 });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("unstarIslet is idempotent when no row existed", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1" },
    } as never);

    const ctx = {
      isletId: "550e8400-e29b-41d4-a716-446655440000",
      isletVisibility: "public" as const,
      deviceVisibility: "public" as const,
      deviceOwnerId: "owner",
    };

    let selectPass = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectPass += 1;
      if (selectPass % 2 === 1) {
        return contextSelectChain([ctx]) as never;
      }
      return countSelectChain(2) as never;
    });

    vi.mocked(db.delete).mockReturnValue({
      where: () => Promise.resolve(),
    } as never);

    const first = await unstarIslet("550e8400-e29b-41d4-a716-446655440000");
    const second = await unstarIslet("550e8400-e29b-41d4-a716-446655440000");

    expect(first).toEqual({ ok: true, starred: false, starCount: 2 });
    expect(second).toEqual({ ok: true, starred: false, starCount: 2 });
  });
});
