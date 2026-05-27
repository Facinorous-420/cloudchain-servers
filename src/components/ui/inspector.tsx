import type { ReactNode } from "react";

// Right-hand detail pane. Used by the rack diagram and detail views as the
// single surface for inspecting a selected item.
export function Inspector({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <aside className="w-80 flex-shrink-0">
      <div className="rounded-[9px] border border-border bg-panel">
        <div className="border-b border-border px-4 py-3.5">
          <h3 className="text-[13px] font-black">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-text-dim">{subtitle}</p>
          )}
        </div>
        <div className="max-h-[760px] overflow-auto p-4">{children}</div>
      </div>
    </aside>
  );
}
