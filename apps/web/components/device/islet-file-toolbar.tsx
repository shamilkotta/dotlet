"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Clipboard, Code2, History } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";

const segmentBase =
  "flex items-center justify-center w-full gap-2 px-3 md:px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const segmentDivider = "border-r border-[#e1e4e8] dark:border-[#2a2a2a]";

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
    <div className="flex w-full items-center overflow-hidden rounded-lg border border-[#e1e4e8] bg-white shadow-sm dark:border-[#2a2a2a] dark:bg-neutral-900">
      <Link
        href={rawDownloadHref}
        target="_blank"
        rel="noopener noreferrer"
        prefetch={false}
        className={`${segmentBase} ${segmentDivider} text-inherit no-underline hover:bg-gray-50 dark:hover:bg-neutral-800`}
      >
        <Code2 className="size-4 shrink-0" aria-hidden />
        Raw
      </Link>
      <Link
        href={historyHref}
        className={`${segmentBase} ${segmentDivider} text-inherit no-underline hover:bg-gray-50 dark:hover:bg-neutral-800`}
      >
        <History className="size-4 shrink-0" aria-hidden />
        History
      </Link>
      <button
        type="button"
        className={`${segmentBase}  group  ${isTooLarge ? "opacity-50 cursor-not-allowed pointer-events-none" : "hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"}`}
        onClick={onCopy}
        disabled={isTooLarge}
        aria-label={isTooLarge ? "File is too large to copy" : "Copy file content"}
      >
        {copied ? (
          <Check className="size-4 shrink-0" aria-hidden />
        ) : (
          <Clipboard className="size-4 shrink-0 " aria-hidden />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function IsletFileToolbarSkeleton() {
  return (
    <div
      className="flex items-center overflow-hidden rounded-lg border border-[#e1e4e8] bg-white shadow-sm dark:border-[#2a2a2a] dark:bg-neutral-900"
      role="status"
      aria-live="polite"
      aria-label="Loading toolbar"
    >
      <div className={`${segmentBase} ${segmentDivider} pointer-events-none`} aria-hidden>
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-8 rounded-sm" />
      </div>
      <div className={`${segmentBase} ${segmentDivider} pointer-events-none`} aria-hidden>
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-14 rounded-sm" />
      </div>
      <div className={`${segmentBase} pointer-events-none`} aria-hidden>
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-11 rounded-sm" />
      </div>
    </div>
  );
}
