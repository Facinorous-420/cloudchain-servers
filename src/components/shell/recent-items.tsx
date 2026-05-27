"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type RecentItem = {
  href: string;
  label: string;
};

const STORAGE_KEY = "cloudchain_recent";
const MAX_ITEMS = 5;

// Page patterns that count as trackable entity detail pages
const DETAIL_PATTERNS: { re: RegExp; label: (m: RegExpMatchArray) => string }[] =
  [
    { re: /^\/assets\/([^/]+)$/, label: () => "Asset" },
    { re: /^\/drives\/([^/]+)$/, label: () => "Drive" },
    { re: /^\/components\/([^/]+)$/, label: () => "Component" },
    { re: /^\/licenses\/([^/]+)$/, label: () => "License" },
    { re: /^\/batteries\/([^/]+)$/, label: () => "Battery" },
    { re: /^\/connections\/([^/]+)$/, label: () => "Connection" },
    { re: /^\/applications\/([^/]+)$/, label: () => "Application" },
    { re: /^\/storages\/([^/]+)$/, label: () => "Storage" },
    { re: /^\/racks\/([^/]+)$/, label: () => "Rack" },
  ];

function readRecent(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeRecent(items: RecentItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function RecentItems() {
  const pathname = usePathname();
  const [items, setItems] = useState<RecentItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load on mount
  useEffect(() => {
    setItems(readRecent());
  }, []);

  // Track page visits — read label from page after a tick so Next.js has set the title
  useEffect(() => {
    // skip /edit sub-routes and /new pages
    if (pathname.includes("/edit") || pathname.endsWith("/new")) return;
    const match = DETAIL_PATTERNS.find(({ re }) => re.test(pathname));
    if (!match) return;
    const timer = setTimeout(() => {
      // Use the H1 text if available, otherwise document.title, otherwise fallback
      const h1 = document.querySelector("h1")?.textContent?.trim();
      const title = h1 || document.title.split(" | ")[0] || match.label(pathname.match(match.re)!);
      const newItem: RecentItem = { href: pathname, label: title };
      setItems((prev) => {
        const filtered = prev.filter((r) => r.href !== pathname);
        const next = [newItem, ...filtered].slice(0, MAX_ITEMS);
        writeRecent(next);
        return next;
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-border px-2.5 py-1.5 text-[11px] text-text-dim transition-colors hover:border-accent hover:text-accent"
      >
        Recent
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-52 overflow-hidden rounded-lg border border-border bg-panel shadow-xl">
          <div className="border-b border-border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-accent">
            Recently visited
          </div>
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block truncate px-3 py-2 text-[12px] text-text-dim hover:bg-panel-2 hover:text-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
