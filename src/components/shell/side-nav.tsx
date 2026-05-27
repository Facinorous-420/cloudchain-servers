"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Labelled top-level pages — icon + text in a vertical list.
const PRIMARY: { href: string; label: string; icon: IconKey }[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/topology", label: "Topology", icon: "layout" },
  { href: "/financials", label: "Financials", icon: "chart" },
];

// Inventory section sits at the bottom — icon-only grid, full label on
// hover. Matches the UniFi "Policy Engine" affordance.
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

export function SideNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="w-52 shrink-0 border-r border-border bg-panel">
      <div className="flex flex-col p-3">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <li key={item.href}>
              <PrimaryLink
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
              />
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <p className="px-1 text-[9px] font-black uppercase tracking-[1.5px] text-text-dim">
            Inventory
          </p>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {INVENTORY.map((item) => (
              <IconLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function PrimaryLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconKey;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-bold transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-text-dim hover:bg-panel-2 hover:text-text"
      }`}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function IconLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconKey;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`group relative flex aspect-square items-center justify-center rounded-md border transition-colors ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border/60 bg-panel-2 text-text-dim hover:border-accent/50 hover:text-text"
      }`}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {/* CSS-only tooltip — appears to the right on hover/focus. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-panel px-2 py-1 text-[11px] font-bold text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </Link>
  );
}

// ---------- Icons ----------
// Inlined Lucide-style SVG paths so we don't add a runtime dep. Stroke +
// currentColor so they pick up the active/hover foreground from the parent.

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
