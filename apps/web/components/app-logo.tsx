import Image from "next/image";

import { cn } from "@workspace/ui/lib/utils";

type AppLogoProps = {
  className?: string;
  imgClassName?: string;
  alt?: string;
};

export function AppLogo({ className, imgClassName, alt = "dotlet" }: AppLogoProps) {
  return (
    <span className={cn("inline-flex items-center justify-center text-foreground", className)}>
      <Image
        src="/logo.svg"
        alt={alt}
        width={1024}
        height={1024}
        className={cn("object-contain dark:invert", imgClassName)}
        unoptimized
      />
    </span>
  );
}
