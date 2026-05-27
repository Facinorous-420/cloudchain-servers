import type { ReactNode } from "react";

export function EmptyState({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-6 py-10 text-center text-[11.5px] leading-relaxed text-faint">
      {icon && <div className="mb-2 text-3xl opacity-50">{icon}</div>}
      {children}
    </div>
  );
}
