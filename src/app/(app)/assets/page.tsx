import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { FilterRail, type FilterDef } from "@/components/ui/filter-rail";
import { LinkButton } from "@/components/ui/button";
import { AssetsTable } from "./assets-table";
import type { SortState } from "@/components/ui/data-table";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    showRetired?: string;
    noConnections?: string;
    missingPower?: string;
    missingData?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}) {
  const sp = await searchParams;
  const showRetired = sp.showRetired === "1";
  const filterNoConn = sp.noConnections === "1";
  const filterMissingPower = sp.missingPower === "1";
  const filterMissingData = sp.missingData === "1";
  const defaultSort: SortState | null =
    sp.sortBy && (sp.sortDir === "asc" || sp.sortDir === "desc")
      ? { key: sp.sortBy, dir: sp.sortDir }
      : null;

  const notRetired: Prisma.AssetWhereInput = showRetired
    ? {}
    : { state: { notIn: ["SOLD", "JUNKED"] } };

  const activeFilter: Prisma.AssetWhereInput = filterNoConn
    ? { connectionsA: { none: {} }, connectionsB: { none: {} } }
    : filterMissingPower
      ? {
          category: { in: ["SERVER", "NUC", "SBC"] },
          connectionsA: { none: { type: "POWER" } },
          connectionsB: { none: { type: "POWER" } },
        }
      : filterMissingData
        ? {
            category: { in: ["SERVER", "NUC", "SBC", "SWITCH", "ACCESS_POINT"] },
            connectionsA: { none: { type: "NETWORK" } },
            connectionsB: { none: { type: "NETWORK" } },
          }
        : {};

  const where: Prisma.AssetWhereInput = { AND: [notRetired, activeFilter] };

  const [assets, noConnCount, missingPowerCount, missingDataCount] =
    await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { codename: "asc" },
        select: {
          id: true,
          codename: true,
          name: true,
          category: true,
          location: true,
          rackUnits: true,
          state: true,
          images: {
            where: { isMain: true },
            select: { path: true },
            take: 1,
          },
        },
      }),
      prisma.asset.count({
        where: {
          AND: [
            notRetired,
            {
              state: "IN_USE",
              connectionsA: { none: {} },
              connectionsB: { none: {} },
            },
          ],
        },
      }),
      prisma.asset.count({
        where: {
          AND: [
            notRetired,
            {
              category: { in: ["SERVER", "NUC", "SBC"] },
              connectionsA: { none: { type: "POWER" } },
              connectionsB: { none: { type: "POWER" } },
            },
          ],
        },
      }),
      prisma.asset.count({
        where: {
          AND: [
            notRetired,
            {
              category: { in: ["SERVER", "NUC", "SBC", "SWITCH", "ACCESS_POINT"] },
              connectionsA: { none: { type: "NETWORK" } },
              connectionsB: { none: { type: "NETWORK" } },
            },
          ],
        },
      }),
    ]);

  const assetRows = assets.map((a) => ({
    id: a.id,
    codename: a.codename,
    name: a.name,
    category: a.category,
    location: a.location,
    rackUnits: a.rackUnits,
    state: a.state,
    mainImagePath: a.images[0]?.path ?? null,
  }));

  const filters: FilterDef[] = [
    { key: "noConnections", label: "No connections", count: noConnCount },
    { key: "missingPower", label: "Missing power", count: missingPowerCount },
    { key: "missingData", label: "Missing data link", count: missingDataCount },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Assets</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Servers, switches, UPS units, and other top-level rack gear.
          </p>
        </div>
        <LinkButton href="/assets/new" variant="primary">
          New asset
        </LinkButton>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <FilterRail showRetired={showRetired} filters={filters} />
        <Panel className="flex-1 overflow-hidden">
          <AssetsTable assets={assetRows} defaultSort={defaultSort} />
        </Panel>
      </div>
    </div>
  );
}
