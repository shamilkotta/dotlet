import { ImageResponse } from "next/og";

import { DEFAULT_DESCRIPTION } from "@/lib/metadata";
import { getLogoDataUri } from "@/lib/og/assets";
import { OG_COLORS, OG_GRID, OG_SIZE, OG_TYPE } from "@/lib/og/constants";
import { formatOgTimeAgo } from "@/lib/og/format";
import { fontOptions, loadProfileFonts } from "@/lib/og/fonts";

function OgLogo({ size = 32, src }: { size?: number; src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" height={size} src={src} width={size} />
  );
}

function gridAxisPositions(size: number, step: number): number[] {
  const positions: number[] = [];
  for (let position = 0; position <= size; position += step) {
    positions.push(position);
  }
  return positions;
}

function GridBackground() {
  const verticals = gridAxisPositions(OG_SIZE.width, OG_GRID.step);
  const horizontals = gridAxisPositions(OG_SIZE.height, OG_GRID.step);

  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        top: 0,
        left: 0,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
      }}
    >
      {verticals.map((x) => (
        <div
          key={`v-${x}`}
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: x,
            width: 1,
            height: OG_SIZE.height,
            backgroundColor: OG_GRID.stroke,
          }}
        />
      ))}
      {horizontals.map((y) => (
        <div
          key={`h-${y}`}
          style={{
            display: "flex",
            position: "absolute",
            top: y,
            left: 0,
            width: OG_SIZE.width,
            height: 1,
            backgroundColor: OG_GRID.stroke,
          }}
        />
      ))}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.04), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(255,255,255,0.02), transparent 50%)",
        }}
      />
    </div>
  );
}

function BrandHeader({ logoSrc, splash = false }: { logoSrc: string; splash?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: splash ? 18 : 14,
      }}
    >
      <OgLogo size={splash ? 48 : 32} src={logoSrc} />
      <span style={{ display: "flex", ...(splash ? OG_TYPE.splashBrand : OG_TYPE.brand) }}>
        dotlet
      </span>
    </div>
  );
}

function ContentSlide({ children, logoSrc }: { children: React.ReactNode; logoSrc: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: OG_COLORS.background,
        color: OG_COLORS.foreground,
        position: "relative",
      }}
    >
      <GridBackground />
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 64,
          left: 80,
        }}
      >
        <BrandHeader logoSrc={logoSrc} />
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          padding: "112px 80px 64px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", ...OG_TYPE.eyebrow, marginBottom: 12 }}>{children}</div>;
}

function Title({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        ...OG_TYPE.title,
        marginBottom: last ? 32 : 12,
      }}
    >
      {children}
    </div>
  );
}

function Tagline({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        ...(mono ? OG_TYPE.taglineMono : OG_TYPE.tagline),
        marginBottom: 32,
      }}
    >
      {children}
    </div>
  );
}

function MetaRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

function MetaIcon({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        flexShrink: 0,
        color: OG_COLORS.subtext,
      }}
    >
      {children}
    </div>
  );
}

function MetaItemShell({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, ...OG_TYPE.meta }}>
      <MetaIcon>{icon}</MetaIcon>
      <div style={{ display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
}

function MetaCountLabel({ count, label }: { count: number | string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "flex", ...OG_TYPE.metaStrong }}>{count}</span>
      <span style={{ display: "flex" }}>{label}</span>
    </div>
  );
}

function MetaPhraseLabel({ prefix, value }: { prefix: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "flex" }}>{prefix}</span>
      <span style={{ display: "flex", ...OG_TYPE.metaStrong }}>{value}</span>
    </div>
  );
}

function MetaMonoValue({ value }: { value: string }) {
  return (
    <span
      style={{
        display: "flex",
        fontFamily: "JetBrains Mono",
        ...OG_TYPE.metaStrong,
      }}
    >
      {value}
    </span>
  );
}

function Avatar({ image, initial }: { image: string | null; initial: string }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        height={52}
        src={image}
        style={{
          width: 52,
          height: 52,
          borderRadius: 9999,
          border: `1px solid ${OG_COLORS.border}`,
          objectFit: "cover",
        }}
        width={52}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 52,
        height: 52,
        borderRadius: 9999,
        border: `1px solid ${OG_COLORS.border}`,
        backgroundColor: OG_COLORS.avatarBg,
        fontSize: 20,
        fontWeight: 600,
        color: OG_COLORS.avatarText,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function IconDevice() {
  return (
    <svg
      fill="none"
      height="22"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="22"
    >
      <rect height="14" rx="2" width="18" x="3" y="4" />
      <path d="M7 20h10" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg
      fill="none"
      height="22"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="22"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg
      fill="none"
      height="22"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="22"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg
      fill="none"
      height="22"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="22"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCommit() {
  return (
    <svg
      fill="none"
      height="22"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="22"
    >
      <circle cx="12" cy="12" r="3" />
      <line x1="3" x2="9" y1="12" y2="12" />
      <line x1="15" x2="21" y1="12" y2="12" />
    </svg>
  );
}

async function renderOgImage(element: React.ReactElement) {
  const fonts = await loadProfileFonts();
  return new ImageResponse(element, {
    ...OG_SIZE,
    fonts: fontOptions(fonts),
  });
}

export async function renderHomeOgImage() {
  const [logoSrc, fonts] = await Promise.all([getLogoDataUri(), loadProfileFonts()]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: OG_COLORS.background,
        color: OG_COLORS.foreground,
        position: "relative",
      }}
    >
      <GridBackground />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 28,
          zIndex: 1,
        }}
      >
        <BrandHeader logoSrc={logoSrc} splash />
        <div
          style={{
            display: "flex",
            ...OG_TYPE.splashTagline,
            maxWidth: 780,
            textAlign: "center",
          }}
        >
          {DEFAULT_DESCRIPTION}
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: fontOptions(fonts),
    },
  );
}

