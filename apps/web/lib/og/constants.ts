export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_GRID = {
  step: 48,
  stroke: "rgba(255, 255, 255, 0.035)",
} as const;

export const OG_COLORS = {
  background: "#000000",
  foreground: "#ffffff",
  subtext: "#9ca3af",
  border: "#2a2a2a",
  avatarBg: "#374151",
  avatarText: "#d1d5db",
} as const;

export const OG_TYPE = {
  eyebrow: {
    fontFamily: "Inter",
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1.4,
    color: OG_COLORS.subtext,
  },
  title: {
    fontFamily: "JetBrains Mono",
    fontSize: 64,
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    color: OG_COLORS.foreground,
  },
  tagline: {
    fontFamily: "Inter",
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1.4,
    color: OG_COLORS.subtext,
  },
  taglineMono: {
    fontFamily: "JetBrains Mono",
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1.4,
    color: OG_COLORS.subtext,
  },
  meta: {
    fontFamily: "Inter",
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1.4,
    color: OG_COLORS.subtext,
  },
  metaStrong: {
    fontWeight: 600,
    color: OG_COLORS.foreground,
  },
  brand: {
    fontFamily: "Inter",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color: OG_COLORS.foreground,
  },
  splashBrand: {
    fontFamily: "Inter",
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color: OG_COLORS.foreground,
  },
  splashTagline: {
    fontFamily: "Inter",
    fontSize: 26,
    fontWeight: 400,
    lineHeight: 1.35,
    color: OG_COLORS.subtext,
  },
} as const;
