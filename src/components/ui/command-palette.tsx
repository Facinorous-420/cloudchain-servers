"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { searchEntities, type SearchResult } from "@/app/(app)/search/actions";

const KIND_ICON: Record<SearchResult["kind"], string> = {
  asset: "▣",
  drive: "◈",
  component: "◉",
  license: "◎",
  battery: "⊙",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActive(0);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut + custom event from the top-bar search bar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") close();
    }
    function onSearchOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("cloudchain:search:open", onSearchOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cloudchain:search:open", onSearchOpen);
    };
  }, [close]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setActive(0);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await searchEntities(query);
        setResults(r);
        setActive(0);
      });
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  function navigate(href: string) {
    router.push(href);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      navigate(results[active].href);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-panel shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="text-text-dim">⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search assets, drives, components…"
            className="flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-faint"
          />
          {isPending && (
            <span className="text-[11px] text-text-dim">searching…</span>
          )}
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-faint">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto py-1.5">
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate(r.href)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === active ? "bg-panel-2" : ""
                  }`}
                >
                  <span className="w-4 shrink-0 text-center text-[12px] text-accent">
                    {KIND_ICON[r.kind]}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] font-bold text-text">
                      {r.label}
                    </span>
                    <span className="text-[11px] text-text-dim">{r.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim() && !isPending ? (
          <div className="px-4 py-6 text-center text-[12px] text-faint">
            No results for &ldquo;{query}&rdquo;
          </div>
        ) : !query.trim() ? (
          <div className="px-4 py-5 text-center text-[12px] text-faint">
            Start typing to search…
          </div>
        ) : null}

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2">
          <span className="flex items-center gap-1 text-[10px] text-faint">
            <kbd className="rounded border border-border px-1 py-0.5">↑↓</kbd>{" "}
            Navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-faint">
            <kbd className="rounded border border-border px-1 py-0.5">↵</kbd>{" "}
            Open
          </span>
        </div>
      </div>
    </div>
  );
}
