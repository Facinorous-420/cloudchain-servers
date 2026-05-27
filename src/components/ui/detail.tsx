import type { ReactNode } from "react";
import { Panel } from "./panel";

// Read-only label/value pair used in detail pages. Empty values render a dim
// dash so the layout stays uniform whether the field is set or not.
export function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  const content = children ?? value;
  const empty =
    content == null ||
    content === "" ||
    (typeof content === "string" && content.trim() === "");
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
        {label}
      </dt>
      <dd className="text-[13px] text-text">
        {empty ? <span className="text-faint">—</span> : content}
      </dd>
    </div>
  );
}

export function DetailGrid({
  children,
  columns = 3,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}) {
  const cols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns];
  return <dl className={`grid ${cols} gap-x-5 gap-y-3.5`}>{children}</dl>;
}

export function DetailSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-accent">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[11.5px] text-text-dim">{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </Panel>
  );
}
