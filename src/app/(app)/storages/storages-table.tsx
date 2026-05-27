"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteStorage } from "./actions";

export type StorageRow = {
  id: string;
  name: string;
  notes: string | null;
  assetCount: number;
};

export function StoragesTable({ storages }: { storages: StorageRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleDelete(row: StorageRow) {
    const msg =
      row.assetCount > 0
        ? `Delete "${row.name}"? ${row.assetCount} asset${row.assetCount === 1 ? "" : "s"} will become unassigned.`
        : `Delete "${row.name}"?`;
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      await deleteStorage(row.id);
      addToast(`Deleted storage ${row.name}`);
      router.refresh();
    });
  }

  async function handleBulkDelete(ids: string[]) {
    for (const id of ids) await deleteStorage(id);
    addToast(`Deleted ${ids.length} storage${ids.length !== 1 ? "s" : ""}`);
    router.refresh();
  }

  const columns: Column<StorageRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <Link
          href={`/storages/${r.id}`}
          className="font-bold text-text hover:text-accent hover:underline"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: "assetCount",
      header: "Assets",
      sortable: true,
      sortValue: (r) => r.assetCount,
      render: (r) =>
        `${r.assetCount} item${r.assetCount === 1 ? "" : "s"}`,
    },
    {
      key: "notes",
      header: "Notes",
      render: (r) => r.notes ?? <span className="text-faint">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <LinkButton
            href={`/storages/${r.id}/edit`}
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
      rows={storages}
      getRowKey={(r) => r.id}
      emptyState={{ message: "No storage locations yet.", href: "/storages/new", linkLabel: "Add your first storage location" }}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
