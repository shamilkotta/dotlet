const GOOGLE_FONT_USER_AGENT = "Mozilla/4.0";

async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`,
    { headers: { "User-Agent": GOOGLE_FONT_USER_AGENT } },
  ).then((response) => response.text());

  const match =
    css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/) ??
    css.match(/src: url\((.+?)\) format\('woff'\)/);

  if (!match?.[1]) {
    throw new Error(`Failed to load font: ${family} ${weight}`);
  }

  return fetch(match[1]).then((response) => response.arrayBuffer());
}

export type OgFontSet = {
  sans: ArrayBuffer;
  sansSemi: ArrayBuffer;
  sansBold: ArrayBuffer;
  mono: ArrayBuffer;
  monoBold: ArrayBuffer;
};

export async function loadProfileFonts(): Promise<OgFontSet> {
  const [sans, sansSemi, sansBold, mono, monoBold] = await Promise.all([
    loadGoogleFont("Inter", 400),
    loadGoogleFont("Inter", 600),
    loadGoogleFont("Inter", 700),
    loadGoogleFont("JetBrains+Mono", 400),
    loadGoogleFont("JetBrains+Mono", 700),
  ]);

  return { sans, sansSemi, sansBold, mono, monoBold };
}

export function fontOptions(fonts: OgFontSet) {
  return [
    { name: "Inter", data: fonts.sans, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: fonts.sansSemi, weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: fonts.sansBold, weight: 700 as const, style: "normal" as const },
    { name: "JetBrains Mono", data: fonts.mono, weight: 400 as const, style: "normal" as const },
    {
      name: "JetBrains Mono",
      data: fonts.monoBold,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}
