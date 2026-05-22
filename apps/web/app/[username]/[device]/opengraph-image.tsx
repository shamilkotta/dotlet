import { OG_SIZE } from "@/lib/og/constants";
import { renderDeviceOgImage, renderFallbackOgImage, renderPrivateOgImage } from "@/lib/og/images";
import { getDeviceOgData } from "@/lib/og/queries";

export const alt = "dotlet device";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string; device: string }>;
}) {
  const { username, device } = await params;
  const data = await getDeviceOgData(username, device);

  if (!data) {
    return renderFallbackOgImage();
  }

  if (!data.isPublic) {
    return renderPrivateOgImage();
  }

  return renderDeviceOgImage({
    username: data.username ?? username,
    deviceName: data.deviceName,
    isletCount: data.isletCount,
    revisionCount: data.revisionCount,
    lastSyncedAt: data.lastSyncedAt,
  });
}
