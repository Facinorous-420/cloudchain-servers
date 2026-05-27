import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, dateInput } from "@/lib/format";
import { computeFinancials } from "@/lib/financials";
import { enumLabel } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import {
  CategoryBarChart,
  SourceBarChart,
  SpentVsRecoveredChart,
} from "./financial-charts";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "assets", label: "Assets" },
  { key: "drives", label: "Drives" },
  { key: "licenses", label: "Licenses" },
  { key: "sold", label: "Sold & Junked" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function TabNav({ active }: { active: TabKey }) {
  return (
    <div className="flex w-fit overflow-hidden rounded-lg border border-border bg-panel-2">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/financials?tab=${t.key}`}
          className={`px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
            active === t.key
              ? "bg-border/60 text-accent"
              : "text-text-dim hover:text-accent"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "overview") as TabKey;
  const fin = await computeFinancials();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">Financials</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Computed live from every entity&apos;s purchase price, sold price,
            and license cost. Never a stored rollup.
          </p>
        </div>
        <LinkButton href="/api/export/xlsx">Export to spreadsheet</LinkButton>
      </div>

      <TabNav active={tab} />

      {/* Summary stat cards — always visible */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total spent"
          value={formatMoney(fin.spent) ?? "$0"}
          tone="accent"
          hint="Sum of purchase prices across all entities."
        />
        <StatCard
          label="Recovered"
          value={formatMoney(fin.recovered) ?? "$0"}
          tone="success"
          hint="From sold assets."
        />
        <StatCard
          label="Net outlay"
          value={formatMoney(fin.net) ?? "$0"}
          tone="warning"
          hint="Spent minus recovered."
        />
        <StatCard
          label="Active fleet value"
          value={formatMoney(fin.activeValue) ?? "$0"}
          hint="Purchase cost of items currently in use / installed."
        />
      </div>

      {tab === "overview" && <OverviewTab fin={fin} />}
      {tab === "assets" && <AssetsTab />}
      {tab === "drives" && <DrivesTab />}
      {tab === "licenses" && <LicensesTab />}
      {tab === "sold" && <SoldTab />}
    </div>
  );
}

function OverviewTab({ fin }: { fin: Awaited<ReturnType<typeof computeFinancials>> }) {
  const totalRows: { label: string; value: number }[] = [
    { label: "Assets", value: fin.totals.assets },
    { label: "Racks", value: fin.totals.racks },
    { label: "Drives", value: fin.totals.drives },
    { label: "Components", value: fin.totals.components },
    { label: "Batteries", value: fin.totals.batteries },
    { label: "Consumables", value: fin.totals.consumables },
    { label: "Licenses", value: fin.totals.licenses },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Spent vs recovered"
            description="Side-by-side outlay and recovery."
          />
          <div className="p-3">
            <SpentVsRecoveredChart
              spent={fin.spent}
              recovered={fin.recovered}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Spend by entity type"
            description="Where every dollar went."
          />
          <div className="px-5 py-4">
            <table className="w-full text-[13px]">
              <tbody>
                {totalRows.map((r) => (
                  <tr
                    key={r.label}
                    className="border-b border-border/30 last:border-b-0"
                  >
                    <td className="py-1.5 text-text-dim">{r.label}</td>
                    <td className="py-1.5 text-right font-bold">
                      {formatMoney(r.value) ?? "—"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="pt-2 text-[10px] font-bold uppercase tracking-wider text-text-dim">
                    Total
                  </td>
                  <td className="pt-2 text-right text-base font-black text-accent">
                    {formatMoney(fin.spent) ?? "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Spend by asset category"
            description="Per-category asset purchase outlay."
          />
          <div className="p-3">
            {fin.byCategory.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] text-faint">
                No asset spend recorded yet.
              </p>
            ) : (
              <CategoryBarChart data={fin.byCategory} />
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Spend by source"
            description="Top vendors and marketplaces (max 10)."
          />
          <div className="p-3">
            {fin.bySource.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] text-faint">
                No purchase sources recorded yet.
              </p>
            ) : (
              <SourceBarChart data={fin.bySource} />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

async function AssetsTab() {
  const assets = await prisma.asset.findMany({
    where: { state: { notIn: ["SOLD", "JUNKED"] } },
    orderBy: { codename: "asc" },
    select: {
      id: true,
      codename: true,
      name: true,
      category: true,
      purchaseDate: true,
      purchasePrice: true,
      purchasePriceBeforeShip: true,
      purchasedFrom: true,
      state: true,
    },
  });

  const total = assets.reduce(
    (s, a) => s + (a.purchasePrice ? Number(a.purchasePrice) : 0),
    0,
  );

  return (
    <Panel>
      <PanelHeader
        title="Assets"
        description={`${assets.length} active assets · ${formatMoney(total) ?? "$0"} total purchase outlay`}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="px-4 py-2.5 text-left">Codename</th>
              <th className="px-4 py-2.5 text-left">Category</th>
              <th className="px-4 py-2.5 text-left">Source</th>
              <th className="px-4 py-2.5 text-right">Purchase price</th>
              <th className="px-4 py-2.5 text-right">+Shipping</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-faint">
                  No assets recorded yet.{" "}
                  <Link href="/assets/new" className="text-accent hover:underline">
                    Create one
                  </Link>
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/30 last:border-b-0 hover:bg-panel-2"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/assets/${a.id}`}
                      className="font-bold text-text hover:text-accent hover:underline"
                    >
                      {a.codename}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Badge>{enumLabel(a.category)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-text-dim">
                    {a.purchasedFrom ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {a.purchasePrice ? formatMoney(Number(a.purchasePrice)) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-dim">
                    {a.purchasePriceBeforeShip
                      ? formatMoney(Number(a.purchasePriceBeforeShip))
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {assets.length > 0 && (
            <tfoot>
              <tr className="border-t border-border">
                <td
                  colSpan={3}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-text-dim"
                >
                  Total
                </td>
                <td className="px-4 py-2 text-right font-black text-accent">
                  {formatMoney(total) ?? "—"}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Panel>
  );
}

async function DrivesTab() {
  const drives = await prisma.drive.findMany({
    where: { state: { notIn: ["SOLD", "JUNKED"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      kind: true,
      capacityGB: true,
      purchasePrice: true,
      purchasedFrom: true,
      installedIn: { select: { codename: true } },
    },
  });

  const total = drives.reduce(
    (s, d) => s + (d.purchasePrice ? Number(d.purchasePrice) : 0),
    0,
  );

  function fmtCap(gb: number) {
    return gb >= 1000
      ? `${(gb / 1000).toFixed(gb % 1000 === 0 ? 0 : 1)} TB`
      : `${gb} GB`;
  }

  function priceTB(price: number | null, gb: number) {
    if (!price || gb === 0) return null;
    return price / (gb / 1024);
  }

  return (
    <Panel>
      <PanelHeader
        title="Drives"
        description={`${drives.length} active drives · ${formatMoney(total) ?? "$0"} total purchase outlay`}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="px-4 py-2.5 text-left">Drive</th>
              <th className="px-4 py-2.5 text-left">Kind</th>
              <th className="px-4 py-2.5 text-right">Capacity</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">$/TB</th>
              <th className="px-4 py-2.5 text-left">Installed in</th>
            </tr>
          </thead>
          <tbody>
            {drives.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-faint">
                  No drives recorded yet.{" "}
                  <Link href="/drives/new" className="text-accent hover:underline">
                    Create one
                  </Link>
                </td>
              </tr>
            ) : (
              drives.map((d) => {
                const price = d.purchasePrice ? Number(d.purchasePrice) : null;
                const ptb = priceTB(price, d.capacityGB);
                return (
                  <tr
                    key={d.id}
                    className="border-b border-border/30 last:border-b-0 hover:bg-panel-2"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/drives/${d.id}`}
                        className="font-bold text-text hover:text-accent hover:underline"
                      >
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        tone={
                          d.kind === "HDD"
                            ? "info"
                            : d.kind === "SSD"
                              ? "success"
                              : d.kind === "SAS"
                                ? "purple"
                                : "accent"
                        }
                      >
                        {d.kind}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {fmtCap(d.capacityGB)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {price ? formatMoney(price) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-text-dim">
                      {ptb ? `$${ptb.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-text-dim">
                      {d.installedIn?.codename ?? (
                        <span className="text-faint">Storage</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {drives.length > 0 && (
            <tfoot>
              <tr className="border-t border-border">
                <td
                  colSpan={3}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-text-dim"
                >
                  Total
                </td>
                <td className="px-4 py-2 text-right font-black text-accent">
                  {formatMoney(total) ?? "—"}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Panel>
  );
}

async function LicensesTab() {
  const licenses = await prisma.license.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      seats: true,
      renewalPeriod: true,
      renewalDate: true,
      cost: true,
      purchasedFrom: true,
      _count: { select: { assignments: true } },
    },
  });

  const totalCost = licenses.reduce(
    (s, l) => s + (l.cost ? Number(l.cost) : 0),
    0,
  );

  const annualCost = licenses.reduce((s, l) => {
    if (!l.cost || !l.renewalPeriod || l.renewalPeriod === "PERPETUAL") return s;
    const MULTIPLIER: Record<string, number> = {
      ANNUAL: 1, BI_ANNUAL: 2, QUARTERLY: 4, MONTHLY: 12,
      WEEKLY: 52, DAILY: 365, TWO_YEARS: 0.5, FIVE_YEARS: 0.2, TEN_YEARS: 0.1,
    };
    const m = MULTIPLIER[l.renewalPeriod] ?? 1;
    return s + Number(l.cost) * m;
  }, 0);

  const today = new Date();
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  return (
    <Panel>
      <PanelHeader
        title="Licenses"
        description={`${licenses.length} licenses · ${formatMoney(totalCost) ?? "$0"} total · ~${formatMoney(annualCost) ?? "$0"}/yr recurring`}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="px-4 py-2.5 text-left">License</th>
              <th className="px-4 py-2.5 text-left">Type</th>
              <th className="px-4 py-2.5 text-right">Seats</th>
              <th className="px-4 py-2.5 text-right">Cost</th>
              <th className="px-4 py-2.5 text-left">Period</th>
              <th className="px-4 py-2.5 text-left">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {licenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-faint">
                  No licenses recorded yet.{" "}
                  <Link href="/licenses/new" className="text-accent hover:underline">
                    Create one
                  </Link>
                </td>
              </tr>
            ) : (
              licenses.map((l) => {
                const expiring =
                  l.renewalDate && l.renewalDate <= in30 && l.renewalDate >= today;
                return (
                  <tr
                    key={l.id}
                    className="border-b border-border/30 last:border-b-0 hover:bg-panel-2"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/licenses/${l.id}`}
                        className="font-bold text-text hover:text-accent hover:underline"
                      >
                        {l.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-text-dim">{l.type ?? "—"}</td>
                    <td className="px-4 py-2 text-right">
                      {l.seats != null ? (
                        <span>
                          {l._count.assignments}/{l.seats}
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {l.cost ? formatMoney(Number(l.cost)) : "—"}
                    </td>
                    <td className="px-4 py-2 text-text-dim">
                      {l.renewalPeriod ? enumLabel(l.renewalPeriod) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {l.renewalDate ? (
                        <span
                          className={expiring ? "font-bold text-yellow-400" : "text-text-dim"}
                        >
                          {dateInput(l.renewalDate)}
                          {expiring && " ⚠"}
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

async function SoldTab() {
  const [soldAssets, soldDrives, soldComponents] = await Promise.all([
    prisma.asset.findMany({
      where: { state: { in: ["SOLD", "JUNKED"] } },
      orderBy: { soldDate: "desc" },
      select: {
        id: true,
        codename: true,
        name: true,
        category: true,
        state: true,
        soldDate: true,
        soldPrice: true,
        purchasePrice: true,
      },
    }),
    prisma.drive.findMany({
      where: { state: { in: ["SOLD", "JUNKED"] } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        kind: true,
        state: true,
        soldDate: true,
        soldPrice: true,
        purchasePrice: true,
      },
    }),
    prisma.component.findMany({
      where: { state: { in: ["SOLD", "JUNKED"] } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        state: true,
        soldDate: true,
        soldPrice: true,
        purchasePrice: true,
      },
    }),
  ]);

  const totalRecovered =
    soldAssets.reduce((s, a) => s + (a.soldPrice ? Number(a.soldPrice) : 0), 0) +
    soldDrives.reduce((s, d) => s + (d.soldPrice ? Number(d.soldPrice) : 0), 0) +
    soldComponents.reduce(
      (s, c) => s + (c.soldPrice ? Number(c.soldPrice) : 0),
      0,
    );

  const totalPaid =
    soldAssets.reduce(
      (s, a) => s + (a.purchasePrice ? Number(a.purchasePrice) : 0),
      0,
    ) +
    soldDrives.reduce(
      (s, d) => s + (d.purchasePrice ? Number(d.purchasePrice) : 0),
      0,
    ) +
    soldComponents.reduce(
      (s, c) => s + (c.purchasePrice ? Number(c.purchasePrice) : 0),
      0,
    );

  function StateChip({ state }: { state: string }) {
    return (
      <Badge tone={state === "SOLD" ? "warning" : "danger"}>
        {state === "SOLD" ? "Sold" : "Junked"}
      </Badge>
    );
  }

  const empty =
    soldAssets.length === 0 && soldDrives.length === 0 && soldComponents.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {empty ? (
        <Panel>
          <div className="px-6 py-10 text-center text-faint text-[12px]">
            Nothing sold or junked yet.
          </div>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Originally paid"
              value={formatMoney(totalPaid) ?? "$0"}
              hint="Sum of purchase prices for items that were later sold or junked."
            />
            <StatCard
              label="Recovered"
              value={formatMoney(totalRecovered) ?? "$0"}
              tone="success"
              hint="Sum of sold prices across all disposed items."
            />
          </div>

          {soldAssets.length > 0 && (
            <Panel>
              <PanelHeader title="Assets" description="Sold or junked assets" />
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                    <th className="px-4 py-2.5 text-left">Codename</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Category</th>
                    <th className="px-4 py-2.5 text-right">Paid</th>
                    <th className="px-4 py-2.5 text-right">Recovered</th>
                    <th className="px-4 py-2.5 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {soldAssets.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border/30 last:border-b-0 hover:bg-panel-2"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/assets/${a.id}`}
                          className="font-bold text-text hover:text-accent hover:underline"
                        >
                          {a.codename}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <StateChip state={a.state} />
                      </td>
                      <td className="px-4 py-2 text-text-dim">
                        {enumLabel(a.category)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {a.purchasePrice ? formatMoney(Number(a.purchasePrice)) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {a.soldPrice ? formatMoney(Number(a.soldPrice)) : "—"}
                      </td>
                      <td className="px-4 py-2 text-text-dim">
                        {a.soldDate ? dateInput(a.soldDate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          {soldDrives.length > 0 && (
            <Panel>
              <PanelHeader title="Drives" description="Sold or junked drives" />
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                    <th className="px-4 py-2.5 text-left">Drive</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-right">Paid</th>
                    <th className="px-4 py-2.5 text-right">Recovered</th>
                    <th className="px-4 py-2.5 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {soldDrives.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-border/30 last:border-b-0 hover:bg-panel-2"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/drives/${d.id}`}
                          className="font-bold text-text hover:text-accent hover:underline"
                        >
                          {d.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <StateChip state={d.state} />
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {d.purchasePrice ? formatMoney(Number(d.purchasePrice)) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {d.soldPrice ? formatMoney(Number(d.soldPrice)) : "—"}
                      </td>
                      <td className="px-4 py-2 text-text-dim">
                        {d.soldDate ? dateInput(d.soldDate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          {soldComponents.length > 0 && (
            <Panel>
              <PanelHeader
                title="Components"
                description="Sold or junked components"
              />
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                    <th className="px-4 py-2.5 text-left">Component</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Type</th>
                    <th className="px-4 py-2.5 text-right">Paid</th>
                    <th className="px-4 py-2.5 text-right">Recovered</th>
                  </tr>
                </thead>
                <tbody>
                  {soldComponents.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/30 last:border-b-0 hover:bg-panel-2"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/components/${c.id}`}
                          className="font-bold text-text hover:text-accent hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <StateChip state={c.state} />
                      </td>
                      <td className="px-4 py-2 text-text-dim">
                        {enumLabel(c.type)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {c.purchasePrice ? formatMoney(Number(c.purchasePrice)) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {c.soldPrice ? formatMoney(Number(c.soldPrice)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
