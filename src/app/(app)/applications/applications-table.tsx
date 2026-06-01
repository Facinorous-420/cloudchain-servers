"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { enumLabel } from "@/lib/enums";
import { useToast } from "@/components/ui/toast";
import { deleteApplication } from "./actions";

export type ApplicationRow = {
  id: string;
  name: string;
  type: string;
  operatingSystem: string | null;
  status: string | null;
  hostId: string;
  hostCodename: string;
};

export function ApplicationsTable({
  applications,
}: {
  applications: ApplicationRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleDelete(row: ApplicationRow) {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteApplication(row.id);
      addToast(`Deleted ${row.name}`);
      router.refresh();
    });
  }

  async function handleBulkDelete(ids: string[]) {
    for (const id of ids) await deleteApplication(id);
    addToast(`Deleted ${ids.length} application${ids.length !== 1 ? "s" : ""}`);
    router.refresh();
  }

  const columns: Column<ApplicationRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-bold">{r.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      hideOnMobile: true,
      sortable: true,
      sortValue: (r) => r.type,
      render: (r) => <Badge>{enumLabel(r.type)}</Badge>,
    },
    {
      key: "host",
      header: "Host",
      hideOnMobile: true,
      sortable: true,
      sortValue: (r) => r.hostCodename,
      render: (r) => (
        <Link
          href={`/assets/${r.hostId}`}
          className="text-accent hover:underline"
        >
          {r.hostCodename}
        </Link>
      ),
    },
    {
      key: "operatingSystem",
      header: "OS",
      hideOnMobile: true,
      sortable: true,
      sortValue: (r) => r.operatingSystem ?? "",
      render: (r) =>
        r.operatingSystem ?? <span className="text-faint">—</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status ?? "",
      render: (r) => r.status ?? <span className="text-faint">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <LinkButton
            href={`/applications/${r.id}/edit`}
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
      rows={applications}
      getRowKey={(r) => r.id}
      emptyState={{ message: "No applications yet.", href: "/applications/new", linkLabel: "Add your first application" }}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
