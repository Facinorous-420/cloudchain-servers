import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { BatteriesTable } from "./batteries-table";

export default async function BatteriesPage({
  searchParams,
}: {
  searchParams: Promise<{ showRetired?: string }>;
}) {
  const { showRetired } = await searchParams;
  const showRetiredBool = showRetired === "1";

  const batteries = await prisma.battery.findMany({
    where: showRetiredBool
      ? undefined
      : { state: { notIn: ["SOLD", "JUNKED"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      manufacturer: true,
      quantity: true,
      state: true,
      installedIn: { select: { codename: true } },
    },
  });
  const rows = batteries.map((b) => ({
    id: b.id,
    name: b.name,
    manufacturer: b.manufacturer,
    quantity: b.quantity,
    state: b.state,
    installedIn: b.installedIn?.codename ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Batteries</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Batteries inside UPS units.
          </p>
        </div>
        <LinkButton href="/batteries/new" variant="primary">
          New battery
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail showRetired={showRetiredBool} />
        <Panel className="flex-1 overflow-hidden">
          <BatteriesTable batteries={rows} />
        </Panel>
      </div>
    </div>
  );
}
