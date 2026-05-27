import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { StoragesTable } from "./storages-table";

export default async function StoragesPage() {
  const storages = await prisma.storage.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      notes: true,
      _count: { select: { assets: true } },
    },
  });
  const rows = storages.map((s) => ({
    id: s.id,
    name: s.name,
    notes: s.notes,
    assetCount: s._count.assets,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Storages</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Named containers for off-rack inventory (Box 1, Shelf A, …).
          </p>
        </div>
        <LinkButton href="/storages/new" variant="primary">
          New storage
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail />
        <Panel className="flex-1 overflow-hidden">
          <StoragesTable storages={rows} />
        </Panel>
      </div>
    </div>
  );
}
