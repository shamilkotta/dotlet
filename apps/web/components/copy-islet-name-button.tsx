"use client";

import * as React from "react";
import { Check, Clipboard } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

export function CopyIsletNameButton({ value, ariaLabel }: { value: string; ariaLabel?: string }) {
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
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for older browsers / restrictive contexts.
        const textarea = document.createElement("textarea");
        textarea.value = value;
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
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Intentionally no-op: clipboard APIs can fail due to permissions.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="h-7 w-7 rounded-md border-0 bg-transparent p-0 text-[#57606a] hover:bg-muted/60 hover:text-[#1f2328] dark:text-[#919191] dark:hover:bg-muted/40 dark:hover:text-white"
      aria-label={ariaLabel ?? "Copy islet name"}
      onClick={onCopy}
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Clipboard className="size-4" aria-hidden />
      )}
    </Button>
  );
}
