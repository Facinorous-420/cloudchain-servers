import type { ReactNode } from "react";

// Brief hover/focus tooltip. Defaults to a small "?" trigger when no children
// are provided — the typical "what is this field?" use.
export function Tooltip({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      {children ?? (
        <span
          tabIndex={0}
          aria-label={text}
          className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-text-dim text-[9px] font-bold text-text-dim transition-colors hover:border-accent hover:text-accent focus:border-accent focus:text-accent focus:outline-none"
        >
          ?
        </span>
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-max max-w-xs -translate-x-1/2 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-[11px] leading-snug normal-case tracking-normal text-text shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
