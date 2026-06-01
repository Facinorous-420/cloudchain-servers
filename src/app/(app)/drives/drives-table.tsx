"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column, type EmptyStateDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EntityIconThumb } from "@/components/ui/entity-icon";
import { useToast } from "@/components/ui/toast";
import { deleteDrive } from "./actions";

function StateBadge({ state }: { state: string }) {
  if (state === "IN_USE" || state === "STORED") return null;
  return (
    <Badge tone={state === "SOLD" ? "warning" : "danger"}>
      {state === "SOLD" ? "Sold" : "Junked"}
    </Badge>
  );
}

// Colored kind badge matching the plan spec:
// HDD=blue, SSD=green, SAS=purple, NVMe=teal
function KindBadge({ kind }: { kind: string }) {
  const tone =
    kind === "HDD"
      ? "info"
      : kind === "SSD"
        ? "success"
        : kind === "SAS"
          ? "purple"
          : "accent"; // NVME → teal/accent
  return <Badge tone={tone}>{kind}</Badge>;
}

export type DriveRow = {
  id: string;
  name: string;
  kind: string;
  capacityGB: number;
  purchasePrice: number | null;
  state: string;
  installedIn: string | null;
  bayZoneName: string | null;
  bayNumber: number | null;
};

export function DrivesTable({ drives }: { drives: DriveRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleDelete(drive: DriveRow) {
    if (!window.confirm(`Delete "${drive.name}"? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      await deleteDrive(drive.id);
      addToast(`Deleted ${drive.name}`);
      router.refresh();
    });
  }

  async function handleBulkDelete(ids: string[]) {
    for (const id of ids) await deleteDrive(id);
    addToast(`Deleted ${ids.length} drive${ids.length !== 1 ? "s" : ""}`);
    router.refresh();
  }

  const columns: Column<DriveRow>[] = [
    {
      key: "thumb",
      header: "",
      render: () => <EntityIconThumb type="drive" />,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="flex items-center gap-2">
          <Link
            href={`/drives/${r.id}`}
            className="font-bold text-text hover:text-accent hover:underline"
          >
            {r.name}
          </Link>
          <StateBadge state={r.state} />
        </span>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      hideOnMobile: true,
      sortable: true,
      sortValue: (r) => r.kind,
      render: (r) => <KindBadge kind={r.kind} />,
    },
    {
      key: "capacityGB",
      header: "Capacity",
      sortable: true,
      sortValue: (r) => r.capacityGB,
      render: (r) =>
        r.capacityGB >= 1000
          ? `${(r.capacityGB / 1000).toFixed(r.capacityGB % 1000 === 0 ? 0 : 1)} TB`
          : `${r.capacityGB} GB`,
    },
    {
      key: "priceTB",
      header: "$/TB",
      hideOnMobile: true,
      sortable: true,
      sortValue: (r) =>
        r.purchasePrice != null && r.capacityGB > 0
          ? r.purchasePrice / (r.capacityGB / 1024)
          : Infinity,
      render: (r) => {
        if (r.purchasePrice == null || r.capacityGB === 0) {
          return <span className="text-faint">—</span>;
        }
        const perTB = r.purchasePrice / (r.capacityGB / 1024);
        return (
          <span className="tabular-nums text-text-dim">${perTB.toFixed(2)}</span>
        );
      },
    },
    {
      key: "installedIn",
      header: "Installed in",
      hideOnMobile: true,
      sortable: true,
      sortValue: (r) => r.installedIn ?? "",
      render: (r) => {
        if (!r.installedIn) return <span className="text-faint">Storage</span>;
        const zone = r.bayZoneName
          ? `${r.bayZoneName}${r.bayNumber != null ? ` / bay ${r.bayNumber}` : ""}`
          : null;
        return (
          <span className="flex flex-col">
            <span className="font-medium text-text">{r.installedIn}</span>
            {zone && (
              <span className="text-[11px] text-text-dim">{zone}</span>
            )}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <LinkButton
            href={`/drives/${r.id}/edit`}
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
      rows={drives}
      getRowKey={(r) => r.id}
      emptyState={{ message: "No drives yet.", href: "/drives/new", linkLabel: "Add your first drive" }}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
