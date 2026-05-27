"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(app)/sign-out-action";

const PRIMARY: { href: string; label: string; icon: IconKey }[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/topology", label: "Topology", icon: "layout" },
  { href: "/financials", label: "Financials", icon: "chart" },
];

const INVENTORY: { href: string; label: string; icon: IconKey }[] = [
  { href: "/assets", label: "Assets", icon: "cube" },
  { href: "/drives", label: "Drives", icon: "drive" },
  { href: "/components", label: "Components", icon: "cpu" },
  { href: "/batteries", label: "Batteries", icon: "battery" },
  { href: "/consumables", label: "Consumables", icon: "box" },
  { href: "/licenses", label: "Licenses", icon: "key" },
  { href: "/applications", label: "Applications", icon: "grid" },
  { href: "/connections", label: "Connections", icon: "link" },
  { href: "/storages", label: "Storages", icon: "archive" },
  { href: "/racks", label: "Racks", icon: "rack" },
];

export function MobileNav({
  username,
  role,
}: {
  username?: string | null;
  role?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger — fixed over the right side of the top bar on mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        className="fixed right-0 top-0 z-[60] flex h-12 w-12 items-center justify-center text-text-dim transition-colors hover:text-text md:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-5 w-5"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[65] bg-black/60 transition-opacity duration-200 md:hidden ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Left slide-out drawer */}
      <nav
        className={`fixed inset-y-0 left-0 z-[70] flex w-72 flex-col border-r border-border bg-panel transition-transform duration-200 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 text-[13px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-status-green shadow-[0_0_6px_var(--color-status-green)]" />
            Cloudchain
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation"
            className="rounded-md p-1 text-text-dim transition-colors hover:text-text"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="h-5 w-5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable nav links */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Search trigger */}
          <button
            type="button"
            onClick={() => {
              close();
              window.dispatchEvent(new CustomEvent("cloudchain:search:open"));
            }}
            className="mb-3 flex w-full items-center gap-2 rounded-md border border-border bg-panel-2 px-3 py-2 text-[12px] text-faint transition-colors hover:border-accent hover:text-text"
            aria-label="Open search"
          >
            <span className="text-[14px] leading-none">⌕</span>
            <span className="flex-1 text-left">Search…</span>
            <kbd className="rounded border border-border px-1 py-0.5 text-[9px]">⌘K</kbd>
          </button>

          <ul className="flex flex-col gap-0.5">
            {PRIMARY.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-bold transition-colors ${
                    isActive(item.href)
                      ? "bg-accent/10 text-accent"
                      : "text-text-dim hover:bg-panel-2 hover:text-text"
                  }`}
                >
                  <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <p className="px-1 text-[9px] font-black uppercase tracking-[1.5px] text-text-dim">
              Inventory
            </p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {INVENTORY.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-bold transition-colors ${
                      isActive(item.href)
                        ? "bg-accent/10 text-accent"
                        : "text-text-dim hover:bg-panel-2 hover:text-text"
                    }`}
                  >
                    <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* User footer */}
        <div className="flex shrink-0 flex-col gap-1 border-t border-border p-3">
          {username && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-dim">
              {username}
              {role === "ADMIN" && (
                <svg
                  className="h-3 w-3 text-accent"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-label="Admin"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 1.5L3 4.5v5c0 4.14 2.98 8.02 7 9 4.02-.98 7-4.86 7-9v-5L10 1.5z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          )}
          {role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={close}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-dim transition-colors hover:border-accent hover:text-accent"
            >
              Admin settings
            </Link>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-md border border-border px-2.5 py-1.5 text-left text-xs text-text-dim transition-colors hover:border-red-500/60 hover:text-red-400"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}

type IconKey =
  | "dashboard"
  | "layout"
  | "chart"
  | "cube"
  | "drive"
  | "cpu"
  | "battery"
  | "box"
  | "key"
  | "grid"
  | "link"
  | "archive"
  | "rack";

function Icon({
  name,
  className = "",
}: {
  name: IconKey;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

const PATHS: Record<IconKey, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </>
  ),
  chart: (
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </>
  ),
  cube: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </>
  ),
  drive: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="6" y1="9" x2="6.01" y2="9" />
      <line x1="10" y1="9" x2="10.01" y2="9" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 14h3" />
      <path d="M1 9h3" />
      <path d="M1 14h3" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <line x1="22" y1="11" x2="22" y2="13" />
      <line x1="6" y1="11" x2="6" y2="13" />
      <line x1="10" y1="11" x2="10" y2="13" />
      <line x1="14" y1="11" x2="14" y2="13" />
    </>
  ),
  box: (
    <>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8 12 13 3 8" />
      <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z" />
      <path d="M12 22V12" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  archive: (
    <>
      <rect x="2" y="4" width="20" height="5" rx="2" />
      <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
      <path d="M10 13h4" />
    </>
  ),
  rack: (
    <>
      <rect x="3" y="3" width="18" height="6" rx="1" />
      <rect x="3" y="13" width="18" height="8" rx="1" />
      <line x1="7" y1="6" x2="7.01" y2="6" />
      <line x1="11" y1="6" x2="11.01" y2="6" />
      <line x1="7" y1="17" x2="7.01" y2="17" />
      <line x1="11" y1="17" x2="11.01" y2="17" />
    </>
  ),
};
