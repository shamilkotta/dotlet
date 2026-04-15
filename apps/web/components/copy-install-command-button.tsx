"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

export function CopyInstallCommandButton({
  command,
  variant,
}: {
  command: string;
  variant: "primary" | "outline";
}) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function onCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = command;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard writes can fail due to browser permissions.
    }
  }

  return (
    <Button
      type="button"
      variant="default"
      className={cn(
        "cursor-pointer h-auto min-h-14 w-full flex-wrap gap-2 rounded-none border px-8 py-4 text-sm font-bold shadow-none md:w-auto",
        variant === "primary" &&
          "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background hover:opacity-90",
        variant === "outline" && "border-border bg-transparent text-foreground hover:bg-muted",
      )}
      onClick={onCopy}
      aria-label={`Copy command: ${command}`}
    >
      <span className="break-all text-left md:text-center">{command}</span>
      {copied ? (
        <Check
          className={cn(
            "size-4 shrink-0",
            variant === "primary" ? "text-background" : "text-foreground",
          )}
          aria-hidden
        />
      ) : (
        <Copy
          className={cn(
            "size-4 shrink-0",
            variant === "primary" ? "text-background" : "text-foreground",
          )}
          aria-hidden
        />
      )}
    </Button>
  );
}
