import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vitest";
import {
  buildPullApiPath,
  parsePullTarget,
  resolvePullOutputPath,
  resolvePullTarget,
  writePulledFiles,
} from "../index.js";
import { DotletApi } from "../services/dotlet-api.js";
import { FileService } from "../services/file-service.js";
import { Terminal } from "../services/terminal.js";

function createTerminal() {
  return {
    log: vi.fn(() => Effect.void),
    error: vi.fn(() => Effect.void),
    warn: vi.fn(() => Effect.void),
    success: vi.fn(() => Effect.void),
    info: vi.fn(() => Effect.void),
    muted: vi.fn(() => Effect.void),
    startSpinner: vi.fn(() => Effect.void),
    updateSpinner: vi.fn(() => Effect.void),
    succeedSpinner: vi.fn(() => Effect.void),
    failSpinner: vi.fn(() => Effect.void),
    warnSpinner: vi.fn(() => Effect.void),
    stopSpinner: Effect.void,
    box: vi.fn(() => Effect.void),
  };
}

describe("parsePullTarget", () => {
  it("parses a simple pull target", () => {
    expect(parsePullTarget("alice/laptop:.zshrc")).toEqual({
      device: "alice/laptop",
      islet: ".zshrc",
    });
  });

  it("parses a nested islet name", () => {
    expect(parsePullTarget("alice/laptop:nvim/init.lua")).toEqual({
      device: "alice/laptop",
      islet: "nvim/init.lua",
    });
  });

  it("parses ?v= on the islet segment", () => {
    expect(parsePullTarget("alice/laptop:.zshrc?v=rev1")).toEqual({
      device: "alice/laptop",
      islet: ".zshrc",
      version: "rev1",
    });
  });

  it("rejects malformed target shapes", () => {
    expect(() => parsePullTarget("alice/laptop")).toThrowError(
      "Pull target must be in format username/device:islet",
    );
    expect(() => parsePullTarget("alice:laptop:.zshrc")).toThrowError(
      "Pull target must be in format username/device:islet",
    );
    expect(() => parsePullTarget("alice//laptop:.zshrc")).toThrowError(
      "Pull target must be in format username/device:islet",
    );
    expect(() => parsePullTarget("alice/laptop:")).toThrowError(
      "Pull target must be in format username/device:islet",
    );
  });
});

describe("buildPullApiPath", () => {
  it("encodes device and islet query params", () => {
    const path = buildPullApiPath({
      device: "alice/macbook-pro",
      islet: "nvim/init.lua",
    });

    expect(path).toBe("/api/islets/pull?device=alice%2Fmacbook-pro&islet=nvim%2Finit.lua");
  });

  it("appends v when version is set", () => {
    const path = buildPullApiPath({
      device: "alice/macbook-pro",
      islet: ".zshrc",
      version: "abc1234",
    });
    expect(path).toBe("/api/islets/pull?device=alice%2Fmacbook-pro&islet=.zshrc&v=abc1234");
  });
});

