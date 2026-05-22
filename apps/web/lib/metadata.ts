import type { Metadata } from "next";

export const SITE_NAME = "dotlet";

export const DEFAULT_DESCRIPTION =
  "Keep your dotfiles consistent everywhere with versioned backups";

export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw);
}

type PageMetadataInput = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
};

export function createPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const pageUrl = path ? new URL(path, siteUrl) : siteUrl;

  return {
    title,
    description,
    ...(noIndex
      ? { robots: { index: false, follow: false } }
      : { robots: { index: true, follow: true } }),
    alternates: {
      canonical: pageUrl.toString(),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title,
      description,
      url: pageUrl.toString(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function buildIsletPagePath(
  username: string,
  device: string,
  isletPath: string,
  revisionId?: string,
): string {
  const searchParams = new URLSearchParams({ n: isletPath });
  if (revisionId?.trim()) {
    searchParams.set("v", revisionId.trim());
  }
  return `/${username}/${device}/islet?${searchParams.toString()}`;
}

export const rootMetadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
};
