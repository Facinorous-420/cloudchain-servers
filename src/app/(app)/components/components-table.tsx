"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { enumLabel } from "@/lib/enums";
import { EntityIconThumb } from "@/components/ui/entity-icon";
import { useToast } from "@/components/ui/toast";
import { deleteComponent } from "./actions";

export type ComponentRow = {
  id: string;
  name: string;
  type: string;
  quantity: number;
  state: string;
  installedIn: string | null;
};

function StateBadge({ state }: { state: string }) {
  if (state === "IN_USE" || state === "STORED") return null;
  return (
    <Badge tone={state === "SOLD" ? "warning" : "danger"}>
      {state === "SOLD" ? "Sold" : "Junked"}
    </Badge>
  );
}

export function ComponentsTable({
  components,
}: {
  components: ComponentRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleDelete(row: ComponentRow) {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteComponent(row.id);
      addToast(`Deleted ${row.name}`);
      router.refresh();
    });
  }

  async function handleBulkDelete(ids: string[]) {
    for (const id of ids) await deleteComponent(id);
    addToast(`Deleted ${ids.length} component${ids.length !== 1 ? "s" : ""}`);
    router.refresh();
  }

  const columns: Column<ComponentRow>[] = [
    {
      key: "thumb",
      header: "",
      render: () => <EntityIconThumb type="cpu" />,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="flex items-center gap-2">
          <Link
            href={`/components/${r.id}`}
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
      sortValue: (r) => r.type,
      render: (r) => <Badge>{enumLabel(r.type)}</Badge>,
    },
    {
      key: "quantity",
      header: "Qty",
      sortable: true,
      sortValue: (r) => r.quantity,
      render: (r) => r.quantity,
    },
    {
      key: "installedIn",
      header: "Installed in",
      sortable: true,
      sortValue: (r) => r.installedIn ?? "",
      render: (r) =>
        r.installedIn ?? <span className="text-faint">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <LinkButton
            href={`/components/${r.id}/edit`}
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
      rows={components}
      getRowKey={(r) => r.id}
      emptyState={{ message: "No components yet.", href: "/components/new", linkLabel: "Add your first component" }}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
