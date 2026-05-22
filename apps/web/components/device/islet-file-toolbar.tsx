"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Clipboard, Code2, History } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";

const actionButtonClass =
  "inline-flex items-center rounded border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 no-underline transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-transparent dark:hover:bg-zinc-800 dark:hover:text-white dark:hover:ring-1 dark:hover:ring-white/10";

const actionButtonIconClass = "mr-2 size-4 shrink-0";

export function IsletFileToolbar({
  contentPromise,
  rawDownloadHref,
  historyHref,
}: {
  contentPromise: Promise<{ content: string; isTooLarge: boolean }>;
  rawDownloadHref: string;
  historyHref: string;
}) {
  const { content, isTooLarge } = React.use(contentPromise);
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
    if (isTooLarge) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = content;
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
    <div className="flex items-center gap-2">
      <Link
        href={rawDownloadHref}
        target="_blank"
        rel="noopener noreferrer"
        prefetch={false}
        className={actionButtonClass}
      >
        <Code2 className={actionButtonIconClass} aria-hidden />
        Raw
      </Link>
      <Link href={historyHref} className={actionButtonClass}>
        <History className={actionButtonIconClass} aria-hidden />
        History
      </Link>
      <button
        type="button"
        className={`${actionButtonClass} ${isTooLarge ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        onClick={onCopy}
        disabled={isTooLarge}
        aria-label={isTooLarge ? "File is too large to copy" : "Copy file content"}
      >
        {copied ? (
          <Check className={actionButtonIconClass} aria-hidden />
        ) : (
          <Clipboard className={actionButtonIconClass} aria-hidden />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function IsletFileToolbarSkeleton() {
  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label="Loading toolbar"
    >
      <div className={`${actionButtonClass} pointer-events-none`} aria-hidden>
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-8 rounded-sm" />
      </div>
      <div className={`${actionButtonClass} pointer-events-none`} aria-hidden>
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-14 rounded-sm" />
      </div>
      <div className={`${actionButtonClass} pointer-events-none`} aria-hidden>
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-11 rounded-sm" />
      </div>
    </div>
  );
}
