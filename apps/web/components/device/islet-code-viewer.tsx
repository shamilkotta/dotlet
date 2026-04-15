"use client";

import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { highlightCode } from "@/lib/highlight";

import styles from "./islet-code-viewer.module.css";
import { useTheme } from "next-themes";
import Link from "next/link";
import { formatBytes, MAX_INLINE_FILE_SIZE_BYTES } from "@/lib/file";

const SKELETON_LINE_COUNT = 20;
const SKELETON_BAR_WIDTHS_PCT = [
  92, 78, 65, 88, 55, 72, 84, 61, 95, 70, 48, 76, 82, 66, 58, 90, 74, 52, 86, 68,
];

type SelectedLines = { start: number; end: number } | null;

function parseHash(hash: string): SelectedLines {
  const match = hash.match(/^#L(\d+)(?:-L(\d+))?$/);
  if (!match) return null;
  const start = parseInt(match[1] ?? "0", 10);
  const end = match[2] ? parseInt(match[2], 10) : start;
  return { start, end };
}

export function IsletCodeViewer({
  contentPromise,
  rawDownloadHref,
}: {
  contentPromise: Promise<{
    content: string;
    language: string;
    languageLabel: string;
    lines: number;
    sizeBytes: number;
    isTooLarge: boolean;
  }>;
  rawDownloadHref: string;
}) {
  const { content, language, lines: lineCount, isTooLarge, sizeBytes } = use(contentPromise);
  const codeRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [html, setHtml] = useState("");
  const [selectedLines, setSelectedLines] = useState<SelectedLines>(null);
  const shouldScrollOnHashChange = useRef(true);
  // const initialPlainHtml = useMemo(() => {
  //   const escaped = content
  //     .split("\n")
  //     .map(
  //       (line) =>
  //         `<span class="line">${line
  //           .replace(/&/g, "&amp;")
  //           .replace(/</g, "&lt;")
  //           .replace(/>/g, "&gt;")}</span>`,
  //     )
  //     .join("");
  //   return `<pre class="shiki github-dark"><code>${escaped}</code></pre>`;
  // }, [content]);

  const lineDigits = String(lineCount).length;

  const updateLineHighlighting = useCallback(() => {
    const root = codeRef.current;
    if (!root) return;
    const lineEls = root.querySelectorAll<HTMLSpanElement>("code > .line");
    lineEls.forEach((line, index) => {
      const lineNum = index + 1;
      const sel = selectedLines;
      const highlighted = sel !== null && lineNum >= sel.start && lineNum <= sel.end;
      line.classList.toggle("highlighted", highlighted);
    });
  }, [selectedLines]);

  useEffect(() => {
    const syncHash = () => {
      setSelectedLines(parseHash(window.location.hash));
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    shouldScrollOnHashChange.current = true;
  }, [html]);

  useEffect(() => {
    let cancelled = false;
    if (isTooLarge) return;
    setHtml(content);
    highlightCode(content, language, resolvedTheme as "light" | "dark").then((nextHtml) => {
      if (!cancelled) {
        setHtml(nextHtml);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [content, language, isTooLarge]);

  useEffect(() => {
    updateLineHighlighting();
  }, [html, selectedLines, updateLineHighlighting]);

  useEffect(() => {
    if (!shouldScrollOnHashChange.current) return;
    if (!selectedLines) return;
    const el = document.getElementById(`L${selectedLines.start}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [html, selectedLines]);

  function handleLineClick(lineNum: number, event: MouseEvent<HTMLAnchorElement>) {
    let newHash: string;
    if (event.shiftKey && selectedLines) {
      const start = Math.min(selectedLines.start, lineNum);
      const end = Math.max(selectedLines.end, lineNum);
      newHash = `#L${start}-L${end}`;
    } else {
      newHash = `#L${lineNum}`;
    }
    event.preventDefault();
    shouldScrollOnHashChange.current = false;
    const url = new URL(window.location.href);
    url.hash = newHash;
    window.history.replaceState(window.history.state, "", url.toString());
    setSelectedLines(parseHash(newHash));
  }

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  if (isTooLarge) {
    return (
      <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">File is too large to display inline.</p>
        <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
          This file is {formatBytes(sizeBytes)} and exceeds the inline preview limit of{" "}
          {formatBytes(MAX_INLINE_FILE_SIZE_BYTES)}.
        </p>
        <Link
          href={rawDownloadHref}
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
          className="mt-2 inline-block text-xs font-medium underline underline-offset-2 hover:text-amber-950 dark:hover:text-white"
        >
          Open raw file
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.codeViewer}>
      <div
        className={styles.lineNumbers}
        style={{ "--line-digits": lineDigits } as CSSProperties}
        aria-hidden
      >
        {lineNumbers.map((lineNum) => (
          <a
            key={lineNum}
            id={`L${lineNum}`}
            href={`#L${lineNum}`}
            tabIndex={-1}
            className={styles.lineNumber}
            onClick={(e) => handleLineClick(lineNum, e)}
          >
            {lineNum}
          </a>
        ))}
      </div>
      <div className={styles.codeContent}>
        <div
          ref={codeRef}
          className={styles.codeLines}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

export function IsletCodeViewerSkeleton() {
  const lineDigits = String(SKELETON_LINE_COUNT).length;

  return (
    <div className={styles.codeViewer} role="status" aria-live="polite" aria-label="Loading code">
      <div
        className={styles.lineNumbers}
        style={{ "--line-digits": lineDigits } as CSSProperties}
        aria-hidden
      >
        {Array.from({ length: SKELETON_LINE_COUNT }, (_, i) => (
          <div key={i} className={styles.skeletonLineNumberRow}>
            <Skeleton className="h-3 w-[2ch] max-w-full rounded-sm" />
          </div>
        ))}
      </div>
      <div className={styles.codeContent}>
        <div className={styles.codeLines}>
          {Array.from({ length: SKELETON_LINE_COUNT }, (_, i) => (
            <div key={i} className={styles.skeletonCodeLine}>
              <Skeleton
                className="h-3 max-w-full rounded-sm"
                style={{ width: `${SKELETON_BAR_WIDTHS_PCT[i] ?? 70}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function IsletInfo({
  contentPromise,
}: {
  contentPromise: Promise<{ lines: number; languageLabel: string; sizeBytes: number }>;
}) {
  const { lines, languageLabel, sizeBytes } = use(contentPromise);

  return (
    <div className="mb-4 flex items-center justify-between px-1 text-xs text-[#57606a] dark:text-[#919191]">
      <div className="flex gap-4">
        <span>{lines} lines</span>
        <span>{formatBytes(sizeBytes)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span
          className="size-2 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-600"
          aria-hidden
        />
        <span>{languageLabel}</span>
      </div>
    </div>
  );
}

export function IsletInfoSkeleton() {
  return (
    <div className="mb-4 flex items-center justify-between px-1 text-xs text-[#57606a] dark:text-[#919191]">
      <div className="flex gap-4">
        <Skeleton className="h-3 w-10 rounded-sm" />
        <Skeleton className="h-3 w-10 rounded-sm" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="size-2 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-10 rounded-sm" />
      </div>
    </div>
  );
}
