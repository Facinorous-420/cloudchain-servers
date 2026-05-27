import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { ComponentsTable } from "./components-table";

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<{ showRetired?: string }>;
}) {
  const { showRetired } = await searchParams;
  const showRetiredBool = showRetired === "1";

  const components = await prisma.component.findMany({
    where: showRetiredBool
      ? undefined
      : { state: { notIn: ["SOLD", "JUNKED"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      quantity: true,
      state: true,
      installedIn: { select: { codename: true } },
    },
  });
  const rows = components.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    quantity: c.quantity,
    state: c.state,
    installedIn: c.installedIn?.codename ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Components</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            RAM, caddies, RAID cards, rails, and other parts.
          </p>
        </div>
        <LinkButton href="/components/new" variant="primary">
          New component
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail showRetired={showRetiredBool} />
        <Panel className="flex-1 overflow-hidden">
          <ComponentsTable components={rows} />
        </Panel>
      </div>
    </div>
  );
}
