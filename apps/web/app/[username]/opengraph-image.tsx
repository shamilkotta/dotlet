import { OG_SIZE } from "@/lib/og/constants";
import { renderFallbackOgImage, renderProfileOgImage } from "@/lib/og/images";
import { getProfileOgData } from "@/lib/og/queries";

export const alt = "dotlet profile";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfileOgData(username);

  if (!profile) {
    return renderFallbackOgImage();
  }

  return renderProfileOgImage({
    username: profile.username ?? username,
    name: profile.name,
    image: profile.image,
    deviceCount: profile.deviceCount,
    isletCount: profile.isletCount,
    starCount: profile.starCount,
  });
}
