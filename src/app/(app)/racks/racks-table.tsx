"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteRack } from "./actions";

export type RackRow = {
  id: string;
  name: string;
  totalU: number;
  manufacturer: string | null;
  assetCount: number;
};

export function RacksTable({ racks }: { racks: RackRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleDelete(row: RackRow) {
    const msg =
      row.assetCount > 0
        ? `Delete "${row.name}"? ${row.assetCount} asset${row.assetCount === 1 ? "" : "s"} will become unassigned from this rack.`
        : `Delete "${row.name}"?`;
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      await deleteRack(row.id);
      addToast(`Deleted rack ${row.name}`);
      router.refresh();
    });
  }

  async function handleBulkDelete(ids: string[]) {
    for (const id of ids) await deleteRack(id);
    addToast(`Deleted ${ids.length} rack${ids.length !== 1 ? "s" : ""}`);
    router.refresh();
  }

  const columns: Column<RackRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <Link
          href={`/racks/${r.id}`}
          className="font-bold text-text hover:text-accent hover:underline"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: "totalU",
      header: "U",
      sortable: true,
      sortValue: (r) => r.totalU,
      render: (r) => `${r.totalU}U`,
    },
    {
      key: "manufacturer",
      header: "Manufacturer",
      sortable: true,
      sortValue: (r) => r.manufacturer ?? "",
      render: (r) => r.manufacturer ?? <span className="text-faint">—</span>,
    },
    {
      key: "assetCount",
      header: "Racked",
      sortable: true,
      sortValue: (r) => r.assetCount,
      render: (r) =>
        `${r.assetCount} asset${r.assetCount === 1 ? "" : "s"}`,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <LinkButton
            href={`/racks/${r.id}/edit`}
            className="px-2.5 py-1 text-xs"
          >
            Edit
          </LinkButton>
          <button
            type="button"
            onClick={() => handleDelete(r)}
            disabled={isPending}
            className="rounded-md border border-border px-2.5 py-1 text-xs text-text-dim transition-colors hover:border-red-500 hover:text-red-400 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={racks}
      getRowKey={(r) => r.id}
      emptyState={{ message: "No racks yet.", href: "/racks/new", linkLabel: "Add your first rack" }}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
