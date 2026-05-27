import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { ConnectionsTable } from "./connections-table";

export default async function ConnectionsPage() {
  const connections = await prisma.connection.findMany({
    orderBy: [{ type: "asc" }, { aEndAssetId: "asc" }],
    select: {
      id: true,
      type: true,
      aEndLabel: true,
      bEndLabel: true,
      cableCategory: true,
      isPatch: true,
      speed: true,
      cableLengthFeet: true,
      estimatedCableLengthFeet: true,
      aEnd: { select: { id: true, codename: true } },
      bEnd: { select: { id: true, codename: true } },
    },
  });

  const rows = connections.map((c) => ({
    id: c.id,
    type: c.type,
    aEndCodename: c.aEnd.codename,
    aEndAssetId: c.aEnd.id,
    aEndLabel: c.aEndLabel,
    bEndCodename: c.bEnd?.codename ?? null,
    bEndAssetId: c.bEnd?.id ?? null,
    bEndLabel: c.bEndLabel,
    cableCategory: c.cableCategory,
    isPatch: c.isPatch,
    speed: c.speed,
    cableLengthFeet: c.cableLengthFeet,
    estimatedCableLengthFeet: c.estimatedCableLengthFeet,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Connections</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Network, power, KVM, and console links between assets. Estimates
            are based on rack position + port side.
          </p>
        </div>
        <LinkButton href="/connections/new" variant="primary">
          New connection
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail />
        <Panel className="flex-1 overflow-hidden">
          <ConnectionsTable connections={rows} />
        </Panel>
      </div>
    </div>
  );
}
