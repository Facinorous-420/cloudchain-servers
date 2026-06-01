import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TopologyView } from "./topology-view";
import { InspectorPane } from "./inspector-pane";
import type { DiagramRack } from "./rack-diagram";
import { parseDiagramPrefs } from "@/lib/diagram-prefs";

export default async function TopologyPage({
  searchParams,
}: {
  searchParams: Promise<{ rack?: string; inspect?: string }>;
}) {
  const { rack: rackParam, inspect: inspectParam } = await searchParams;

  // Per-user diagram view preferences (filters / image mode). Keyed by username
  // (stable + unique) — the session id can be stale after a dev DB reseed.
  const session = await auth();
  const userPrefs = session?.user?.username
    ? await prisma.user.findUnique({
        where: { username: session.user.username },
        select: { diagramPrefs: true },
      })
    : null;
  const diagramPrefs = parseDiagramPrefs(userPrefs?.diagramPrefs);

  // All racks (for the switcher chips).
  const racks = await prisma.rack.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      totalU: true,
      columnCount: true,
      isDefault: true,
      isLocked: true,
      inUse: true,
      _count: { select: { assets: true } },
    },
  });

  const targetId =
    rackParam ?? racks.find((r) => r.isDefault)?.id ?? racks[0]?.id ?? null;

  const rack = targetId
    ? await prisma.rack.findUnique({
        where: { id: targetId },
        include: {
          assets: {
            where: { state: { notIn: ["SOLD", "JUNKED"] } },
            orderBy: { codename: "asc" },
            include: {
              bayZones: {
                orderBy: { sortOrder: "asc" },
                include: {
                  drives: {
                    select: {
                      id: true,
                      name: true,
                      kind: true,
                      capacityGB: true,
                      bayNumber: true,
                    },
                  },
                },
              },
              portGroups: { orderBy: { sortOrder: "asc" } },
              outletGroups: { orderBy: { sortOrder: "asc" } },
              psus: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  sortOrder: true,
                  wattage: true,
                  portCount: true,
                  side: true,
                  state: true,
                },
              },
              shelfItems: {
                select: {
                  id: true,
                  codename: true,
                  name: true,
                  category: true,
                },
                orderBy: { codename: "asc" },
              },
              pciSlots: {
                include: {
                  occupiedBy: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      portCount: true,
                      portType: true,
                      portSpeed: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  // Load connections that reference structured port/outlet endpoints so we
  // can colour connected ports green in the diagram.
  const portGroupIds =
    rack?.assets.flatMap((a) => a.portGroups.map((pg) => pg.id)) ?? [];
  const outletGroupIds =
    rack?.assets.flatMap((a) => a.outletGroups.map((og) => og.id)) ?? [];

  const connRaw =
    portGroupIds.length > 0 || outletGroupIds.length > 0
      ? await prisma.connection.findMany({
          where: {
            OR: [
              { aEndPortGroupId: { in: portGroupIds } },
              { bEndPortGroupId: { in: portGroupIds } },
              { aEndOutletGroupId: { in: outletGroupIds } },
              { bEndOutletGroupId: { in: outletGroupIds } },
            ],
          },
          select: {
            aEndPortGroupId: true,
            aEndPortNumber: true,
            bEndPortGroupId: true,
            bEndPortNumber: true,
            aEndOutletGroupId: true,
            aEndOutletNumber: true,
            bEndOutletGroupId: true,
            bEndOutletNumber: true,
          },
        })
      : [];

  // Build lookup maps: groupId → Set of connected port/outlet numbers.
  // Patch panels split front (bEnd) and rear (aEnd) connections separately.
  const pgConnected     = new Map<string, Set<number>>(); // combined (non-PP)
  const pgConnectedFront = new Map<string, Set<number>>(); // bEnd only (PP front)
  const pgConnectedRear  = new Map<string, Set<number>>(); // aEnd only (PP rear)
  const ogConnected     = new Map<string, Set<number>>();
  // Identify all port group IDs belonging to patch panel assets.
  const ppAssetIds = new Set(
    rack?.assets.filter((a) => a.category === "PATCH_PANEL").map((a) => a.id) ?? [],
  );
  const ppPortGroupIds = new Set(
    rack?.assets
      .filter((a) => ppAssetIds.has(a.id))
      .flatMap((a) => a.portGroups.map((pg) => pg.id)) ?? [],
  );
  for (const c of connRaw) {
    if (c.aEndPortGroupId && c.aEndPortNumber != null) {
      if (ppPortGroupIds.has(c.aEndPortGroupId)) {
        if (!pgConnectedRear.has(c.aEndPortGroupId))
          pgConnectedRear.set(c.aEndPortGroupId, new Set());
        pgConnectedRear.get(c.aEndPortGroupId)!.add(c.aEndPortNumber);
      } else {
        if (!pgConnected.has(c.aEndPortGroupId))
          pgConnected.set(c.aEndPortGroupId, new Set());
        pgConnected.get(c.aEndPortGroupId)!.add(c.aEndPortNumber);
      }
    }
    if (c.bEndPortGroupId && c.bEndPortNumber != null) {
      if (ppPortGroupIds.has(c.bEndPortGroupId)) {
        if (!pgConnectedFront.has(c.bEndPortGroupId))
          pgConnectedFront.set(c.bEndPortGroupId, new Set());
        pgConnectedFront.get(c.bEndPortGroupId)!.add(c.bEndPortNumber);
      } else {
        if (!pgConnected.has(c.bEndPortGroupId))
          pgConnected.set(c.bEndPortGroupId, new Set());
        pgConnected.get(c.bEndPortGroupId)!.add(c.bEndPortNumber);
      }
    }
    if (c.aEndOutletGroupId && c.aEndOutletNumber != null) {
      if (!ogConnected.has(c.aEndOutletGroupId))
        ogConnected.set(c.aEndOutletGroupId, new Set());
      ogConnected.get(c.aEndOutletGroupId)!.add(c.aEndOutletNumber);
    }
    if (c.bEndOutletGroupId && c.bEndOutletNumber != null) {
      if (!ogConnected.has(c.bEndOutletGroupId))
        ogConnected.set(c.bEndOutletGroupId, new Set());
      ogConnected.get(c.bEndOutletGroupId)!.add(c.bEndOutletNumber);
    }
  }

  // Query POWER connections whose B-end is an asset in this rack and whose
  // B-end label is "PSU N" — used to colour connected PSU cells green.
  const rackAssetIds = rack?.assets.map((a) => a.id) ?? [];
  const powerConnsRaw =
    rackAssetIds.length > 0
      ? await prisma.connection.findMany({
          where: {
            type: "POWER",
            bEndAssetId: { in: rackAssetIds },
          },
          select: { bEndAssetId: true, bEndLabel: true },
        })
      : [];

  // Map: assetId → Set of PSU sortOrders (0-based) that have power connections.
  // Label "PSU N" (1-indexed) → sortOrder N-1.
  const psuConnected = new Map<string, Set<number>>();
  for (const c of powerConnsRaw) {
    if (!c.bEndAssetId || !c.bEndLabel) continue;
    const m = c.bEndLabel.match(/^PSU (\d+)(?: |$)/);
    if (!m) continue;
    const sortOrder = parseInt(m[1], 10) - 1;
    if (!psuConnected.has(c.bEndAssetId))
      psuConnected.set(c.bEndAssetId, new Set());
    psuConnected.get(c.bEndAssetId)!.add(sortOrder);
  }

  // Query KVM connections whose A-end is an asset in this rack — used to
  // colour connected KVM channels orange/solid in the diagram.
  const kvmConnsRaw =
    rackAssetIds.length > 0
      ? await prisma.connection.findMany({
          where: { type: "KVM", aEndAssetId: { in: rackAssetIds } },
          select: { aEndAssetId: true, aEndLabel: true },
        })
      : [];

  const kvmConnected = new Map<string, Set<number>>();
  for (const c of kvmConnsRaw) {
    if (!c.aEndAssetId || !c.aEndLabel) continue;
    const m = c.aEndLabel.match(/^Channel (\d+)$/);
    if (!m) continue;
    if (!kvmConnected.has(c.aEndAssetId))
      kvmConnected.set(c.aEndAssetId, new Set());
    kvmConnected.get(c.aEndAssetId)!.add(parseInt(m[1], 10));
  }

  const storages = await prisma.storage.findMany({
    orderBy: { name: "asc" },
    include: {
      assets: {
        where: { state: { notIn: ["SOLD", "JUNKED"] } },
        orderBy: { codename: "asc" },
        select: {
          id: true,
          codename: true,
          name: true,
          category: true,
          formFactor: true,
          rackUnits: true,
          columnSpan: true,
          state: true,
        },
      },
    },
  });

  const unboxed = await prisma.asset.findMany({
    where: {
      storageId: null,
      OR: [{ rackId: null }, { startU: null }],
      location: { in: ["STORAGE", "ON_SHELF", "OFFSITE"] },
      state: { notIn: ["SOLD", "JUNKED"] },
    },
    orderBy: { codename: "asc" },
    select: {
      id: true,
      codename: true,
      name: true,
      category: true,
      formFactor: true,
      rackUnits: true,
      columnSpan: true,
      state: true,
    },
  });

  const diagramRack: DiagramRack | null = rack
    ? {
        id: rack.id,
        name: rack.name,
        totalU: rack.totalU,
        columnCount: rack.columnCount,
        depthInches: rack.depthInches ?? null,
        isLocked: rack.isLocked,
        assets: rack.assets.map((a) => ({
          id: a.id,
          codename: a.codename,
          name: a.name,
          category: a.category,
          formFactor: a.formFactor,
          startU: a.startU,
          rackUnits: a.rackUnits,
          gridColumn: a.gridColumn,
          columnSpan: a.columnSpan,
          state: a.state,
          requiresSupport: a.requiresSupport,
          depthInches: a.depthInches ?? null,
          rackRenderFrontPath: a.rackRenderFrontPath,
          rackRenderRearPath: a.rackRenderRearPath,
          faceOrientation: a.faceOrientation,
          rackFace: a.rackFace ?? null,
          patchPanelType: a.patchPanelType ?? null,
          kvmChannelCount: a.kvmChannelCount,
          builtInEthernetCount: a.builtInEthernetCount,
          builtInSfpCount: a.builtInSfpCount,
          psuCount: a.psuCount,
          psus: a.psus,
          connectedPsuOrders: Array.from(psuConnected.get(a.id) ?? []),
          connectedKvmChannels: Array.from(kvmConnected.get(a.id) ?? []),
          bayZones: a.bayZones,
          portGroups: a.portGroups.map((pg) => {
            const isPp = a.category === "PATCH_PANEL";
            return {
              ...pg,
              hiddenPorts: (pg.hiddenPorts as number[] | null) ?? null,
              connectedPorts: Array.from(
                isPp ? (pgConnectedFront.get(pg.id) ?? new Set()) : (pgConnected.get(pg.id) ?? new Set()),
              ),
              ...(isPp ? { connectedRearPorts: Array.from(pgConnectedRear.get(pg.id) ?? new Set()) } : {}),
            };
          }),
          outletGroups: a.outletGroups.map((og) => ({
            ...og,
            hiddenPorts: (og.hiddenPorts as number[] | null) ?? null,
            connectedOutlets: Array.from(ogConnected.get(og.id) ?? []),
          })),
          shelfItems: a.shelfItems,
          pciNics: a.pciSlots
            .filter(
              (s) =>
                (s.occupiedBy?.type === "NIC_CARD" ||
                  s.occupiedBy?.type === "RAID_CONTROLLER") &&
                (s.occupiedBy.portCount ?? 0) > 0,
            )
            .map((s) => ({
              componentId: s.occupiedBy!.id,
              slotSortOrder: s.sortOrder,
              portCount: s.occupiedBy!.portCount!,
              portType: s.occupiedBy!.portType ?? "ETHERNET",
              portSpeed: s.occupiedBy!.portSpeed,
              componentName: s.occupiedBy!.name,
            })),
        })),
      }
    : null;

  return (
    <TopologyView
      diagramRack={diagramRack}
      racks={racks.map((r) => ({
        id: r.id,
        name: r.name,
        totalU: r.totalU,
        columnCount: r.columnCount,
        isDefault: r.isDefault,
        isLocked: r.isLocked,
        inUse: r.inUse,
        placedCount: r._count.assets,
      }))}
      storages={storages.map((s) => ({
        id: s.id,
        name: s.name,
        assets: s.assets,
      }))}
      unboxed={unboxed}
      selectedInspect={inspectParam ?? null}
      prefs={diagramPrefs}
      inspector={
        inspectParam ? <InspectorPane inspect={inspectParam} /> : null
      }
    />
  );
}
