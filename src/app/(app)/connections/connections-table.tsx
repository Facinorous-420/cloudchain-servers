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
import { deleteConnection } from "./actions";

export type ConnectionRow = {
  id: string;
  type: string;
  aEndCodename: string;
  aEndAssetId: string;
  aEndLabel: string;
  bEndCodename: string | null;
  bEndAssetId: string | null;
  bEndLabel: string | null;
  cableCategory: string | null;
  isPatch: boolean;
  speed: string | null;
  cableLengthFeet: number | null;
  estimatedCableLengthFeet: number | null;
};

export function ConnectionsTable({
  connections,
}: {
  connections: ConnectionRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleDelete(row: ConnectionRow) {
    if (
      !window.confirm(
        `Delete the ${row.type} link "${row.aEndCodename} ${row.aEndLabel} ↔ ${row.bEndCodename ?? "?"} ${row.bEndLabel ?? "?"}"?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteConnection(row.id);
      addToast(`Deleted connection`);
      router.refresh();
    });
  }

  async function handleBulkDelete(ids: string[]) {
    for (const id of ids) await deleteConnection(id);
    addToast(`Deleted ${ids.length} connection${ids.length !== 1 ? "s" : ""}`);
    router.refresh();
  }

  const columns: Column<ConnectionRow>[] = [
    {
      key: "thumb",
      header: "",
      render: () => <EntityIconThumb type="link" />,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type,
      render: (r) => <Badge tone="accent">{enumLabel(r.type)}</Badge>,
    },
    {
      key: "aEnd",
      header: "A end",
      sortable: true,
      sortValue: (r) => `${r.aEndCodename} ${r.aEndLabel}`,
      render: (r) => (
        <span className="flex flex-col">
          <Link
            href={`/assets/${r.aEndAssetId}`}
            className="font-bold text-text hover:text-accent hover:underline"
          >
            {r.aEndCodename}
          </Link>
          <span className="text-[11.5px] text-text-dim">{r.aEndLabel}</span>
        </span>
      ),
    },
    {
      key: "bEnd",
      header: "B end",
      sortable: true,
      sortValue: (r) => `${r.bEndCodename ?? ""} ${r.bEndLabel ?? ""}`,
      render: (r) =>
        r.bEndAssetId ? (
          <span className="flex flex-col">
            <Link
              href={`/assets/${r.bEndAssetId}`}
              className="font-bold text-text hover:text-accent hover:underline"
            >
              {r.bEndCodename}
            </Link>
            <span className="text-[11.5px] text-text-dim">{r.bEndLabel}</span>
          </span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      key: "cable",
      header: "Cable",
      sortable: true,
      sortValue: (r) => r.cableCategory ?? "",
      render: (r) => (
        <span className="flex flex-wrap items-center gap-1.5">
          {r.cableCategory ? (
            <Badge>{r.cableCategory}</Badge>
          ) : (
            <span className="text-faint">—</span>
          )}
          {r.speed && r.type === "NETWORK" && (
            <Badge tone="accent">{r.speed}</Badge>
          )}
          {r.isPatch && <Badge>Patch</Badge>}
        </span>
      ),
    },
    {
      key: "length",
      header: "Length (ft)",
      sortable: true,
      sortValue: (r) =>
        r.cableLengthFeet ?? r.estimatedCableLengthFeet ?? 0,
      render: (r) => {
        const actual = r.cableLengthFeet;
        const est = r.estimatedCableLengthFeet;
        if (actual != null) {
          return (
            <span>
              {actual}
              {est != null && est !== actual && (
                <span className="ml-1.5 text-[11px] text-text-dim">
                  (est ~{est})
                </span>
              )}
            </span>
          );
        }
        if (est != null) {
          return <span className="text-text-dim">~{est}</span>;
        }
        return <span className="text-faint">—</span>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <LinkButton
            href={`/connections/${r.id}/edit`}
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
      rows={connections}
      getRowKey={(r) => r.id}
      emptyState={{ message: "No connections recorded yet.", href: "/connections/new", linkLabel: "Add your first connection" }}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
