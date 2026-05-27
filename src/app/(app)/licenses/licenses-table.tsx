"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/button";
import { EntityIconThumb } from "@/components/ui/entity-icon";
import { useToast } from "@/components/ui/toast";
import { deleteLicense } from "./actions";

export type LicenseRow = {
  id: string;
  name: string;
  type: string | null;
  seats: number | null;
  renewalDate: string | null;
  assignmentCount: number;
};

export function LicensesTable({ licenses }: { licenses: LicenseRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleDelete(row: LicenseRow) {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteLicense(row.id);
      addToast(`Deleted ${row.name}`);
      router.refresh();
    });
  }

  async function handleBulkDelete(ids: string[]) {
    for (const id of ids) await deleteLicense(id);
    addToast(`Deleted ${ids.length} license${ids.length !== 1 ? "s" : ""}`);
    router.refresh();
  }

  const dim = (value: string | null) =>
    value ?? <span className="text-faint">—</span>;

  const columns: Column<LicenseRow>[] = [
    {
      key: "thumb",
      header: "",
      render: () => <EntityIconThumb type="key" />,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <Link
          href={`/licenses/${r.id}`}
          className="font-bold text-text hover:text-accent hover:underline"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type ?? "",
      render: (r) => dim(r.type),
    },
    {
      key: "seats",
      header: "Seats",
      sortable: true,
      sortValue: (r) => r.seats ?? 0,
      render: (r) => (r.seats == null ? <span className="text-faint">—</span> : r.seats),
    },
    {
      key: "renewalDate",
      header: "Renewal",
      sortable: true,
      sortValue: (r) => r.renewalDate ?? "",
      render: (r) => dim(r.renewalDate),
    },
    {
      key: "assignmentCount",
      header: "Assigned",
      sortable: true,
      sortValue: (r) => r.assignmentCount,
      render: (r) => `${r.assignmentCount} asset${r.assignmentCount === 1 ? "" : "s"}`,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <LinkButton
            href={`/licenses/${r.id}/edit`}
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
      rows={licenses}
      getRowKey={(r) => r.id}
      emptyState={{ message: "No licenses yet.", href: "/licenses/new", linkLabel: "Add your first license" }}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
