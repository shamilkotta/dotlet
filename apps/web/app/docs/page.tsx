import { Suspense } from "react";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";

import { AuthHeader } from "@/components/auth-header";
import { LandingFooter } from "@/components/landing-footer";
import { DocsTableOfContents } from "@/components/docs-toc";
import { DocsCodeBlock } from "@/components/docs-code-block";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "docs | dotlet",
  description: "Complete documentation for the dotlet",
};

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[12px] text-foreground">
      {children}
    </code>
  );
}

function OptionRow({
  flag,
  alias,
  description,
  value,
}: {
  flag: string;
  alias?: string;
  description: string;
  value?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border/30 py-3.5 last:border-0 md:flex-row md:gap-8">
      <div className="shrink-0 md:w-60">
        <InlineCode>
          {alias ? `${alias}, ` : ""}
          {flag}
        </InlineCode>
        {value && <span className="ml-2 text-[11px] text-muted-foreground">{value}</span>}
      </div>
      <span className="text-sm leading-relaxed text-muted-foreground">{description}</span>
    </div>
  );
}

function SectionHeading({ id, number, title }: { id: string; number: string; title: string }) {
  return (
    <div id={id} className="mb-8 scroll-mt-24">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="text-[10px] tabular-nums tracking-widest text-muted-foreground/60">
          {number}.
        </span>
        <h2 className="text-xl font-bold uppercase tracking-wide text-foreground md:text-2xl">
          {title}
        </h2>
      </div>
      <div className="h-px bg-border" />
    </div>
  );
}

function SubHeading({ id, title }: { id: string; title: string }) {
  return (
    <h3
      id={id}
      className="mb-4 mt-12 scroll-mt-24 text-xs font-bold uppercase tracking-widest text-foreground"
    >
      {title}
    </h3>
  );
}

const TOC_ITEMS = [
  { id: "installation", label: "Installation" },
  { id: "overview", label: "Overview" },
  { id: "login", label: "login" },
  { id: "logout", label: "logout" },
  { id: "push", label: "push" },
  { id: "pull", label: "pull" },
  { id: "pull-targets", label: "Pull Targets" },
  { id: "list", label: "list" },
  { id: "device", label: "device" },
  { id: "device-list", label: "device list" },
  { id: "device-create", label: "device create" },
  { id: "device-use", label: "device use" },
  { id: "examples", label: "Workflows" },
] as const;