export async function renderDocsOgImage() {
  const logoSrc = await getLogoDataUri();

  return renderOgImage(
    <ContentSlide logoSrc={logoSrc}>
      <Eyebrow>docs</Eyebrow>
      <Title>Documentation</Title>
      <Tagline>
        Install, login, push, pull, and manage devices — the complete dotlet reference.
      </Tagline>
    </ContentSlide>,
  );
}

export async function renderPrivateOgImage() {
  const logoSrc = await getLogoDataUri();

  return renderOgImage(
    <ContentSlide logoSrc={logoSrc}>
      <Title last>Private content</Title>
      <Tagline>This resource is not publicly visible.</Tagline>
    </ContentSlide>,
  );
}

export async function renderProfileOgImage(input: {
  username: string;
  name: string | null;
  image: string | null;
  deviceCount: number;
  isletCount: number;
  starCount: number;
}) {
  const logoSrc = await getLogoDataUri();
  const initial = (input.name ?? input.username).slice(0, 1).toUpperCase();

  return renderOgImage(
    <ContentSlide logoSrc={logoSrc}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 12 }}>
        <Avatar image={input.image} initial={initial} />
        <Title>{input.username}</Title>
      </div>
      <Tagline>Devices and public islets on dotlet</Tagline>
      <MetaRow>
        <MetaItemShell icon={<IconDevice />}>
          <MetaCountLabel count={input.deviceCount} label="devices" />
        </MetaItemShell>
        <MetaItemShell icon={<IconFile />}>
          <MetaCountLabel count={input.isletCount} label="islets" />
        </MetaItemShell>
        <MetaItemShell icon={<IconStar />}>
          <MetaCountLabel count={input.starCount} label="stars" />
        </MetaItemShell>
      </MetaRow>
    </ContentSlide>,
  );
}

export async function renderDeviceOgImage(input: {
  username: string;
  deviceName: string;
  isletCount: number;
  revisionCount: number;
  lastSyncedAt: Date | null;
}) {
  const logoSrc = await getLogoDataUri();
  const syncedLabel = formatOgTimeAgo(input.lastSyncedAt);

  return renderOgImage(
    <ContentSlide logoSrc={logoSrc}>
      <Eyebrow>{input.username}</Eyebrow>
      <Title last>{input.deviceName}</Title>
      <MetaRow>
        <MetaItemShell icon={<IconFile />}>
          <MetaCountLabel count={input.isletCount} label="islets" />
        </MetaItemShell>
        <MetaItemShell icon={<IconClock />}>
          <MetaCountLabel count={input.revisionCount} label="commits" />
        </MetaItemShell>
        <MetaItemShell icon={<IconClock />}>
          <MetaPhraseLabel prefix="synced" value={syncedLabel} />
        </MetaItemShell>
      </MetaRow>
    </ContentSlide>,
  );
}

export async function renderIsletOgImage(input: {
  username: string;
  deviceName: string;
  path: string;
  revisionId: string;
  starCount: number;
  updatedAt: Date;
}) {
  const logoSrc = await getLogoDataUri();
  const fileName = input.path.split("/").pop() || input.path;
  const shortRevision = input.revisionId.slice(0, 7);
  const updatedLabel = formatOgTimeAgo(input.updatedAt);

  return renderOgImage(
    <ContentSlide logoSrc={logoSrc}>
      <Eyebrow>
        {input.username} / {input.deviceName}
      </Eyebrow>
      <Title>{fileName}</Title>
      <Tagline mono>{input.path}</Tagline>
      <MetaRow>
        <MetaItemShell icon={<IconCommit />}>
          <MetaMonoValue value={shortRevision} />
        </MetaItemShell>
        <MetaItemShell icon={<IconClock />}>
          <MetaPhraseLabel prefix="updated" value={updatedLabel} />
        </MetaItemShell>
        <MetaItemShell icon={<IconStar />}>
          <MetaCountLabel count={input.starCount} label="stars" />
        </MetaItemShell>
      </MetaRow>
    </ContentSlide>,
  );
}

export async function renderFallbackOgImage() {
  return renderHomeOgImage();
}
