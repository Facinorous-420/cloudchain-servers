"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EntityIconThumb } from "@/components/ui/entity-icon";
import { useToast } from "@/components/ui/toast";
import { deleteConsumable } from "./actions";

export type ConsumableRow = {
  id: string;
  name: string;
  type: string | null;
  quantity: number;
  state: string;
  location: string | null;
};

function StateBadge({ state }: { state: string }) {
  if (state === "IN_USE" || state === "STORED") return null;
  const label = state === "SOLD" ? "Sold" : state === "JUNKED" ? "Junked" : "Used up";
  return <Badge tone={state === "SOLD" ? "warning" : "danger"}>{label}</Badge>;
}

export function ConsumablesTable({
  consumables,
}: {
  consumables: ConsumableRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleDelete(row: ConsumableRow) {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteConsumable(row.id);
      addToast(`Deleted ${row.name}`);
      router.refresh();
    });
  }

  async function handleBulkDelete(ids: string[]) {
    for (const id of ids) await deleteConsumable(id);
    addToast(`Deleted ${ids.length} consumable${ids.length !== 1 ? "s" : ""}`);
    router.refresh();
  }

  const columns: Column<ConsumableRow>[] = [
    {
      key: "thumb",
      header: "",
      render: () => <EntityIconThumb type="box" />,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="flex items-center gap-2">
          <Link
            href={`/consumables/${r.id}`}
            className="font-bold text-text hover:text-accent hover:underline"
          >
            {r.name}
          </Link>
          <StateBadge state={r.state} />
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type ?? "",
      render: (r) => r.type ?? <span className="text-faint">—</span>,
    },
    {
      key: "quantity",
      header: "Qty",
      sortable: true,
      sortValue: (r) => r.quantity,
      render: (r) => r.quantity,
    },
    {
      key: "location",
      header: "Location",
      sortable: true,
      sortValue: (r) => r.location ?? "",
      render: (r) => r.location ?? <span className="text-faint">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <LinkButton
            href={`/consumables/${r.id}/edit`}
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
      rows={consumables}
      getRowKey={(r) => r.id}
      emptyState={{ message: "No consumables yet.", href: "/consumables/new", linkLabel: "Add your first consumable" }}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
