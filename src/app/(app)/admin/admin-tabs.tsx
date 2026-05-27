"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Settings", href: "/admin/settings" },
  { label: "Users", href: "/admin/users" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <div className="flex w-fit overflow-hidden rounded-lg border border-border bg-panel-2">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "px-4 py-1.5 text-[12.5px] font-semibold transition-colors",
              active
                ? "bg-border/60 text-accent"
                : "text-text-dim hover:text-accent",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
