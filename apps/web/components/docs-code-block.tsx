"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

export function DocsCodeBlock({ children, label }: { children: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function extractCopyText(raw: string): string {
    return raw
      .split("\n")
      .filter((l) => l.startsWith("$ "))
      .map((l) => l.slice(2))
      .join("\n");
  }

  async function onCopy() {
    const copyable = extractCopyText(children);
    if (!copyable) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyable);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = copyable;
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
      // silently fail
    }
  }

  const hasCopyableLines = children.split("\n").some((l) => l.startsWith("$ "));

  return (
    <div className="group relative overflow-hidden border border-border/60 bg-muted/20">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label ?? "shell"}
        </span>
        {hasCopyableLines && (
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Copy commands"
          >
            {copied ? (
              <>
                <Check className="size-3" aria-hidden />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" aria-hidden />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-foreground">
        <code>{children}</code>
      </pre>
    </div>
  );
}
