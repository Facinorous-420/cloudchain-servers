import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail, type FilterDef } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { DrivesTable } from "./drives-table";

export default async function DrivesPage({
  searchParams,
}: {
  searchParams: Promise<{
    showRetired?: string;
    unallocated?: string;
  }>;
}) {
  const sp = await searchParams;
  const showRetired = sp.showRetired === "1";
  const filterUnallocated = sp.unallocated === "1";

  const notRetired: Prisma.DriveWhereInput = showRetired
    ? {}
    : { state: { notIn: ["SOLD", "JUNKED"] } };

  const where: Prisma.DriveWhereInput = {
    AND: [notRetired, ...(filterUnallocated ? [{ installedInId: null }] : [])],
  };

  const [drives, unallocatedCount] = await Promise.all([
    prisma.drive.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        kind: true,
        capacityGB: true,
        purchasePrice: true,
        state: true,
        installedIn: { select: { codename: true } },
        bayZone: { select: { name: true } },
        bayNumber: true,
      },
    }),
    prisma.drive.count({
      where: { AND: [notRetired, { installedInId: null }] },
    }),
  ]);

  const rows = drives.map((d) => ({
    id: d.id,
    name: d.name,
    kind: d.kind,
    capacityGB: d.capacityGB,
    purchasePrice: d.purchasePrice ? Number(d.purchasePrice) : null,
    state: d.state,
    installedIn: d.installedIn?.codename ?? null,
    bayZoneName: d.bayZone?.name ?? null,
    bayNumber: d.bayNumber,
  }));

  const filters: FilterDef[] = [
    { key: "unallocated", label: "Unallocated (storage)", count: unallocatedCount },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Drives</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Hard drives and SSDs, installed or in storage.
          </p>
        </div>
        <LinkButton href="/drives/new" variant="primary">
          New drive
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail showRetired={showRetired} filters={filters} />
        <Panel className="flex-1 overflow-hidden">
          <DrivesTable drives={rows} />
        </Panel>
      </div>
    </div>
  );
}
