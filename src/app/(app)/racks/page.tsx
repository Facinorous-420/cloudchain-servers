import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { RacksTable } from "./racks-table";

export default async function RacksPage() {
  const racks = await prisma.rack.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      totalU: true,
      manufacturer: true,
      _count: { select: { assets: true } },
    },
  });
  const rows = racks.map((r) => ({
    id: r.id,
    name: r.name,
    totalU: r.totalU,
    manufacturer: r.manufacturer,
    assetCount: r._count.assets,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Racks</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Physical racks. The interactive rack diagram comes in Phases 8–9.
          </p>
        </div>
        <LinkButton href="/racks/new" variant="primary">
          New rack
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail />
        <Panel className="flex-1 overflow-hidden">
          <RacksTable racks={rows} />
        </Panel>
      </div>
    </div>
  );
}
