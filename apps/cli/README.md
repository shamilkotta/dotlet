# dotlet CLI

Make your environment portable. Sync and version your dotfiles across devices.

Full documentation: [https://dotlet.vercel.app/docs](https://dotlet.vercel.app/docs)

## Installation

Requires Node.js 20 or later.

```bash
pnpm add -g dotlet
```

This installs two equivalent binaries: `dotlet` and `dot`.

## Quick Start

```bash
# Sign in
dot login

# Register this machine and make it the default device
dot device create my-laptop
dot device use my-laptop

# Push a file or directory as an islet
dot push ~/.zshrc -m "initial config"

# List islets on the current device
dot list

# Pull an islet on another machine
dot pull <islet>
```

## Commands

```text
dot <command> [options]

Commands:
  login                      Sign in to your Dotlet account
  logout                     Log out of your Dotlet account
  push <path>                Push a file or directory as an islet
  pull <islet>               Pull an islet
  list                       List islets for the selected or specified device
  update <islet>             Update islet name and visibility
  delete <islet>             Delete an islet or folder
  device                     Manage devices
    device list              List all the devices
    device create <name>     Register a new device
    device use <name>        Set current device
    device update            Update device name and visibility
    device delete <name>     Delete a device
```

Running `dot` with no command lists islets for the current device.

### Common options

| Option                               | Used by                                         | Description                                            |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------------------------ |
| `--device`                           | push, pull, list, update, delete, device update | Target device (overrides the configured default)       |
| `-n`, `--name`                       | push                                            | Custom islet name (derived from the path when omitted) |
| `-m`, `--message`                    | push                                            | Message describing this islet version                  |
| `-v`, `--visibility public\|private` | push, device create                             | Whether others can see the islet or device             |
| `--absolute`                         | push                                            | Store file paths as absolute instead of relative       |
| `--version`                          | pull                                            | Pull a specific islet version                          |
| `--path`                             | pull                                            | Path to write pulled files into                        |
| `--force`                            | pull                                            | Replace files that already exist locally               |
| `--username`                         | device, device list                             | List another user's devices                            |
| `--yes`                              | delete, device delete                           | Skip the confirmation prompt                           |

Run `dot <command> --help` for details on any command.

## Help

- Web docs: [https://dotlet.vercel.app/docs](https://dotlet.vercel.app/docs)
- App: [https://dotlet.vercel.app](https://dotlet.vercel.app)
- Issues: [https://github.com/shamilkotta/dotlet/issues](https://github.com/shamilkotta/dotlet/issues)
