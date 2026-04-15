#!/bin/sh
# Installs the dotlet CLI from npm. Requires Node.js 20+ (includes npm).
# Usage:
#   curl -sL https://your-domain/install.sh | sh
# Optional:
#   DOTLET_VERSION=1.2.3  (default: latest)
#   NPM_PACKAGE=dotlet      (override if you fork the package name)

set -eu

VERSION="${DOTLET_VERSION:-latest}"
NPM_PKG="${NPM_PACKAGE:-dotlet}"

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' "dotlet requires Node.js 20 or later. Install from https://nodejs.org/ (npm is included)." >&2
  exit 1
fi

node -e '
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isFinite(major) || major < 20) {
    console.error("dotlet requires Node.js 20 or later.");
    process.exit(1);
  }
' || exit 1

if ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' "npm was not found. Reinstall Node.js from https://nodejs.org/ or install npm." >&2
  exit 1
fi

printf '%s\n' "Installing ${NPM_PKG}@${VERSION} globally..."
npm install -g "${NPM_PKG}@${VERSION}"

printf '%s\n' ""
printf '%s\n' "Done. Try: dotlet --help   (or: dot --help)"
