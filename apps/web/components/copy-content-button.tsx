"use client";

import * as React from "react";
import { Check, Clipboard } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

export function CopyContentButton({ value }: { value: string }) {
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
      // Clipboard writes can fail due to browser permissions.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 rounded-md border border-[#e1e4e8] bg-white px-2.5 text-[11px] text-[#57606a] hover:bg-[#f6f8fa] hover:text-[#1f2328] dark:border-[#2a2a2a] dark:bg-[#0a0a0a] dark:text-[#919191] dark:hover:bg-[#111111] dark:hover:text-white"
      onClick={onCopy}
      aria-label="Copy file content"
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Clipboard className="size-3.5" aria-hidden />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}
