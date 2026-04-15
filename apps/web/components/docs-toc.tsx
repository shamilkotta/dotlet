"use client";

import { useEffect, useState } from "react";

type TocItem = {
  readonly id: string;
  readonly label: string;
};

export function DocsTableOfContents({ items }: { items: readonly TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-12 hidden h-fit max-h-[calc(100vh-6rem)] w-44 shrink-0 overflow-y-auto lg:block">
      <div className="mb-4 text-[10px] uppercase tracking-widest text-muted-foreground/60">
        On this page
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block py-0.5 text-[11px] transition-colors ${
                activeId === item.id
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
