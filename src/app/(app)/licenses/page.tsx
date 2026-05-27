import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { dateInput } from "@/lib/format";
import { LicensesTable } from "./licenses-table";

export default async function LicensesPage() {
  const licenses = await prisma.license.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      seats: true,
      renewalDate: true,
      _count: { select: { assignments: true } },
    },
  });
  const rows = licenses.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    seats: l.seats,
    renewalDate: l.renewalDate ? dateInput(l.renewalDate) : null,
    assignmentCount: l._count.assignments,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Licenses</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Software and service licenses, assignable to multiple assets.
          </p>
        </div>
        <LinkButton href="/licenses/new" variant="primary">
          New license
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail />
        <Panel className="flex-1 overflow-hidden">
          <LicensesTable licenses={rows} />
        </Panel>
      </div>
    </div>
  );
}
