import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { ConsumablesTable } from "./consumables-table";

export default async function ConsumablesPage({
  searchParams,
}: {
  searchParams: Promise<{ showRetired?: string }>;
}) {
  const { showRetired } = await searchParams;
  const showRetiredBool = showRetired === "1";

  const consumables = await prisma.consumable.findMany({
    where: showRetiredBool
      ? undefined
      : { state: { notIn: ["SOLD", "JUNKED", "USED_UP"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      quantity: true,
      state: true,
      location: true,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Consumables</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Cables, thermal paste, and other miscellaneous supplies.
          </p>
        </div>
        <LinkButton href="/consumables/new" variant="primary">
          New consumable
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail showRetired={showRetiredBool} />
        <Panel className="flex-1 overflow-hidden">
          <ConsumablesTable consumables={consumables} />
        </Panel>
      </div>
    </div>
  );
}
