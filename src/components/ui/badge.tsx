import type { ReactNode } from "react";

type Tone =
  | "neutral"
  | "success"
  | "accent"
  | "warning"
  | "danger"
  | "info"    // blue — used for HDD kind badge
  | "purple"; // purple — used for SAS kind badge

const toneClasses: Record<Tone, string> = {
  neutral: "bg-text-dim/15 text-text-dim",
  success: "bg-status-green/15 text-status-green",
  accent: "bg-accent/15 text-accent",
  warning: "bg-cat-ups/15 text-cat-ups",
  danger: "bg-red-500/15 text-red-400",
  info: "bg-cat-switch/15 text-cat-switch",
  purple: "bg-cat-firewall/15 text-cat-firewall",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
