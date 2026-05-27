"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column, type SortState, type EmptyStateDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { enumLabel } from "@/lib/enums";
import { AssetThumb } from "@/components/ui/entity-icon";
import { useToast } from "@/components/ui/toast";
import { deleteAsset } from "./actions";

export type AssetRow = {
  id: string;
  codename: string;
  name: string;
  category: string;
  location: string;
  rackUnits: number | null;
  state: string;
  mainImagePath: string | null;
};

function StateBadge({ state }: { state: string }) {
  if (state === "IN_USE" || state === "STORED") return null;
  const tone = state === "SOLD" ? "warning" : "danger";
  const label = state === "SOLD" ? "Sold" : state === "JUNKED" ? "Junked" : state.replace(/_/g, " ");
  return <Badge tone={tone}>{label}</Badge>;
}

export function AssetsTable({
  assets,
  defaultSort = null,
}: {
  assets: AssetRow[];
  defaultSort?: SortState | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleDelete(asset: AssetRow) {
    if (!window.confirm(`Delete "${asset.codename}"? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      await deleteAsset(asset.id);
      addToast(`Deleted ${asset.codename}`);
      router.refresh();
    });
  }

  async function handleBulkDelete(ids: string[]) {
    for (const id of ids) await deleteAsset(id);
    addToast(`Deleted ${ids.length} asset${ids.length !== 1 ? "s" : ""}`);
    router.refresh();
  }

  const columns: Column<AssetRow>[] = [
    {
      key: "thumb",
      header: "",
      render: (r) => (
        <AssetThumb imagePath={r.mainImagePath} category={r.category} />
      ),
    },
    {
      key: "codename",
      header: "Codename",
      sortable: true,
      sortValue: (r) => r.codename,
      render: (r) => (
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${
              r.state === "IN_USE" ? "bg-status-green" : "bg-faint"
            }`}
            title={r.state === "IN_USE" ? "In use" : "Retired / spare"}
          />
          <Link
            href={`/assets/${r.id}`}
            className="font-bold text-text hover:text-accent hover:underline"
          >
            {r.codename}
          </Link>
          <StateBadge state={r.state} />
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => r.name,
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (r) => r.category,
      render: (r) => <Badge>{enumLabel(r.category)}</Badge>,
    },
    {
      key: "location",
      header: "Location",
      sortable: true,
      sortValue: (r) => r.location,
      render: (r) => enumLabel(r.location),
    },
    {
      key: "rackUnits",
      header: "U",
      sortable: true,
      sortValue: (r) => r.rackUnits ?? 0,
      render: (r) => r.rackUnits ?? "—",
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <LinkButton
            href={`/assets/${r.id}/edit`}
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

  const empty: EmptyStateDef = {
    message: "No assets yet.",
    href: "/assets/new",
    linkLabel: "Add your first asset",
  };

  return (
    <DataTable
      columns={columns}
      rows={assets}
      getRowKey={(r) => r.id}
      emptyState={empty}
      defaultSort={defaultSort}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
