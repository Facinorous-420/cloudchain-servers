"use client";

import { useEffect } from "react";

export function TopBarSearch() {
  // Clicking/focusing the bar dispatches a custom event that CommandPalette listens for.
  function open() {
    window.dispatchEvent(new CustomEvent("cloudchain:search:open"));
  }

  // Also open when the user starts typing into this field (any printable key).
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      open();
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      className="hidden items-center gap-2 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-[12px] text-text-dim transition-colors hover:border-accent hover:text-text sm:flex"
      aria-label="Open search"
    >
      <span className="text-[13px] leading-none text-faint">⌕</span>
      <span className="min-w-[120px] text-left text-faint">Search…</span>
      <kbd className="rounded border border-border px-1 py-0.5 text-[9px] text-faint">
        ⌘K
      </kbd>
    </button>
  );
}
