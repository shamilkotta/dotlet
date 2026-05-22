import { OG_SIZE } from "@/lib/og/constants";
import { renderDocsOgImage } from "@/lib/og/images";

export const alt = "dotlet CLI documentation";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderDocsOgImage();
}
