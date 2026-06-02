"use client";

// Generic state-driven tab switcher matching the admin dashboard tab style.
// Used for in-page tabs (e.g. the asset form's General/Size/Hardware/Rendering
// sections and its Rendering sub-tabs). For route-based tabs use AdminTabs.

export type TabItem = {
  id: string;
  label: string;
  // Show a small red dot on the tab (e.g. a validation error lives in it).
  badge?: boolean;
};

export function TabBar({
  tabs,
  active,
  onChange,
  size = "md",
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  size?: "md" | "sm";
}) {
  const pad = size === "sm" ? "px-3 py-1 text-[11.5px]" : "px-4 py-1.5 text-[12.5px]";
  return (
    <div className="flex w-fit overflow-hidden rounded-lg border border-border bg-panel-2">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              pad,
              "relative font-semibold transition-colors",
              isActive ? "bg-border/60 text-accent" : "text-text-dim hover:text-accent",
            ].join(" ")}
          >
            {tab.label}
            {tab.badge && (
              <span
                aria-hidden
                className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
