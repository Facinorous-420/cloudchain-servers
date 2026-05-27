"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type FilterDef = {
  key: string;
  label: string;
  count?: number; // optional badge showing how many items match this filter
};

// Generic sidebar filter rail. Each list page passes its entity-specific
// filters via `filters`; the "Show sold/junked" toggle is always present.
// Active state is stored in URL params so filters survive page navigation.
export function FilterRail({
  showRetired = false,
  filters = [],
}: {
  showRetired?: boolean;
  filters?: FilterDef[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggle = useCallback(
    (key: string, active: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (active) {
        params.delete(key);
      } else {
        params.set(key, "1");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <aside className="w-full md:w-52 md:shrink-0">
      <div className="rounded-[9px] border border-border bg-panel p-4">
        <h3 className="mb-3 text-[9px] font-black uppercase tracking-wider text-accent">
          Filters
        </h3>

        <div className="flex flex-col gap-2">
          {/* Always-present retired toggle */}
          <label className="flex cursor-pointer items-center gap-2.5 text-[12px] text-text-dim hover:text-text">
            <input
              type="checkbox"
              className="ui-checkbox"
              checked={showRetired}
              onChange={() => toggle("showRetired", showRetired)}
            />
            Show sold / junked
          </label>

          {/* Entity-specific filters */}
          {filters.map((f) => {
            const active = searchParams.get(f.key) === "1";
            return (
              <label
                key={f.key}
                className="flex cursor-pointer items-center gap-2.5 text-[12px] text-text-dim hover:text-text"
              >
                <input
                  type="checkbox"
                  className="ui-checkbox"
                  checked={active}
                  onChange={() => toggle(f.key, active)}
                />
                <span className="flex-1">{f.label}</span>
                {f.count != null && f.count > 0 && (
                  <span className="rounded-full bg-panel-2 px-1.5 py-0.5 text-[10px] font-bold text-text-dim">
                    {f.count}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
