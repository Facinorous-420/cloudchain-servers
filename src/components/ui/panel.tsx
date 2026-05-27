import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[9px] border border-border bg-panel ${className}`}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3.5">
      <div>
        <h2 className="text-base font-black">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[11.5px] text-text-dim">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
