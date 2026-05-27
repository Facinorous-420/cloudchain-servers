import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { computeFinancials } from "@/lib/financials";
import { formatMoney, formatDate } from "@/lib/format";
import { enumLabel } from "@/lib/enums";

export default async function DashboardPage() {
  // All counts + finance summary + recent activity in one round-trip.
  const [
    assetCount,
    driveCount,
    componentCount,
    batteryCount,
    consumableCount,
    licenseCount,
    applicationCount,
    connectionCount,
    rackCount,
    storageCount,
    recentAssets,
    recentDrives,
    recentComponents,
    fin,
  ] = await Promise.all([
    prisma.asset.count(),
    prisma.drive.count(),
    prisma.component.count(),
    prisma.battery.count(),
    prisma.consumable.count(),
    prisma.license.count(),
    prisma.application.count(),
    prisma.connection.count(),
    prisma.rack.count(),
    prisma.storage.count(),
    prisma.asset.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        codename: true,
        name: true,
        category: true,
        updatedAt: true,
        state: true,
      },
    }),
    prisma.drive.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        kind: true,
        capacityGB: true,
        updatedAt: true,
      },
    }),
    prisma.component.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        type: true,
        quantity: true,
        updatedAt: true,
      },
    }),
    computeFinancials(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Dashboard</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Inventory overview for the homelab rack.
          </p>
        </div>
        <LinkButton href="/api/export/xlsx">Export to spreadsheet</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total spent"
          value={formatMoney(fin.spent) ?? "$0"}
          tone="accent"
        />
        <StatCard
          label="Recovered"
          value={formatMoney(fin.recovered) ?? "$0"}
          tone="success"
        />
        <StatCard
          label="Net outlay"
          value={formatMoney(fin.net) ?? "$0"}
          tone="warning"
        />
        <StatCard
          label="Active fleet value"
          value={formatMoney(fin.activeValue) ?? "$0"}
        />
      </div>

      <Panel>
        <PanelHeader title="Inventory counts" />
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-5">
          {[
            { label: "Assets", value: assetCount, href: "/assets" },
            { label: "Drives", value: driveCount, href: "/drives" },
            {
              label: "Components",
              value: componentCount,
              href: "/components",
            },
            { label: "Batteries", value: batteryCount, href: "/batteries" },
            {
              label: "Consumables",
              value: consumableCount,
              href: "/consumables",
            },
            { label: "Licenses", value: licenseCount, href: "/licenses" },
            {
              label: "Applications",
              value: applicationCount,
              href: "/applications",
            },
            {
              label: "Connections",
              value: connectionCount,
              href: "/connections",
            },
            { label: "Racks", value: rackCount, href: "/racks" },
            { label: "Storages", value: storageCount, href: "/storages" },
          ].map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-md border border-border/40 bg-panel-2 px-3 py-2.5 transition-colors hover:border-accent/40"
            >
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-text-dim">
                {c.label}
              </p>
              <p className="mt-0.5 text-xl font-black">{c.value}</p>
            </Link>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Recent assets"
            description="Last 6 assets touched."
          />
          {recentAssets.length === 0 ? (
            <p className="px-5 py-6 text-center text-[12px] text-faint">
              No assets yet — add one to get started.
            </p>
          ) : (
            <ul className="flex flex-col">
              {recentAssets.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between border-b border-border/30 px-5 py-2.5 text-[13px] last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`inline-block h-2 w-2 rounded-full ${
                        a.state === "IN_USE" ? "bg-status-green" : "bg-faint"
                      }`}
                    />
                    <Link
                      href={`/assets/${a.id}`}
                      className="font-bold text-text hover:text-accent hover:underline"
                    >
                      {a.codename}
                    </Link>
                    <Badge>{enumLabel(a.category)}</Badge>
                    <span className="text-text-dim">— {a.name}</span>
                  </div>
                  <span className="text-[11px] text-text-dim">
                    {formatDate(a.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent drives & components"
            description="Last 5 of each, combined."
          />
          {recentDrives.length === 0 && recentComponents.length === 0 ? (
            <p className="px-5 py-6 text-center text-[12px] text-faint">
              None yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {recentDrives.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between border-b border-border/30 px-5 py-2.5 text-[13px] last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">Drive</Badge>
                    <Link
                      href={`/drives/${d.id}`}
                      className="font-bold text-text hover:text-accent hover:underline"
                    >
                      {d.name}
                    </Link>
                    <span className="text-text-dim">
                      — {d.kind} · {d.capacityGB} GB
                    </span>
                  </div>
                  <span className="text-[11px] text-text-dim">
                    {formatDate(d.updatedAt)}
                  </span>
                </li>
              ))}
              {recentComponents.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between border-b border-border/30 px-5 py-2.5 text-[13px] last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge>{enumLabel(c.type)}</Badge>
                    <Link
                      href={`/components/${c.id}`}
                      className="font-bold text-text hover:text-accent hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className="text-text-dim">× {c.quantity}</span>
                  </div>
                  <span className="text-[11px] text-text-dim">
                    {formatDate(c.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
