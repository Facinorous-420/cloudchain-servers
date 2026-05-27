import type { ReactNode } from "react";
import { Panel } from "./panel";

// Single-stat panel used on the dashboard and the financials page.
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "text-text",
    accent: "text-accent",
    success: "text-status-green",
    warning: "text-cat-ups",
  } as const;
  return (
    <Panel className="px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-black ${tones[tone]}`}>{value}</p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-text-dim">{hint}</p>
      )}
    </Panel>
  );
}
