import { Suspense } from "react";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";

import { AuthHeader } from "@/components/auth-header";
import { CopyInstallCommandButton } from "@/components/copy-install-command-button";
import { LandingFooter } from "@/components/landing-footer";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "dotlet",
  description: "Keep your dotfiles consistent everywhere with versioned backups",
};

export default function Home() {
  return (
    <div>
      <div
        className={`${jetbrainsMono.className} min-h-screen bg-background p-4 text-foreground md:p-12`}
      >
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
          <header className="mb-12 flex items-center justify-between gap-4 border-b border-border pb-6">
            <div className="space-y-1">
              <div className="text-sm font-bold uppercase tracking-widest">DOTLET</div>
              <div className="text-xs text-muted-foreground">v0.1.0</div>
            </div>
            <Suspense fallback={null}>
              <AuthHeader />
            </Suspense>
          </header>

          <main className=" space-y-16">
            <section className="mb-8">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-muted-foreground">guest@dotlet:~$</span>
                <span className="font-bold text-foreground">dot --version</span>
              </div>
              <div className="mb-8 border-l border-border pl-7">
                <div className="mb-4 text-3xl font-bold tracking-tighter text-foreground md:text-5xl">
                  dotlet v0.1.0_(ALPHA)
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Make your environment portable. dotlet backs up and versions the configs you care
                  about and syncs them between machines, just pull and you're ready.
                </p>
                <Link
                  className="mt-6 inline-block border border-border px-8 py-4 text-center text-sm font-bold text-foreground transition-colors duration-300 hover:bg-muted"
                  href="/docs"
                >
                  GET_STARTED
                </Link>
              </div>

              <div className="mb-2 flex items-center gap-3">
                <span className="text-muted-foreground">guest@dotlet:~$</span>
                <span className="font-bold text-foreground">dot help</span>
              </div>
              <div className="grid max-w-3xl grid-cols-1 gap-4 border-l border-border pl-7 ">
                {(
                  [
                    ["dot features", "CORE ENGINE", false],
                    ["dot explore", "VALUE PROPS", false],
                    // ["dot trust", "TESTIMONIALS", false],
                    ["dot install", "CTA", false],
                  ] as const
                ).map(([cmd, tag, cta]) => (
                  <Link
                    key={cmd}
                    href={`#${cmd.replaceAll(" ", "_")}`}
                    className="flex justify-between border-b border-border/50 pb-1"
                  >
                    <span className="text-foreground">{cmd}</span>
                    <span
                      className={`text-xs uppercase ${cta ? "font-bold text-foreground" : "text-muted-foreground"}`}
                    >
                      [{tag}]
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section id="dot_features" className="scroll-mt-8">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-muted-foreground">guest@dotlet:~$</span>
                <span className="font-bold text-foreground">dot features</span>
              </div>
              <div className="space-y-12 border-l border-border py-4 pl-7">
                <div className="max-w-2xl">
                  <span className="mb-2 block text-[10px] uppercase tracking-widest text-muted-foreground">
                    [01] DEVICE_ORGANIZATION
                  </span>
                  <h3 className="mb-3 text-xl font-bold text-foreground">
                    Keep every machine separate
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Push files to a named device so your laptop, desktop, and server each have their
                    own space. You can tell at a glance which config belongs to which setup.
                  </p>
                </div>
                <div className="max-w-2xl ">
                  <span className="mb-2 block text-[10px] uppercase tracking-widest text-muted-foreground">
                    [02] ONE_COMMAND_RESTORES
                  </span>
                  <h3 className="mb-3 text-xl font-bold text-foreground">
                    Pull files back where they belong
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Use `dot pull` to restore a config or folder in seconds. dotlet can return it to
                    its original location by default, or write it to a path you choose.
                  </p>
                </div>
                <div className="max-w-2xl">
                  <span className="mb-2 block text-[10px] uppercase tracking-widest text-muted-foreground">
                    [03] WEB_VIEW_HISTORY
                  </span>
                  <h3 className="mb-3 text-xl font-bold text-foreground">
                    Browse files and past revisions
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Open any device in the browser to inspect files, view past revisions, and share
                    public configs without digging through your home directory.
                  </p>
                </div>
              </div>
            </section>

            <section id="dot_explore" className="scroll-mt-8">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-muted-foreground">guest@dotlet:~$</span>
                <span className="font-bold text-foreground">dot explore</span>
              </div>
              <div className="border-l border-border pl-7">
                <div className="max-w-4xl overflow-x-auto border border-border bg-muted/30 p-8">
                  <div className="mb-8 flex items-center gap-2">
                    <div className="size-3 bg-foreground/20" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Live Session: ghostty_sync
                    </span>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div className="flex gap-4">
                      <span className="opacity-50 text-muted-foreground">1</span>
                      <span className="text-foreground">$ dot push ~/.config/ghostty/config</span>
                    </div>
                    <div className="pl-8 text-sm leading-relaxed text-muted-foreground">
                      [dotlet] Identifying path: ~/.config/ghostty/config
                      <br />
                      [dotlet] Status: 200 OK | Synced to personal device
                    </div>
                    <div className="flex gap-4 pt-4">
                      <span className="opacity-50 text-muted-foreground">2</span>
                      <span className="text-foreground">$ dot pull ~/.config/ghostty/config</span>
                    </div>
                    <div className="pl-8 text-sm leading-relaxed text-muted-foreground">
                      [dotlet] Target detected: personal device
                      <br />
                      [dotlet] Restoring to: ~/.config/ghostty/config
                      <br />
                      [dotlet] <span className="font-bold text-foreground">SUCCESS:</span>{" "}
                      Environment synchronized.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* <section>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-muted-foreground">guest@dotlet:~$</span>
                <span className="font-bold text-foreground">dot trust</span>
              </div>
              <div className="border-l border-border pl-7">
                <div className="mb-6 text-xs uppercase tracking-widest text-muted-foreground">
                  TRUSTED_BY_ENGINEERS_AT:
                </div>
                <div className="flex flex-wrap gap-x-12 gap-y-6 opacity-80">
                  {["HYPER_LABS", "VECTOR_SYSTEMS", "CORE.OS", "NODE_STRUX"].map((name) => (
                    <span key={name} className="font-bold tracking-tighter text-foreground">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </section> */}

            <section className="pb-24 scroll-mt-8" id="dot_install">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-muted-foreground">guest@dotlet:~$</span>
                <span className="font-bold text-foreground">dot install</span>
              </div>
              <div className="border-l border-border pl-7">
                <div className="mb-10 mt-4">
                  <h2 className="mb-6 text-4xl font-bold text-foreground md:text-6xl">
                    GET DOTLET
                  </h2>
                  <p className="mb-8 text-muted-foreground">
                    Install the CLI, log in, and push your first config in minutes.
                  </p>
                  <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
                    <CopyInstallCommandButton command="pnpm install -g dotlet" variant="primary" />
                    {/* <CopyInstallCommandButton command={curlInstallLine} variant="outline" /> */}
                    <Link
                      className="border border-border px-8 py-4 text-center text-sm font-bold text-foreground transition-colors duration-300 hover:bg-muted"
                      href="/docs"
                    >
                      VIEW_DOCUMENTATION
                    </Link>
                  </div>
                </div>
              </div>
              <div className="flex items-center text-foreground">
                <span className="text-muted-foreground">guest@dotlet:~$</span>
                <span className="ml-3">_</span>
                <span
                  className="ml-1 inline-block h-5 w-2.5 animate-[landing-cursor-blink_1s_step-end_infinite] align-middle bg-foreground"
                  aria-hidden
                />
              </div>
            </section>
          </main>

          <LandingFooter />
        </div>
      </div>
    </div>
  );
}