export default function DocsPage() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  return (
    <div>
      <div
        className={`${jetbrainsMono.className} min-h-screen bg-background p-4 text-foreground md:p-12`}
      >
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
          <header className="mb-16 flex items-center justify-between gap-4 border-b border-border pb-6">
            <div className="space-y-1">
              <Link
                href="/"
                className="text-sm font-bold uppercase tracking-widest transition-colors hover:text-muted-foreground"
              >
                DOTLET
              </Link>
              <div className="text-xs text-muted-foreground">
                v{process.env.NEXT_PUBLIC_DOTLET_CLI_VERSION} (ALPHA)
              </div>
            </div>
            <Suspense fallback={null}>
              <AuthHeader />
            </Suspense>
          </header>

          <div className="relative flex gap-16">
            <main className="min-w-0 flex-1 pb-24">
              <section className="mb-20">
                <h1 className="mb-4 text-4xl font-bold tracking-tighter text-foreground md:text-6xl">
                  CLI DOCUMENTATION
                </h1>
                <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  dotlet is a CLI tool for syncing and versioning your dotfiles. It transforms your
                  configuration files into modular units called{" "}
                  <em className="text-foreground">islets</em>, enabling seamless synchronization
                  across machines with versioned history.
                </p>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                  DOTLET CLI V{process.env.NEXT_PUBLIC_DOTLET_CLI_VERSION} (ALPHA)
                </div>
              </section>

              <div className="space-y-20">
                <section id="installation" className="scroll-mt-24">
                  <SectionHeading id="installation-h" number="01" title="Installation" />
                  <div className="space-y-8">
                    <div>
                      <span className="mb-3 block text-xs uppercase tracking-widest text-muted-foreground">
                        Requirements
                      </span>
                      <ul className="list-inside space-y-1.5 text-sm text-muted-foreground">
                        <li>
                          Node.js <strong className="text-foreground">20</strong> or later
                        </li>
                        {/* <li>pnpm (included with Node.js)</li> */}
                      </ul>
                    </div>

                    <div>
                      <span className="mb-3 block text-xs uppercase tracking-widest text-muted-foreground">
                        pnpm (recommended)
                      </span>
                      <DocsCodeBlock>{`$ pnpm install -g dotlet`}</DocsCodeBlock>
                    </div>

                    <div>
                      <span className="mb-3 block text-xs uppercase tracking-widest text-muted-foreground">
                        curl
                      </span>
                      <DocsCodeBlock>{`$ curl -sL ${APP_URL}/install.sh | sh`}</DocsCodeBlock>
                      {/* <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        The install script checks for Node.js 20+ and pnpm, then runs{" "}
                        <InlineCode>pnpm install -g dotlet</InlineCode>. You can override the
                        version with <InlineCode>DOTLET_VERSION=1.2.3</InlineCode>.
                      </p> */}
                    </div>

                    <div>
                      <span className="mb-3 block text-xs uppercase tracking-widest text-muted-foreground">
                        Verify
                      </span>
                      <DocsCodeBlock>{`$ dot --version
dotlet v${process.env.NEXT_PUBLIC_DOTLET_CLI_VERSION}`}</DocsCodeBlock>
                    </div>
                  </div>
                </section>

                <section id="overview" className="scroll-mt-24">
                  <SectionHeading id="overview-h" number="02" title="Overview" />
                  <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    The dotlet CLI lets you push configuration files from any machine to the cloud,
                    organize them by device, and pull them back on another machine. Every push
                    creates a new version, so you can always roll back or inspect history through
                    the web interface.
                  </p>
                  <p className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    The CLI is available as two equivalent binaries: <InlineCode>dotlet</InlineCode>{" "}
                    and <InlineCode>dot</InlineCode>. All examples in this documentation use{" "}
                    <InlineCode>dot</InlineCode> for brevity, but <InlineCode>dotlet</InlineCode>{" "}
                    works identically.
                  </p>
                  <DocsCodeBlock>{`$ dot <command> [options]

Commands:
  login              Sign in to your Dotlet account
  logout             Log out of your Dotlet account
  push <path>        Push a file or directory as an islet
  pull <islet>       Pull an islet
  list               List islets for a device
  device             Manage devices`}</DocsCodeBlock>
                </section>

                <section id="login" className="scroll-mt-24">
                  <SectionHeading id="login-h" number="03" title="Login" />
                  <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Authenticate the CLI with your dotlet account. This initiates an OAuth2 device
                    authorization flow -- a URL is opened in your browser where you approve the CLI.
                  </p>
                  <DocsCodeBlock>{`$ dot login`}</DocsCodeBlock>
                  <p className="mt-6 mb-6 text-sm leading-relaxed text-muted-foreground">
                    The command displays a verification URL and a one-time code. Once you approve in
                    the browser, the CLI stores the access token locally and you're ready to push
                    and pull.
                  </p>
                  <DocsCodeBlock label="output">{`dotlet login
┌─────────────────────────────────────────────┐
│ URL      https://dotlet.app/oauth/device    │
│ Code     ABCD-1234                          │
│ Expires  about 15m 0s                       │
└─────────────────────────────────────────────┘
✔ Browser opened (0.3s)
⠋ Waiting for authorization...
✔ Login successful. CLI is now authorized.`}</DocsCodeBlock>
                </section>

                <section id="logout" className="scroll-mt-24">
                  <SectionHeading id="logout-h" number="04" title="Logout" />
                  <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Terminate the current session and clear local authentication tokens. This
                    removes the stored credentials from your machine.
                  </p>
                  <DocsCodeBlock>{`$ dot logout`}</DocsCodeBlock>
                  <div className="mt-4">
                    <DocsCodeBlock label="output">{`✔ Logged out successfully.`}</DocsCodeBlock>
                  </div>
                </section>

                <section id="push" className="scroll-mt-24">
                  <SectionHeading id="push-h" number="05" title="Push" />
                  <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Push a file or directory as an islet to your device. Each push creates a new
                    version. If the content hasn't changed, the file is marked as unchanged.
                  </p>
                  <DocsCodeBlock>{`$ dot push <path> [options]`}</DocsCodeBlock>

                  <SubHeading id="push-args" title="Arguments" />
                  <OptionRow
                    flag="<path>"
                    description="File or directory to push. Can be a relative or absolute path."
                  />

                  <SubHeading id="push-options" title="Options" />
                  <div>
                    <OptionRow
                      flag="--device"
                      alias="-d"
                      value="<name>"
                      description="Device to target. Overrides the configured default device."
                    />
                    <OptionRow
                      flag="--name"
                      alias="-n"
                      value="<name>"
                      description="Custom islet name. This name will be used as path for the islet instead of the current path."
                    />
                    <OptionRow
                      flag="--absolute"
                      alias="-a"
                      description="Store file paths as absolute instead of relative. Useful when you want to restore files to their exact original location."
                    />
                    <OptionRow
                      flag="--message"
                      alias="-m"
                      value="<text>"
                      description="Message describing this islet version, similar to a commit message."
                    />
                    <OptionRow
                      flag="--visibility"
                      alias="-v"
                      value="public | private"
                      description="Whether the islet is visible to others. Defaults to the device's visibility."
                    />
                  </div>

                  <SubHeading id="push-examples" title="Examples" />
                  <DocsCodeBlock>{`# Push a single config file
$ dot push ~/.config/ghostty/config

# Push an entire directory
$ dot push ~/.config/nvim

# Push to a specific device with a message
$ dot push ~/.zshrc -d laptop -m "added aliases"

# Push with absolute path storage
$ dot push ./.vscode/settings.json --absolute

# Push with a custom name
$ dot push ~/.config/ghostty/config -n ./ghostty/config

# Push as private
$ dot push ~/.ssh/config -v private`}</DocsCodeBlock>
                </section>

                <section id="pull" className="scroll-mt-24">
                  <SectionHeading id="pull-h" number="06" title="Pull" />
                  <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Pull an islet and write the files to disk. By default, files are restored to
                    their original paths. Existing files are skipped unless{" "}
                    <InlineCode>--force</InlineCode> is used.
                  </p>
                  <DocsCodeBlock>{`$ dot pull <islet> [options]`}</DocsCodeBlock>

                  <SubHeading id="pull-args" title="Arguments" />
                  <OptionRow
                    flag="<islet>"
                    description="Name of the islet to pull. Accepts short form, full form, or a web URL. See Pull Targets below."
                  />

                  <SubHeading id="pull-options" title="Options" />
                  <div>
                    <OptionRow
                      flag="--force"
                      alias="-f"
                      description="Replace files that already exist locally. Without this flag, existing files are skipped with a warning."
                    />
                    <OptionRow
                      flag="--path"
                      alias="-p"
                      value="<path>"
                      description="Path to write pulled files into. Overrides the original file paths."
                    />
                    <OptionRow
                      flag="--device"
                      alias="-d"
                      value="<device | username/device>"
                      description="Device to pull from. your device name, or username/device for a specific account. Only valid with short-form islet names. Cannot be combined with full-form targets or URLs."
                    />
                    <OptionRow
                      flag="--version"
                      alias="-v"
                      value="<version>"
                      description='Version of the islet to pull. Can also be specified inline with "?v=" in the target string.'
                    />
                  </div>

                  <SubHeading id="pull-targets" title="Pull Targets" />
                  <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                    The <InlineCode>{"<islet>"}</InlineCode> argument accepts three formats:
                  </p>
                  <div className="space-y-8">
                    <div>
                      <span className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-foreground">
                        Short form
                      </span>
                      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                        Just the islet name. Use your default device or <InlineCode>-d</InlineCode>{" "}
                        / <InlineCode>--device</InlineCode> with a device name (your account) or{" "}
                        <InlineCode>username/device</InlineCode> to target a specific account
                        without using the full <InlineCode>username/device:islet</InlineCode> form.
                      </p>
                      <DocsCodeBlock>{`$ dot pull ~/.zshrc
$ dot pull ./nvim/init.lua
$ dot pull ~/.zshrc?v=rev2
$ dot pull ~/.zshrc -d laptop
$ dot pull ~/.zshrc -d alice/laptop`}</DocsCodeBlock>
                    </div>

                    <div>
                      <span className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-foreground">
                        Full form
                      </span>
                      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                        Includes the username and device. No <InlineCode>--device</InlineCode> flag
                        needed.
                      </p>
                      <DocsCodeBlock>{`$ dot pull alice/laptop:~/.zshrc
$ dot pull alice/laptop:./nvim/init.lua?v=rev1`}</DocsCodeBlock>
                    </div>

                    <div>
                      <span className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-foreground">
                        Web URL
                      </span>
                      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                        A full URL from the dotlet web interface. Cannot be combined with{" "}
                        <InlineCode>--device</InlineCode>.
                      </p>
                      <DocsCodeBlock>{`$ dot pull "${APP_URL}/alice/laptop/islet?n=~/.zshrc"
$ dot pull "${APP_URL}/alice/laptop/islet?n=./nvim/init.lua&v=rev1"`}</DocsCodeBlock>
                    </div>
                  </div>

                  <SubHeading id="pull-examples" title="Examples" />
                  <DocsCodeBlock>{`# Pull and restore to original path
$ dot pull ~/.zshrc

# Pull and overwrite existing files
$ dot pull ~/.zshrc --force

# Pull to a custom directory
$ dot pull ./nvim/init.lua -p ~/backup/init.lua

# Pull a specific version
$ dot pull ~/.zshrc -v rev3

# Short form with explicit username/device (-d)
$ dot pull ~/.zshrc -d alice/laptop

# Pull from another user's public islet (full form)
$ dot pull alice/laptop:~/.zshrc`}</DocsCodeBlock>
                </section>

                <section id="list" className="scroll-mt-24">
                  <SectionHeading id="list-h" number="07" title="List" />
                  <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    List all islets for the selected or specified device.{" "}
                    <InlineCode>--device</InlineCode> accepts a device name on your account or{" "}
                    <InlineCode>username/device</InlineCode> to list another user&apos;s device.
                    Running <InlineCode>dot</InlineCode> with no subcommand is equivalent to{" "}
                    <InlineCode>dot list</InlineCode>.
                  </p>
                  <DocsCodeBlock>{`$ dot list [options]
$ dot              # same as dot list`}</DocsCodeBlock>

                  <SubHeading id="list-options" title="Options" />
                  <OptionRow
                    flag="--device"
                    alias="-d"
                    value="<device | username/device>"
                    description="Device to list islets for: your device name, or username/device for a specific account. Uses the configured default device when omitted."
                  />

                  <SubHeading id="list-example-output" title="Examples" />
                  <DocsCodeBlock>{`$ dot list -d personal
$ dot list -d alice/laptop`}</DocsCodeBlock>
                  <div className="mt-4 space-y-4">
                    <DocsCodeBlock label="output (your device)">{`✔ Found 3 islets
personal

  ‣ .zshrc
  ‣ nvim/init.lua
  ‣ .config/ghostty/config`}</DocsCodeBlock>
                    <DocsCodeBlock label="output (username/device)">{`✔ Found 2 islets
alice/laptop

  ‣ .zshrc
  ‣ nvim/init.lua`}</DocsCodeBlock>
                  </div>
                </section>

                <section id="device" className="scroll-mt-24">
                  <SectionHeading id="device-h" number="08" title="Device" />
                  <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Manage devices: list, create, or choose a default. Running{" "}
                    <InlineCode>dot device</InlineCode> with no subcommand is equivalent to{" "}
                    <InlineCode>dot device list</InlineCode>.
                  </p>
                  <DocsCodeBlock>{`$ dot device [subcommand] [options]`}</DocsCodeBlock>

                  <SubHeading id="device-list" title="device list" />
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    List all devices. The current default device is highlighted.
                  </p>
                  <DocsCodeBlock>{`$ dot device list [options]
$ dot device           # same as dot device list`}</DocsCodeBlock>
                  <div className="mt-4">
                    <OptionRow
                      flag="--username"
                      alias="-u"
                      value="<name>"
                      description="Username of the account to list devices for. Defaults to the signed-in user."
                    />
                  </div>
                  <div className="mt-4">
                    <DocsCodeBlock label="output">{`✔ Fetched 2 devices

  ◉  personal  public
  ◯  work      private`}</DocsCodeBlock>
                  </div>

                  <SubHeading id="device-create" title="device create" />
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Register a new device.
                  </p>
                  <DocsCodeBlock>{`$ dot device create <device name> [options]`}</DocsCodeBlock>
                  <div className="mt-4">
                    <OptionRow flag="<device name>" description="Name of the new device." />
                    <OptionRow
                      flag="--visibility"
                      alias="-v"
                      value="public | private"
                      description="Whether the device is visible to others. Defaults to public."
                    />
                  </div>

                  <SubHeading id="device-create-examples" title="Examples" />
                  <DocsCodeBlock>{`# Create a public device
$ dot device create laptop

# Create a private device
$ dot device create work -v private`}</DocsCodeBlock>

                  <SubHeading id="device-use" title="device use" />
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Set a device as the default. Subsequent commands that accept{" "}
                    <InlineCode>--device</InlineCode> will use this device when the flag is omitted.
                  </p>
                  <DocsCodeBlock>{`$ dot device use <device name>`}</DocsCodeBlock>
                  <div className="mt-4">
                    <OptionRow
                      flag="<device name>"
                      description="Name of the device to set as default."
                    />
                  </div>

                  <SubHeading id="device-use-example" title="Example" />
                  <DocsCodeBlock>{`$ dot device use laptop`}</DocsCodeBlock>
                  <div className="mt-4">
                    <DocsCodeBlock label="output">{`✔ Default device set to laptop`}</DocsCodeBlock>
                  </div>
                </section>

                <section id="examples" className="scroll-mt-24">
                  <SectionHeading id="examples-h" number="09" title="Workflows" />
                  <p className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Common end-to-end scenarios combining multiple commands.
                  </p>
                  <div className="space-y-10">
                    <div>
                      <span className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-foreground">
                        First-time setup
                      </span>
                      <DocsCodeBlock>{`# Install
$ pnpm install -g dotlet

# Authenticate
$ dot login

# Create a device for this machine
$ dot device create macbook

# Set it as default
$ dot device use macbook`}</DocsCodeBlock>
                    </div>

                    <div>
                      <span className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-foreground">
                        Push your configs
                      </span>
                      <DocsCodeBlock>{`# Push individual files
$ dot push ~/.zshrc
$ dot push ~/.gitconfig

# Push a config directory
$ dot push ~/.config/nvim

# Push with a version message
$ dot push ~/.config/ghostty/config -m "updated font size"`}</DocsCodeBlock>
                    </div>

                    <div>
                      <span className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-foreground">
                        Restore on a new machine
                      </span>
                      <DocsCodeBlock>{`# Install and login on the new machine
$ pnpm install -g dotlet
$ dot login

# Set the device
$ dot device use macbook

# List what's available
$ dot list

# Pull everything back
$ dot pull ~/.zshrc
$ dot pull ~/.gitconfig
$ dot pull ~/.config/nvim --force`}</DocsCodeBlock>
                    </div>

                    <div>
                      <span className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-foreground">
                        Pull from another user
                      </span>
                      <DocsCodeBlock>{`# Pull a public islet using the full form
$ dot pull alice/laptop:~/.zshrc

# Pull and save to a specific path
$ dot pull alice/laptop:nvim/init.lua -p ~/nvim/init.lua`}</DocsCodeBlock>
                    </div>
                  </div>
                </section>
              </div>
            </main>

            <DocsTableOfContents items={TOC_ITEMS} />
          </div>

          <LandingFooter />
        </div>
      </div>
    </div>
  );
}
