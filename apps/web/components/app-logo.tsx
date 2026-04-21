import Image from "next/image";

import { cn } from "@workspace/ui/lib/utils";

type AppLogoProps = {
  className?: string;
  imgClassName?: string;
  alt?: string;
};

export function AppLogo({ className, imgClassName, alt = "dotlet logo" }: AppLogoProps) {
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      {/* <Image
        src="/logo-light.svg"
        alt={alt}
        width={104}
        height={104}
        className={cn("dark:hidden object-contain", imgClassName)}
        unoptimized
      />
      <Image
        src="/logo-dark.svg"
        alt={alt}
        width={104}
        height={104}
        className={cn("hidden dark:block object-contain", imgClassName)}
        unoptimized
      /> */}
      <h1 className="text-2xl font-bold">dotlet</h1>
    </span>
  );
}
