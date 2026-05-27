"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
};

export type SortState = { key: string; dir: "asc" | "desc" };

export type EmptyStateDef = {
  message: string;
  href: string;
  linkLabel: string;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No records yet.",
  emptyState,
  defaultSort = null,
  onDeleteSelected,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  emptyState?: EmptyStateDef;
  defaultSort?: SortState | null;
  onDeleteSelected?: (ids: string[]) => Promise<void>;
}) {
  const [sort, setSort] = useState<SortState | null>(defaultSort);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const selectable = Boolean(onDeleteSelected);

  const sorted = [...rows];
  if (sort) {
    const sortValue = columns.find((c) => c.key === sort.key)?.sortValue;
    if (sortValue) {
      const dir = sort.dir;
      sorted.sort((a, b) => {
        const av = sortValue(a);
        const bv = sortValue(b);
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") {
          cmp = av - bv;
        } else {
          cmp = String(av).localeCompare(String(bv));
        }
        return dir === "asc" ? cmp : -cmp;
      });
    }
  }

  // Keep select-all checkbox indeterminate when partially selected.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < sorted.length;
    }
  }, [selectedIds.size, sorted.length]);

  function toggleSort(key: string) {
    const newSort: SortState =
      sort?.key === key
        ? { key, dir: sort.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" };
    setSort(newSort);
    const params = new URLSearchParams(window.location.search);
    params.set("sortBy", newSort.key);
    params.set("sortDir", newSort.dir);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function toggleAll() {
    if (selectedIds.size === sorted.length && sorted.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((r) => getRowKey(r))));
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (!ids.length || !onDeleteSelected) return;
    if (
      !window.confirm(
        `Delete ${ids.length} item${ids.length !== 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return;
    setBulkPending(true);
    try {
      await onDeleteSelected(ids);
      setSelectedIds(new Set());
    } finally {
      setBulkPending(false);
    }
  }

  const allChecked = sorted.length > 0 && selectedIds.size === sorted.length;

  return (
    <div className="overflow-x-auto">
      {selectable && selectedIds.size > 0 && (
        <div className="mb-2 flex items-center gap-3 rounded-md border border-red-500/30 bg-red-400/10 px-3 py-2">
          <span className="text-xs text-red-400">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={bulkPending}
            className="rounded border border-red-500/50 px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-400/20 disabled:opacity-50"
          >
            {bulkPending
              ? "Deleting…"
              : `Delete ${selectedIds.size} selected`}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-text-dim hover:text-text"
          >
            Clear
          </button>
        </div>
      )}
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {selectable && (
              <th className="w-8 px-3.5 py-2.5">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="cursor-pointer accent-accent"
                  aria-label="Select all"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                className={`px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-dim ${
                  col.sortable
                    ? "cursor-pointer select-none transition-colors hover:text-text"
                    : ""
                }`}
              >
                {col.header}
                {sort?.key === col.key && (
                  <span className="ml-1 text-accent">
                    {sort.dir === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)}>
                {emptyState ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <p className="text-[12px] text-faint">{emptyState.message}</p>
                    <Link
                      href={emptyState.href}
                      className="rounded-md border border-border px-3 py-1.5 text-[12px] text-text-dim transition-colors hover:border-accent hover:text-accent"
                    >
                      {emptyState.linkLabel}
                    </Link>
                  </div>
                ) : (
                  <div className="px-6 py-10 text-center text-[11.5px] text-faint">
                    {emptyMessage}
                  </div>
                )}
              </td>
            </tr>
          ) : (
            sorted.map((row, idx) => (
              <tr
                key={getRowKey(row)}
                className={`transition-colors hover:bg-panel-2 ${
                  idx < sorted.length - 1 ? "border-b border-border/40" : ""
                } ${selectedIds.has(getRowKey(row)) ? "bg-accent/5" : ""}`}
              >
                {selectable && (
                  <td className="px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(getRowKey(row))}
                      onChange={() => toggleRow(getRowKey(row))}
                      className="cursor-pointer accent-accent"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-3.5 py-2.5 text-text">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
