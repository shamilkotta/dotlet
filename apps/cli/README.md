# dotlet CLI

Make your environment portable.

Full documentation: [https://dotlet.app/docs](https://dotlet.app/docs)

## Installation

```bash
pnpm add -g dotlet
```

## CLI Binaries

Both binaries are equivalent:

- `dotlet`
- `dot`

## Quick Start

1. Authenticate:

```bash
dot login
```

2. Push a config file or directory:

```bash
dot push ~/.zshrc
```

3. List synced islets:

```bash
dot list
```

4. Pull an islet on another machine:

```bash
dot pull <islet>
```

## Commands

```text
dot <command> [options]

Commands:
  login              Sign in to your Dotlet account
  logout             Log out of your Dotlet account
  push <path>        Push a file or directory as an islet
  pull <islet>       Pull an islet
  list               List islets for a device
  device             Manage devices
```

## Help

- Web docs: [https://dotlet.app/docs](https://dotlet.app/docs)
- App: [https://dotlet.app](https://dotlet.app)
