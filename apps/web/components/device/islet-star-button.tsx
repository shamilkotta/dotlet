"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "@workspace/ui/components/sonner";

import { starIslet, unstarIslet } from "@/lib/actions/islet-star";
import { Skeleton } from "@workspace/ui/components/skeleton";

const actionButtonClass =
  "inline-flex items-center rounded border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 no-underline transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-transparent dark:hover:bg-zinc-800 dark:hover:text-white dark:hover:ring-1 dark:hover:ring-white/10";

const actionButtonIconClass = "mr-2 size-4 shrink-0";

export function IsletStarButtonPlaceholder() {
  return (
    <div className={`${actionButtonClass} pointer-events-none`}>
      <Skeleton className="size-4 shrink-0 rounded-sm" />
      <Skeleton className="h-4 w-8 rounded-sm" />
    </div>
  );
}

export function IsletStarButton({
  isletId,
  starStatePromise,
  isLoggedIn,
}: {
  isletId: string;
  starStatePromise: Promise<{ starCount: number; initialStarred: boolean }>;
  isLoggedIn: boolean;
}) {
  const { starCount: initialStarCount, initialStarred } = React.use(starStatePromise);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loginHref = React.useMemo(() => {
    const q = searchParams.toString();
    const path = q ? `${pathname}?${q}` : pathname;
    return `/login?redirect=${encodeURIComponent(path)}`;
  }, [pathname, searchParams]);

  const [starred, setStarred] = React.useState(initialStarred);
  const [starCount, setStarCount] = React.useState(initialStarCount);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setStarred(initialStarred);
    setStarCount(initialStarCount);
  }, [initialStarred, initialStarCount]);

  async function onToggle() {
    if (!isLoggedIn || pending) {
      return;
    }
    const nextStarred = !starred;
    setStarred(nextStarred);
    setStarCount((c) => Math.max(0, c + (nextStarred ? 1 : -1)));
    setPending(true);
    try {
      const res = nextStarred ? await starIslet(isletId) : await unstarIslet(isletId);
      if (!res.ok) {
        setStarred(!nextStarred);
        setStarCount((c) => Math.max(0, c + (nextStarred ? -1 : 1)));
        toast.error(res.error === "Unauthorized" ? "Sign in to star islets." : res.error);
        return;
      }
      setStarred(res.starred);
      setStarCount(res.starCount);
    } catch {
      setStarred(!nextStarred);
      setStarCount((c) => Math.max(0, c + (nextStarred ? -1 : 1)));
      toast.error("Could not update star.");
    } finally {
      setPending(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <Link href={loginHref} className={actionButtonClass} aria-label="Sign in to star this islet">
        <Star className={actionButtonIconClass} strokeWidth={1.75} aria-hidden />
        <span className="tabular-nums">{starCount}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`${actionButtonClass} ${pending ? "opacity-70" : "cursor-pointer"}`}
      disabled={pending}
      onClick={onToggle}
      aria-pressed={starred}
      aria-label={starred ? "Unstar this islet" : "Star this islet"}
    >
      <Star
        className={`${actionButtonIconClass} ${starred ? "fill-amber-400 text-amber-500" : ""}`}
        strokeWidth={starred ? 0 : 1.75}
        aria-hidden
      />
      <span className="tabular-nums">{starCount}</span>
    </button>
  );
}
