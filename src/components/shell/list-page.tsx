"use client";

import { Panel } from "@/components/ui/panel";
import { FilterRail } from "@/components/ui/filter-rail";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";

type PlaceholderRow = Record<string, never>;

// Phase 3 list-page scaffold: header, filter rail, and an (empty) data table.
// Phase 4 replaces the empty table with a real per-entity table + data.
export function ListPage({
  title,
  description,
  newLabel,
  columns,
  emptyMessage,
}: {
  title: string;
  description: string;
  newLabel: string;
  columns: { key: string; header: string }[];
  emptyMessage: string;
}) {
  const tableColumns: Column<PlaceholderRow>[] = columns.map((c) => ({
    key: c.key,
    header: c.header,
    sortable: true,
    render: () => null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">{title}</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">{description}</p>
        </div>
        <Button variant="primary" disabled>
          {newLabel}
        </Button>
      </div>
      <div className="flex gap-4">
        <FilterRail />
        <Panel className="flex-1 overflow-hidden">
          <DataTable<PlaceholderRow>
            columns={tableColumns}
            rows={[]}
            getRowKey={() => ""}
            emptyMessage={emptyMessage}
          />
        </Panel>
      </div>
    </div>
  );
}
