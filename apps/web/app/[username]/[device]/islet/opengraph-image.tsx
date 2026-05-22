import { OG_SIZE } from "@/lib/og/constants";
import { renderFallbackOgImage, renderIsletOgImage, renderPrivateOgImage } from "@/lib/og/images";
import { getIsletOgData } from "@/lib/og/queries";

export const alt = "dotlet islet";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; device: string }>;
  searchParams: Promise<{ n?: string; v?: string }>;
}) {
  const { username, device } = await params;
  const { n, v } = await searchParams;
  const isletPath = n?.trim();

  if (!isletPath) {
    return renderFallbackOgImage();
  }

  const data = await getIsletOgData(username, device, isletPath, v);

  if (!data) {
    return renderFallbackOgImage();
  }

  if (!data.isPublic) {
    return renderPrivateOgImage();
  }

  return renderIsletOgImage({
    username: data.username,
    deviceName: data.deviceName,
    path: data.path,
    revisionId: data.revisionId,
    starCount: data.starCount,
    updatedAt: data.updatedAt,
  });
}
