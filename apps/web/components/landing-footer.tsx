import { cn } from "@workspace/ui/lib/utils";

const LINKS = ["GITHUB", "CHANGELOG", "PRIVACY", "TERMS"] as const;

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
        {LINKS.map((label) => (
          <a
            key={label}
            className="text-muted-foreground underline underline-offset-4 decoration-border transition-colors hover:text-foreground"
            href="#"
          >
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
}
