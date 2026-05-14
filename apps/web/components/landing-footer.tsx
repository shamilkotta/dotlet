import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";

const LINKS = [
  {
    label: "GITHUB",
    href: "https://github.com/shamilkotta/dotlet",
    target: "_blank",
  },
  {
    label: "CHANGELOG",
    href: "https://github.com/shamilkotta/dotlet/blob/main/CHANGELOG.md",
  },
  {
    label: "PRIVACY",
    href: "#",
  },
  {
    label: "TERMS",
    href: "#",
  },
];

export function LandingFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mt-auto flex w-full flex-col items-center justify-between gap-6 border-t border-border pt-8 pb-12 md:flex-row",
        className,
      )}
    >
      <div className="space-y-1 text-[10px] tracking-widest text-muted-foreground">
        <div>2026 DOTLET_CLI_DISTRO</div>
        <div>LICENSED_UNDER_MIT</div>
      </div>
      <div className="flex gap-8 text-[10px] uppercase tracking-widest">
        {LINKS.map(({ label, href, target }) => (
          <Link
            key={label}
            className="text-muted-foreground underline underline-offset-4 decoration-border transition-colors hover:text-foreground"
            href={href}
            rel="noopener noreferrer"
            prefetch={false}
            target={target}
          >
            {label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
