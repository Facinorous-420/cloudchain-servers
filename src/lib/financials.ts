import { prisma } from "@/lib/prisma";

// Financials are always computed on demand from the source tables — CLAUDE.md
// §4 forbids a stored Financials table because the old spreadsheet's stored
// rollups went stale and printed #REF!. Everything here is a fresh aggregate
// on each call.

type DecimalLike = { toString(): string } | null | undefined;

function n(d: DecimalLike): number {
  if (d == null) return 0;
  const v = Number(d.toString());
  return Number.isNaN(v) ? 0 : v;
}

function bucketAdd(map: Map<string, number>, key: string, amount: number) {
  if (amount === 0) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

export type Financials = Awaited<ReturnType<typeof computeFinancials>>;

export async function computeFinancials() {
  const [assets, racks, drives, components, batteries, consumables, licenses] =
    await Promise.all([
      prisma.asset.findMany({
        select: {
          category: true,
          purchasePrice: true,
          purchasePriceBeforeShip: true,
          soldPrice: true,
          purchasedFrom: true,
          state: true,
        },
      }),
      prisma.rack.findMany({
        select: { purchasePrice: true, purchasedFrom: true, inUse: true },
      }),
      prisma.drive.findMany({
        select: {
          purchasePrice: true,
          purchasedFrom: true,
          installedInId: true,
        },
      }),
      prisma.component.findMany({
        select: {
          type: true,
          quantity: true,
          purchasePrice: true,
          purchasedFrom: true,
          installedInId: true,
        },
      }),
      prisma.battery.findMany({
        select: {
          quantity: true,
          purchasePrice: true,
          purchasedFrom: true,
          installedInId: true,
        },
      }),
      prisma.consumable.findMany({
        select: { quantity: true, purchasePrice: true, purchasedFrom: true },
      }),
      prisma.license.findMany({
        select: { cost: true, purchasedFrom: true, type: true },
      }),
    ]);

  // Per-entity totals: each is purchase outlay summed across rows. Component
  // and battery rows can represent a quantity > 1 (e.g. 4 sticks of RAM at
  // $20 each) — for the per-row outlay we treat purchasePrice as the cost of
  // the *entry* (matching how it was entered on the form), not per-unit.
  const totals = {
    assets: assets.reduce((s, r) => s + n(r.purchasePrice), 0),
    racks: racks.reduce((s, r) => s + n(r.purchasePrice), 0),
    drives: drives.reduce((s, r) => s + n(r.purchasePrice), 0),
    components: components.reduce((s, r) => s + n(r.purchasePrice), 0),
    batteries: batteries.reduce((s, r) => s + n(r.purchasePrice), 0),
    consumables: consumables.reduce((s, r) => s + n(r.purchasePrice), 0),
    licenses: licenses.reduce((s, r) => s + n(r.cost), 0),
  };
  const spent =
    totals.assets +
    totals.racks +
    totals.drives +
    totals.components +
    totals.batteries +
    totals.consumables +
    totals.licenses;

  const recovered = assets.reduce((s, r) => s + n(r.soldPrice), 0);
  const net = spent - recovered;

  // Active (in-fleet) value: items still in use. For assets, state === IN_USE.
  // For installable items, having an installedInId means the item lives in the fleet.
  const activeAssetValue = assets
    .filter((a) => a.state === "IN_USE")
    .reduce((s, r) => s + n(r.purchasePrice), 0);
  const activeDriveValue = drives
    .filter((d) => d.installedInId != null)
    .reduce((s, r) => s + n(r.purchasePrice), 0);
  const activeComponentValue = components
    .filter((c) => c.installedInId != null)
    .reduce((s, r) => s + n(r.purchasePrice), 0);
  const activeBatteryValue = batteries
    .filter((b) => b.installedInId != null)
    .reduce((s, r) => s + n(r.purchasePrice), 0);
  const activeValue =
    activeAssetValue +
    activeDriveValue +
    activeComponentValue +
    activeBatteryValue;

  // Per-asset-category breakdown — drives a chart showing where the asset
  // spend went (servers vs switches vs UPS, etc.).
  const byCategory = new Map<string, number>();
  for (const a of assets) bucketAdd(byCategory, a.category, n(a.purchasePrice));

  // Per-purchase-source breakdown — drives a chart showing which vendor /
  // marketplace got the spend.
  const bySource = new Map<string, number>();
  const visitSource = (src: string | null, amount: number) =>
    bucketAdd(bySource, src && src.trim() ? src.trim() : "Unknown", amount);
  for (const a of assets) visitSource(a.purchasedFrom, n(a.purchasePrice));
  for (const r of racks) visitSource(r.purchasedFrom, n(r.purchasePrice));
  for (const d of drives) visitSource(d.purchasedFrom, n(d.purchasePrice));
  for (const c of components) visitSource(c.purchasedFrom, n(c.purchasePrice));
  for (const b of batteries) visitSource(b.purchasedFrom, n(b.purchasePrice));
  for (const c of consumables) visitSource(c.purchasedFrom, n(c.purchasePrice));
  for (const l of licenses) visitSource(l.purchasedFrom, n(l.cost));

  return {
    totals,
    spent,
    recovered,
    net,
    activeValue,
    counts: {
      assets: assets.length,
      racks: racks.length,
      drives: drives.length,
      components: components.length,
      batteries: batteries.length,
      consumables: consumables.length,
      licenses: licenses.length,
    },
    byCategory: Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    bySource: Array.from(bySource.entries())
      .map(([source, amount]) => ({ source, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}
