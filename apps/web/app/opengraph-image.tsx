import { ImageResponse } from "next/og";

import { OG_SIZE } from "@/lib/og/constants";
import { renderFallbackOgImage, renderHomeOgImage } from "@/lib/og/images";

export const alt = "dotlet — versioned dotfile sync";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  try {
    return await renderHomeOgImage();
  } catch {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#ededed",
          fontSize: 48,
          fontWeight: 700,
        }}
      >
        dotlet
      </div>,
      OG_SIZE,
    );
  }
}

export { renderFallbackOgImage };
