import { prisma } from "@/lib/prisma";
import type { EndpointAsset } from "@/components/forms/connection-form";
import { pciNicPortPrefix } from "@/lib/labels";

export async function loadEndpointAssets(): Promise<{
  assets: EndpointAsset[];
  globalServiceLoopInches: number;
}> {
  const [assets, connections, settings] = await Promise.all([
    prisma.asset.findMany({
      orderBy: { codename: "asc" },
      select: {
        id: true,
        codename: true,
        category: true,
        rackId: true,
        startU: true,
        rackUnits: true,
        builtInPortsSide: true,
        builtInEthernetCount: true,
        builtInSfpCount: true,
        kvmChannelCount: true,
        portGroups: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, portCount: true, portType: true, side: true },
        },
        outletGroups: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, outletCount: true, side: true },
        },
        psus: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, sortOrder: true, side: true, wattage: true, portCount: true },
        },
        pciSlots: {
          orderBy: { sortOrder: "asc" },
          select: {
            sortOrder: true,
            occupiedBy: {
              select: { id: true, name: true, type: true, portCount: true },
            },
          },
        },
      },
    }),
    prisma.connection.findMany({
      where: {
        OR: [
          { aEndPortGroupId: { not: null } },
          { bEndPortGroupId: { not: null } },
          { aEndOutletGroupId: { not: null } },
          { bEndOutletGroupId: { not: null } },
        ],
      },
      select: {
        aEndPortGroupId: true,
        aEndPortNumber: true,
        aEndLabel: true,
        bEndPortGroupId: true,
        bEndPortNumber: true,
        bEndLabel: true,
        aEndOutletGroupId: true,
        aEndOutletNumber: true,
        bEndOutletGroupId: true,
        bEndOutletNumber: true,
      },
    }),
    prisma.appSettings.findUnique({
      where: { id: 1 },
      select: { serviceLoopLengthInches: true },
    }),
  ]);

  // Build maps: portGroupId → used ports, outletGroupId → used outlets
  const pgUsed = new Map<string, { portNumber: number; connLabel: string }[]>();
  const ogUsed = new Map<string, { outletNumber: number; connLabel: string }[]>();

  for (const c of connections) {
    if (c.aEndPortGroupId && c.aEndPortNumber != null) {
      const arr = pgUsed.get(c.aEndPortGroupId) ?? [];
      arr.push({ portNumber: c.aEndPortNumber, connLabel: c.aEndLabel });
      pgUsed.set(c.aEndPortGroupId, arr);
    }
    if (c.bEndPortGroupId && c.bEndPortNumber != null) {
      const arr = pgUsed.get(c.bEndPortGroupId) ?? [];
      arr.push({ portNumber: c.bEndPortNumber, connLabel: c.bEndLabel ?? "" });
      pgUsed.set(c.bEndPortGroupId, arr);
    }
    if (c.aEndOutletGroupId && c.aEndOutletNumber != null) {
      const arr = ogUsed.get(c.aEndOutletGroupId) ?? [];
      arr.push({ outletNumber: c.aEndOutletNumber, connLabel: c.aEndLabel });
      ogUsed.set(c.aEndOutletGroupId, arr);
    }
    if (c.bEndOutletGroupId && c.bEndOutletNumber != null) {
      const arr = ogUsed.get(c.bEndOutletGroupId) ?? [];
      arr.push({ outletNumber: c.bEndOutletNumber, connLabel: c.bEndLabel ?? "" });
      ogUsed.set(c.bEndOutletGroupId, arr);
    }
  }

  // PCIe NIC/RAID cards installed in slots — addressed by slot-encoded label
  // (no structured FK on Connection), so used-ports are matched by prefix.
  const NIC_TYPES = new Set(["NIC_CARD", "RAID_CONTROLLER"]);
  const pciCardsByAsset = new Map<
    string,
    { componentId: string; componentName: string; portCount: number; slotSortOrder: number }[]
  >();
  for (const a of assets) {
    const cards = a.pciSlots
      .filter(
        (s) =>
          s.occupiedBy &&
          NIC_TYPES.has(s.occupiedBy.type) &&
          (s.occupiedBy.portCount ?? 0) > 0,
      )
      .map((s) => ({
        componentId: s.occupiedBy!.id,
        componentName: s.occupiedBy!.name,
        portCount: s.occupiedBy!.portCount!,
        slotSortOrder: s.sortOrder,
      }));
    if (cards.length) pciCardsByAsset.set(a.id, cards);
  }

  const pciHostIds = [...pciCardsByAsset.keys()];
  const pciConns = pciHostIds.length
    ? await prisma.connection.findMany({
        where: {
          OR: [
            { aEndAssetId: { in: pciHostIds } },
            { bEndAssetId: { in: pciHostIds } },
          ],
        },
        select: {
          aEndAssetId: true,
          aEndLabel: true,
          bEndAssetId: true,
          bEndLabel: true,
        },
      })
    : [];

  const pciConnsByHost = new Map<string, { label: string; counterpart: string }[]>();
  for (const c of pciConns) {
    if (c.aEndAssetId && c.aEndLabel) {
      const arr = pciConnsByHost.get(c.aEndAssetId) ?? [];
      arr.push({ label: c.aEndLabel, counterpart: c.bEndLabel ?? "" });
      pciConnsByHost.set(c.aEndAssetId, arr);
    }
    if (c.bEndAssetId && c.bEndLabel) {
      const arr = pciConnsByHost.get(c.bEndAssetId) ?? [];
      arr.push({ label: c.bEndLabel, counterpart: c.aEndLabel ?? "" });
      pciConnsByHost.set(c.bEndAssetId, arr);
    }
  }

  return {
    assets: assets.map(({ pciSlots: _pciSlots, ...a }) => ({
      ...a,
      portGroups: a.portGroups.map((pg) => ({
        ...pg,
        usedPorts: pgUsed.get(pg.id) ?? [],
      })),
      outletGroups: a.outletGroups.map((og) => ({
        ...og,
        usedOutlets: ogUsed.get(og.id) ?? [],
      })),
      psus: a.psus,
      pciNics: (pciCardsByAsset.get(a.id) ?? []).map((card) => {
        const prefix = pciNicPortPrefix(card.componentName, card.slotSortOrder);
        const usedPorts = (pciConnsByHost.get(a.id) ?? [])
          .filter((hc) => hc.label.startsWith(prefix))
          .map((hc) => ({
            portNumber: parseInt(hc.label.slice(prefix.length), 10),
            connLabel: hc.counterpart,
          }))
          .filter((u) => !Number.isNaN(u.portNumber));
        return { ...card, usedPorts };
      }),
    })),
    globalServiceLoopInches: settings?.serviceLoopLengthInches ?? 12,
  };
}
