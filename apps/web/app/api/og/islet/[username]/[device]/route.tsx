import { type NextRequest } from "next/server";

import { OG_SIZE } from "@/lib/og/constants";
import { renderFallbackOgImage, renderIsletOgImage, renderPrivateOgImage } from "@/lib/og/images";
import { getIsletOgData } from "@/lib/og/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; device: string }> },
) {
  try {
    const { username, device } = await params;
    const isletPath = request.nextUrl.searchParams.get("n")?.trim();
    const version = request.nextUrl.searchParams.get("v")?.trim() || undefined;

    if (!isletPath) {
      return renderFallbackOgImage();
    }

    const data = await getIsletOgData(username, device, isletPath, version);

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
  } catch {
    return renderFallbackOgImage();
  }
}

export const size = OG_SIZE;
export const contentType = "image/png";
