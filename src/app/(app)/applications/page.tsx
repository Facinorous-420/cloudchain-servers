import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { ApplicationsTable } from "./applications-table";

export default async function ApplicationsPage() {
  const apps = await prisma.application.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      operatingSystem: true,
      status: true,
      host: { select: { id: true, codename: true } },
    },
  });
  const rows = apps.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    operatingSystem: a.operatingSystem,
    status: a.status,
    hostId: a.host.id,
    hostCodename: a.host.codename,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Applications</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Services, VMs, and containers running on servers.
          </p>
        </div>
        <LinkButton href="/applications/new" variant="primary">
          New application
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail />
        <Panel className="flex-1 overflow-hidden">
          <ApplicationsTable applications={rows} />
        </Panel>
      </div>
    </div>
  );
}