describe("resolvePullTarget", () => {
  it("parses full username/device:islet and optional version", () => {
    expect(
      resolvePullTarget({
        raw: "alice/laptop:.zshrc",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({ device: "alice/laptop", islet: ".zshrc", version: undefined });

    expect(
      resolvePullTarget({
        raw: "alice/laptop:nvim/init.lua?v=rev1",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({ device: "alice/laptop", islet: "nvim/init.lua", version: "rev1" });
  });

  it("parses short islet using session username and device", () => {
    expect(
      resolvePullTarget({
        raw: ".zshrc",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({ device: "alice/laptop", islet: ".zshrc", version: undefined });
  });

  it("parses short islet?v=version", () => {
    expect(
      resolvePullTarget({
        raw: ".zshrc?v=abc",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({ device: "alice/laptop", islet: ".zshrc", version: "abc" });
  });

  it("uses --device with short islet", () => {
    expect(
      resolvePullTarget({
        raw: "config.json",
        deviceFlag: "work",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({ device: "alice/work", islet: "config.json", version: undefined });
  });

  it("uses --device username/device with short islet without session username", () => {
    expect(
      resolvePullTarget({
        raw: ".zshrc",
        deviceFlag: "bob/laptop",
      }),
    ).toEqual({ device: "bob/laptop", islet: ".zshrc", version: undefined });
  });

  it("uses default device username/device with short islet without session username", () => {
    expect(
      resolvePullTarget({
        raw: ".zshrc",
        device: "bob/laptop",
      }),
    ).toEqual({ device: "bob/laptop", islet: ".zshrc", version: undefined });
  });

  it("prefers username/device in --device over session username", () => {
    expect(
      resolvePullTarget({
        raw: "x",
        deviceFlag: "bob/work",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({ device: "bob/work", islet: "x", version: undefined });
  });

  it("rejects device value with more than one slash segment", () => {
    expect(() =>
      resolvePullTarget({
        raw: ".zshrc",
        deviceFlag: "a/b/c",
        username: "alice",
        device: "laptop",
      }),
    ).toThrow(/Invalid device/);
  });

  it("parses web URL with n and optional v", () => {
    expect(
      resolvePullTarget({
        raw: "https://dotlet.com/bob/desktop/islet?n=.zshrc",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({ device: "bob/desktop", islet: ".zshrc", version: undefined });

    expect(
      resolvePullTarget({
        raw: "http://localhost:3000/bob/desktop/islet?n=nvim/init.lua&v=rev99",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({ device: "bob/desktop", islet: "nvim/init.lua", version: "rev99" });
  });

  it("merges --version with URL v when equal", () => {
    expect(
      resolvePullTarget({
        raw: "https://dotlet.com/a/b/islet?n=x&v=rev1",
        versionFlag: "rev1",
        username: "u",
        device: "d",
      }).version,
    ).toBe("rev1");
  });

  it("rejects conflicting --version and inline version", () => {
    expect(() =>
      resolvePullTarget({
        raw: "alice/laptop:x?v=va",
        versionFlag: "vb",
        username: "alice",
        device: "laptop",
      }),
    ).toThrow(/Conflicting version/);
  });

  it("rejects --device with full target", () => {
    expect(() =>
      resolvePullTarget({
        raw: "alice/laptop:.zshrc",
        deviceFlag: "other",
        username: "alice",
        device: "laptop",
      }),
    ).toThrow(/Cannot combine --device/);
  });

  it("allows short islet paths that contain slashes", () => {
    expect(
      resolvePullTarget({
        raw: "nvim/init.lua",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({
      device: "alice/laptop",
      islet: "nvim/init.lua",
      version: undefined,
    });

    expect(
      resolvePullTarget({
        raw: "~/.config/ghostty/config.json",
        username: "bob",
        device: "macbook",
      }),
    ).toEqual({
      device: "bob/macbook",
      islet: "~/.config/ghostty/config.json",
      version: undefined,
    });

    expect(
      resolvePullTarget({
        raw: "nvim/init.lua?v=deadbeef",
        username: "alice",
        device: "laptop",
      }),
    ).toEqual({
      device: "alice/laptop",
      islet: "nvim/init.lua",
      version: "deadbeef",
    });
  });
});

describe("resolvePullOutputPath", () => {
  it("treats a single-file override as an exact file destination", async () => {
    const outputPath = await resolvePullOutputPath(
      {
        path: ".zshrc",
        downloadUrl: "https://example.com/zshrc",
      },
      ".zshrc",
      { path: "/tmp/custom-zshrc" },
    );

    expect(outputPath).toBe("/tmp/custom-zshrc");
  });

  it("treats a directory-like single-file override as a directory target", async () => {
    const outputPath = await resolvePullOutputPath(
      {
        path: "nvim/init.lua",
        downloadUrl: "https://example.com/init.lua",
      },
      "nvim/init.lua",
      { path: "/tmp/configs/" },
    );

    expect(outputPath).toBe("/tmp/configs/init.lua");
  });
});

describe("writePulledFiles", () => {
  it("skips existing files when force is false", async () => {
    const fileService = {
      readUtf8: vi.fn(() => Effect.succeed("existing")),
      writeUtf8: vi.fn(() => Effect.void),
      mkdirp: vi.fn(() => Effect.void),
      exists: vi.fn(() => Effect.succeed(true)),
    };
    const api = {
      downloadText: vi.fn(() => Effect.succeed("downloaded")),
    };
    const terminal = createTerminal();

    const written = await Effect.runPromise(
      writePulledFiles([{ path: ".zshrc", downloadUrl: "https://example.com/zshrc" }], ".zshrc", {
        force: false,
        path: "/tmp/",
      }).pipe(
        Effect.provideService(DotletApi, api as never),
        Effect.provideService(FileService, fileService),
        Effect.provideService(Terminal, terminal),
      ),
    );

    expect(fileService.exists).toHaveBeenCalledOnce();
    expect(fileService.writeUtf8).not.toHaveBeenCalled();
    expect(api.downloadText).not.toHaveBeenCalled();
    expect(written).toEqual([]);
    expect(terminal.warn).toHaveBeenCalledWith(expect.stringContaining("Skipped existing file:"));
  });

  it("downloads file content from the provided URL before writing", async () => {
    const fileService = {
      readUtf8: vi.fn(() => Effect.succeed("existing")),
      writeUtf8: vi.fn(() => Effect.void),
      mkdirp: vi.fn(() => Effect.void),
      exists: vi.fn(() => Effect.succeed(false)),
    };
    const api = {
      downloadText: vi.fn(() => Effect.succeed("downloaded")),
    };
    const terminal = createTerminal();

    const written = await Effect.runPromise(
      writePulledFiles(
        [{ path: ".zshrc", downloadUrl: "https://example.com/zshrc" }],
        "nvim/init.lua",
        {
          force: true,
          path: "/tmp/",
        },
      ).pipe(
        Effect.provideService(DotletApi, api as never),
        Effect.provideService(FileService, fileService),
        Effect.provideService(Terminal, terminal),
      ),
    );

    expect(api.downloadText).toHaveBeenCalledWith("https://example.com/zshrc", ".zshrc");
    expect(fileService.writeUtf8).toHaveBeenCalledWith("/tmp/.zshrc", "downloaded");
    expect(written).toEqual(["/tmp/.zshrc"]);
    expect(terminal.muted).toHaveBeenCalled();
  });
});
