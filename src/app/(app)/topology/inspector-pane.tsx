import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import {
  DetailField,
  DetailGrid,
} from "@/components/ui/detail";
import { Field, Select } from "@/components/ui/field";
import { formatDate, formatMoney } from "@/lib/format";
import { enumLabel, PORT_TYPE_LABELS } from "@/lib/enums";
import { pciNicPortLabel, pciNicPortPrefix } from "@/lib/labels";
import { mountDriveInBay, removeDriveFromBay } from "../drives/actions";
import { flipFaceOrientation, flipRackFace } from "./actions";
import { InspectorPortPanel } from "./inspector-port-panel";

// Server-rendered inspector dispatcher. Mounted into the client-side drawer
// in TopologyView when ?inspect= is set on the URL. The token format is
// "<type>:<args>" — `asset:<id>`, `bay:<zoneId>:<n>`, `port:<groupId>:<n>`,
// `outlet:<groupId>:<n>`, `nic:<assetId>:<eth|sfp>:<n>`, `psu:<assetId>:<n>`,
// `kvm:<assetId>:<channel>`.
export async function InspectorPane({ inspect }: { inspect: string }) {
  const [type, ...args] = inspect.split(":");

  // The inspect token comes from the URL — guard the id and numeric args so a
  // malformed token renders the fallback instead of issuing NaN queries.
  const id = args[0];
  const parseIndex = (raw: string | undefined): number | null => {
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isInteger(n) ? n : null;
  };
  const unknown = (
    <p className="text-[12px] text-faint">
      Unknown inspector target: {inspect}
    </p>
  );

  switch (type) {
    case "asset":
      return id ? <AssetInspector assetId={id} /> : unknown;
    case "bay": {
      const bayNumber = parseIndex(args[1]);
      return id && bayNumber != null ? (
        <BayInspector bayZoneId={id} bayNumber={bayNumber} />
      ) : (
        unknown
      );
    }
    case "port": {
      const portNumber = parseIndex(args[1]);
      return id && portNumber != null ? (
        <PortInspector portGroupId={id} portNumber={portNumber} />
      ) : (
        unknown
      );
    }
    case "outlet": {
      const outletNumber = parseIndex(args[1]);
      return id && outletNumber != null ? (
        <OutletInspector outletGroupId={id} outletNumber={outletNumber} />
      ) : (
        unknown
      );
    }
    case "nic": {
      const index = parseIndex(args[2]);
      return id && index != null ? (
        <NicInspector
          assetId={id}
          kind={args[1] === "sfp" ? "sfp" : "eth"}
          index={index}
        />
      ) : (
        unknown
      );
    }
    case "psu": {
      const index = parseIndex(args[1]);
      return id && index != null ? (
        <PsuInspector assetId={id} index={index} />
      ) : (
        unknown
      );
    }
    case "kvm": {
      const channel = parseIndex(args[1]);
      return id && channel != null ? (
        <KvmInspector assetId={id} channel={channel} />
      ) : (
        unknown
      );
    }
    case "nic-pcie": {
      const portNumber = parseIndex(args[1]);
      return id && portNumber != null ? (
        <PciNicInspector componentId={id} portNumber={portNumber} />
      ) : (
        unknown
      );
    }
    default:
      return unknown;
  }
}

// ---------- Asset ----------
async function AssetInspector({ assetId }: { assetId: string }) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      storage: { select: { id: true, name: true } },
      rack: { select: { id: true, name: true } },
      portGroups: { orderBy: { sortOrder: "asc" } },
      outletGroups: { orderBy: { sortOrder: "asc" } },
      pciSlots: {
        orderBy: { sortOrder: "asc" },
        include: {
          occupiedBy: {
            select: { id: true, name: true, type: true, portCount: true, portType: true, portSpeed: true },
          },
        },
      },
      psus: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true, wattage: true, portCount: true, side: true, state: true },
      },
    },
  });
  if (!asset) notFound();

  const THIN_CATEGORIES = new Set(["PATCH_PANEL", "BLANK_PANEL", "SHELF"]);
  const isThinItem = THIN_CATEGORIES.has(asset.category);

  let canFlipFace = false;
  if (isThinItem && asset.rackFace && asset.rackId && asset.startU != null && asset.rackUnits != null) {
    const targetFace = asset.rackFace === "FRONT" ? "REAR" : "FRONT";
    const assetEnd = asset.startU + asset.rackUnits - 1;
    const allOnTargetFace = await prisma.asset.findMany({
      where: {
        rackId: asset.rackId,
        id: { not: assetId },
        rackFace: targetFace as "FRONT" | "REAR",
        startU: { not: null },
        rackUnits: { not: null },
      },
      select: { startU: true, rackUnits: true },
    });
    canFlipFace = !allOnTargetFace.some((o) => {
      const oEnd = o.startU! + (o.rackUnits ?? 1) - 1;
      return o.startU! <= assetEnd && asset.startU! <= oEnd;
    });
  }

  // Fetch which ports / outlets are connected
  const portGroupIds = asset.portGroups.map((pg) => pg.id);
  const outletGroupIds = asset.outletGroups.map((og) => og.id);

  const connRaw =
    portGroupIds.length > 0 || outletGroupIds.length > 0
      ? await prisma.connection.findMany({
          where: {
            OR: [
              ...(portGroupIds.length > 0
                ? [
                    { aEndPortGroupId: { in: portGroupIds } },
                    { bEndPortGroupId: { in: portGroupIds } },
                  ]
                : []),
              ...(outletGroupIds.length > 0
                ? [
                    { aEndOutletGroupId: { in: outletGroupIds } },
                    { bEndOutletGroupId: { in: outletGroupIds } },
                  ]
                : []),
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

  const pgConnected      = new Map<string, Set<number>>();
  const pgConnectedFront = new Map<string, Set<number>>(); // PP is bEnd (patch cable in)
  const pgConnectedRear  = new Map<string, Set<number>>(); // PP is aEnd (permanent cable out)
  const ogConnected      = new Map<string, Set<number>>();
  for (const c of connRaw) {
    if (c.aEndPortGroupId && c.aEndPortNumber != null) {
      if (!pgConnected.has(c.aEndPortGroupId)) pgConnected.set(c.aEndPortGroupId, new Set());
      pgConnected.get(c.aEndPortGroupId)!.add(c.aEndPortNumber);
      if (!pgConnectedRear.has(c.aEndPortGroupId)) pgConnectedRear.set(c.aEndPortGroupId, new Set());
      pgConnectedRear.get(c.aEndPortGroupId)!.add(c.aEndPortNumber);
    }
    if (c.bEndPortGroupId && c.bEndPortNumber != null) {
      if (!pgConnected.has(c.bEndPortGroupId)) pgConnected.set(c.bEndPortGroupId, new Set());
      pgConnected.get(c.bEndPortGroupId)!.add(c.bEndPortNumber);
      if (!pgConnectedFront.has(c.bEndPortGroupId)) pgConnectedFront.set(c.bEndPortGroupId, new Set());
      pgConnectedFront.get(c.bEndPortGroupId)!.add(c.bEndPortNumber);
    }
    if (c.aEndOutletGroupId && c.aEndOutletNumber != null) {
      if (!ogConnected.has(c.aEndOutletGroupId)) ogConnected.set(c.aEndOutletGroupId, new Set());
      ogConnected.get(c.aEndOutletGroupId)!.add(c.aEndOutletNumber);
    }
    if (c.bEndOutletGroupId && c.bEndOutletNumber != null) {
      if (!ogConnected.has(c.bEndOutletGroupId)) ogConnected.set(c.bEndOutletGroupId, new Set());
      ogConnected.get(c.bEndOutletGroupId)!.add(c.bEndOutletNumber);
    }
  }

  // PSU power connections: bEndLabel = "PSU N" (1-indexed → sortOrder N-1)
  const psuConnsRaw =
    (asset.psuCount ?? asset.psus.length) > 0
      ? await prisma.connection.findMany({
          where: { type: "POWER", bEndAssetId: assetId },
          select: { bEndLabel: true },
        })
      : [];
  const connectedPsuOrders: number[] = [];
  for (const c of psuConnsRaw) {
    const m = c.bEndLabel?.match(/^PSU (\d+)$/);
    if (m) connectedPsuOrders.push(parseInt(m[1], 10) - 1);
  }

  // KVM connections: aEndLabel = "Channel N"
  const kvmConnsRaw =
    (asset.kvmChannelCount ?? 0) > 0
      ? await prisma.connection.findMany({
          where: { type: "KVM", aEndAssetId: assetId },
          select: { aEndLabel: true },
        })
      : [];
  const connectedKvmChannels: number[] = [];
  for (const c of kvmConnsRaw) {
    const m = c.aEndLabel?.match(/^Channel (\d+)$/);
    if (m) connectedKvmChannels.push(parseInt(m[1], 10));
  }

  const pciNicSlots = asset.pciSlots.filter(
    (s) =>
      (s.occupiedBy?.type === "NIC_CARD" || s.occupiedBy?.type === "RAID_CONTROLLER") &&
      (s.occupiedBy.portCount ?? 0) > 0,
  );

  // Fetch label-based connections for PCIe NIC/RAID card ports. Labels encode
  // the slot (unique per host) so identically-named cards never collide.
  const pciNicPortLabels = pciNicSlots.flatMap((slot) => {
    const comp = slot.occupiedBy!;
    return Array.from({ length: comp.portCount! }, (_, i) =>
      pciNicPortLabel(comp.name, slot.sortOrder, i + 1),
    );
  });
  const pciNicConnsRaw =
    pciNicPortLabels.length > 0
      ? await prisma.connection.findMany({
          where: {
            OR: [
              { aEndAssetId: assetId, aEndLabel: { in: pciNicPortLabels } },
              { bEndAssetId: assetId, bEndLabel: { in: pciNicPortLabels } },
            ],
          },
          select: { aEndAssetId: true, aEndLabel: true, bEndAssetId: true, bEndLabel: true },
        })
      : [];

  const pciNicConnected = new Map<string, Set<number>>();
  for (const slot of pciNicSlots) {
    const comp = slot.occupiedBy!;
    const connSet = new Set<number>();
    const prefix = pciNicPortPrefix(comp.name, slot.sortOrder);
    for (const conn of pciNicConnsRaw) {
      const label = conn.aEndAssetId === assetId ? conn.aEndLabel : conn.bEndLabel;
      if (label?.startsWith(prefix)) {
        const portNum = parseInt(label.slice(prefix.length), 10);
        if (!isNaN(portNum)) connSet.add(portNum);
      }
    }
    pciNicConnected.set(comp.id, connSet);
  }

  const pciNics = pciNicSlots.map((slot) => {
    const comp = slot.occupiedBy!;
    return {
      componentId: comp.id,
      componentName: comp.name,
      portCount: comp.portCount!,
      portType: comp.portType ?? "ETHERNET",
      portSpeed: comp.portSpeed,
      connectedPorts: Array.from(pciNicConnected.get(comp.id) ?? []),
      slotSortOrder: slot.sortOrder,
      slotSize: slot.size,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${
              asset.state === "IN_USE" ? "bg-status-green" : "bg-faint"
            }`}
          />
          <h3 className="text-base font-black">{asset.codename}</h3>
          <Badge tone="accent">{enumLabel(asset.category)}</Badge>
        </div>
        <p className="mt-0.5 text-[12px] text-text-dim">{asset.name}</p>
      </div>

      <DetailGrid columns={2}>
        <DetailField label="Manufacturer" value={asset.manufacturer} />
        <DetailField label="Model" value={asset.modelNumber} />
        <DetailField label="Serial" value={asset.serialNumber} />
        <DetailField label="Condition" value={asset.condition} />
        <DetailField label="Form factor" value={enumLabel(asset.formFactor)} />
        <DetailField label="Rack units" value={asset.rackUnits} />
        <DetailField label="Location" value={enumLabel(asset.location)} />
        <DetailField label="State" value={asset.state.replace(/_/g, " ")} />
      </DetailGrid>

      <div className="rounded-md border border-border bg-panel-2 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
          Placement
        </p>
        {asset.rack ? (
          <p className="mt-1 text-[12.5px]">
            On{" "}
            <Link
              href={`/racks/${asset.rack.id}`}
              className="font-bold text-accent hover:underline"
            >
              {asset.rack.name}
            </Link>{" "}
            at U{asset.startU ?? "?"}
            {asset.gridColumn != null && asset.formFactor !== "RACK"
              ? ` · col ${asset.gridColumn + 1}`
              : ""}
          </p>
        ) : asset.storage ? (
          <p className="mt-1 text-[12.5px]">
            In{" "}
            <Link
              href={`/storages/${asset.storage.id}`}
              className="font-bold text-accent hover:underline"
            >
              {asset.storage.name}
            </Link>
          </p>
        ) : (
          <p className="mt-1 text-[12.5px] text-faint">
            Off-rack, no storage box assigned (Unboxed).
          </p>
        )}
      </div>

      <DetailGrid columns={2}>
        <DetailField label="Purchased" value={formatDate(asset.purchaseDate)} />
        <DetailField
          label="Purchase price"
          value={formatMoney(asset.purchasePrice)}
        />
        <DetailField label="Sold" value={formatDate(asset.soldDate)} />
        <DetailField
          label="Sold price"
          value={formatMoney(asset.soldPrice)}
        />
      </DetailGrid>

      {asset.notes && (
        <div className="rounded-md border border-border bg-panel-2 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[12.5px]">
            {asset.notes}
          </p>
        </div>
      )}

      <InspectorPortPanel
        assetId={asset.id}
        portGroups={asset.portGroups.map((pg) => ({
          id: pg.id,
          name: pg.name,
          portType: pg.portType,
          portCount: pg.portCount,
          // Patch panels: split front (bEnd) vs rear (aEnd) connections.
          // Others: combined set (existing behaviour).
          connectedPorts: asset.category === "PATCH_PANEL"
            ? Array.from(pgConnectedFront.get(pg.id) ?? [])
            : Array.from(pgConnected.get(pg.id) ?? []),
          ...(asset.category === "PATCH_PANEL"
            ? {
                connectedRearPorts: Array.from(pgConnectedRear.get(pg.id) ?? []),
                patchPanelType: asset.patchPanelType,
              }
            : {}),
        }))}
        outletGroups={asset.outletGroups.map((og) => ({
          id: og.id,
          name: og.name,
          outletType: og.outletType,
          outletCount: og.outletCount,
          batteryBacked: og.batteryBacked,
          surgeProtected: og.surgeProtected,
          connectedOutlets: Array.from(ogConnected.get(og.id) ?? []),
        }))}
        psus={asset.psus}
        psuCount={asset.psuCount}
        connectedPsuOrders={connectedPsuOrders}
        kvmChannelCount={asset.kvmChannelCount}
        connectedKvmChannels={connectedKvmChannels}
        builtInEthernetCount={asset.builtInEthernetCount}
        builtInSfpCount={asset.builtInSfpCount}
        pciNics={pciNics}
      />

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {asset.rackId && isThinItem && asset.rackFace && (
          <form action={flipRackFace.bind(null, asset.id)}>
            <Button
              type="submit"
              variant="secondary"
              className="w-full text-center"
              disabled={!canFlipFace}
              title={
                canFlipFace
                  ? `Move to ${asset.rackFace === "FRONT" ? "rear" : "front"} face`
                  : "Target face is already occupied at this U"
              }
            >
              {canFlipFace
                ? `↔ Move to ${asset.rackFace === "FRONT" ? "rear" : "front"} face`
                : `↔ ${asset.rackFace === "FRONT" ? "Rear" : "Front"} face occupied`}
            </Button>
          </form>
        )}
        {asset.rackId && !isThinItem && (
          <form action={flipFaceOrientation.bind(null, asset.id)}>
            <Button
              type="submit"
              variant="secondary"
              className="w-full text-center"
              title={
                asset.faceOrientation === "FRONT_REAR"
                  ? "Currently reversed — click to restore normal orientation"
                  : "Click to mount reversed (front faces rack rear)"
              }
            >
              {asset.faceOrientation === "FRONT_REAR"
                ? "↔ Restore normal orientation"
                : "↔ Flip mounting direction"}
            </Button>
          </form>
        )}
        <div className="flex gap-2">
          <LinkButton
            href={`/assets/${asset.id}`}
            variant="secondary"
            className="flex-1 text-center"
          >
            Open detail
          </LinkButton>
          <LinkButton
            href={`/assets/${asset.id}/edit`}
            variant="primary"
            className="flex-1 text-center"
          >
            Edit asset
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

// ---------- Bay ----------
async function BayInspector({
  bayZoneId,
  bayNumber,
}: {
  bayZoneId: string;
  bayNumber: number;
}) {
  const zone = await prisma.bayZone.findUnique({
    where: { id: bayZoneId },
    include: {
      asset: { select: { id: true, codename: true, name: true } },
      drives: {
        where: { bayNumber },
        select: {
          id: true,
          name: true,
          manufacturer: true,
          model: true,
          kind: true,
          size: true,
          capacityGB: true,
          serialNumber: true,
          assignedUse: true,
        },
      },
    },
  });
  if (!zone) notFound();
  const drive = zone.drives[0] ?? null;

  // For empty bays: load compatible unused drives so the user can mount one
  // without going through the new-drive form.
  const compatibleDrives = drive
    ? []
    : await prisma.drive.findMany({
        where: {
          installedInId: null,
          size: zone.driveSize,
          state: { notIn: ["SOLD", "JUNKED"] },
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          kind: true,
          capacityGB: true,
          serialNumber: true,
        },
      });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black">Bay {bayNumber}</h3>
          <Badge>{enumLabel(zone.driveSize)}</Badge>
          {drive ? (
            <Badge tone="success">In use</Badge>
          ) : (
            <Badge>Empty</Badge>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-text-dim">
          {zone.name} · on{" "}
          <Link
            href={`/assets/${zone.asset?.id}`}
            className="text-accent hover:underline"
          >
            {zone.asset?.codename}
          </Link>
        </p>
      </div>

      {drive ? (
        <>
          <DetailGrid columns={2}>
            <DetailField label="Drive" value={drive.name} />
            <DetailField label="Kind" value={drive.kind} />
            <DetailField label="Capacity" value={`${drive.capacityGB} GB`} />
            <DetailField label="Manufacturer" value={drive.manufacturer} />
            <DetailField label="Model" value={drive.model} />
            <DetailField label="Serial" value={drive.serialNumber} />
            <DetailField label="Assigned use" value={drive.assignedUse} />
          </DetailGrid>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex gap-2">
              <LinkButton
                href={`/drives/${drive.id}`}
                variant="secondary"
                className="flex-1 text-center"
              >
                Open detail
              </LinkButton>
              <LinkButton
                href={`/drives/${drive.id}/edit`}
                variant="primary"
                className="flex-1 text-center"
              >
                Edit drive
              </LinkButton>
            </div>
            <form action={removeDriveFromBay.bind(null, drive.id)}>
              <Button
                type="submit"
                variant="secondary"
                className="w-full text-center hover:border-red-400 hover:text-red-400"
              >
                Remove from bay
              </Button>
            </form>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12.5px] text-faint">
            No drive installed in this bay.
          </p>

          <form
            action={mountDriveInBay}
            className="flex flex-col gap-2 rounded-md border border-border bg-panel-2 p-3"
          >
            <input type="hidden" name="bayZoneId" value={zone.id} />
            <input type="hidden" name="bayNumber" value={bayNumber} />
            <Field
              label="Mount existing drive"
              htmlFor={`mount-${bayZoneId}-${bayNumber}`}
              hint={`Lists unused drives that fit a ${zone.driveSize} bay.`}
            >
              <Select
                id={`mount-${bayZoneId}-${bayNumber}`}
                name="driveId"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  {compatibleDrives.length === 0
                    ? "— No compatible drives in storage —"
                    : "— Pick a drive —"}
                </option>
                {compatibleDrives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.kind} · {d.capacityGB} GB
                    {d.serialNumber ? ` · ${d.serialNumber}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              type="submit"
              variant="primary"
              disabled={compatibleDrives.length === 0}
              className="w-full text-center"
            >
              Mount
            </Button>
          </form>

          <LinkButton
            href={`/drives/new?installedInId=${zone.asset?.id}&bayZoneId=${zone.id}&bayNumber=${bayNumber}&size=${zone.driveSize}`}
            variant="secondary"
            className="w-full text-center"
          >
            Create new drive
          </LinkButton>
        </>
      )}
    </div>
  );
}

// ---------- Port / Outlet ----------
async function PortInspector({
  portGroupId,
  portNumber,
}: {
  portGroupId: string;
  portNumber: number;
}) {
  const group = await prisma.portGroup.findUnique({
    where: { id: portGroupId },
    include: { asset: { select: { id: true, codename: true, name: true, category: true } } },
  });
  if (!group) notFound();

  const connections = await prisma.connection.findMany({
    where: {
      OR: [
        { aEndPortGroupId: portGroupId, aEndPortNumber: portNumber },
        { bEndPortGroupId: portGroupId, bEndPortNumber: portNumber },
      ],
    },
    include: {
      aEnd: { select: { id: true, codename: true } },
      bEnd: { select: { id: true, codename: true } },
    },
  });

  const isPatchPanel = group.asset.category === "PATCH_PANEL";

  if (isPatchPanel) {
    // FRONT = patch side: switch connects INTO the PP (PP is bEnd).
    // REAR = permanent side: PP connects OUT to end device (PP is aEnd).
    const frontConn =
      connections.find(
        (c) => c.bEndPortGroupId === portGroupId && c.bEndPortNumber === portNumber,
      ) ?? null;
    const rearConn =
      connections.find(
        (c) => c.aEndPortGroupId === portGroupId && c.aEndPortNumber === portNumber,
      ) ?? null;
    const isConnected = frontConn != null || rearConn != null;

    const frontLength = frontConn
      ? (frontConn.cableLengthFeet ?? frontConn.estimatedCableLengthFeet)
      : null;
    const rearLength = rearConn
      ? (rearConn.cableLengthFeet ?? rearConn.estimatedCableLengthFeet)
      : null;
    const totalLength =
      frontLength != null && rearLength != null ? frontLength + rearLength : null;

    // Chain: source (aEnd of frontConn) → PP → destination (bEnd of rearConn)
    const chainSource = frontConn?.aEnd ?? null;
    const chainDest = rearConn?.bEnd ?? null;

    return (
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black">Port {portNumber}</h3>
            <Badge>{PORT_TYPE_LABELS[group.portType]}</Badge>
            {group.portSpeed && <Badge>{group.portSpeed}</Badge>}
            <Badge tone={isConnected ? "success" : "neutral"}>
              {isConnected ? "Connected" : "Empty"}
            </Badge>
          </div>
          <p className="mt-0.5 text-[12px] text-text-dim">
            {group.name ?? PORT_TYPE_LABELS[group.portType]} · on{" "}
            <Link href={`/assets/${group.asset.id}`} className="text-accent hover:underline">
              {group.asset.codename}
            </Link>
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            Front — patch side
          </p>
          <ConnectionSummary connection={frontConn} localAssetId={group.assetId} />
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            Rear — permanent side
          </p>
          <ConnectionSummary connection={rearConn} localAssetId={group.assetId} />
        </div>

        {chainSource && chainDest && (
          <div className="rounded-md border border-border bg-panel-2 p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
              Full path
            </p>
            <p className="text-[12px]">
              <Link
                href={`/assets/${chainSource.id}`}
                className="font-bold text-accent hover:underline"
              >
                {chainSource.codename}
              </Link>
              <span className="mx-1 text-text-dim">→</span>
              <Link
                href={`/assets/${group.asset.id}`}
                className="font-bold text-accent hover:underline"
              >
                {group.asset.codename}
              </Link>
              <span className="mx-1 text-text-dim">→</span>
              <Link
                href={`/assets/${chainDest.id}`}
                className="font-bold text-accent hover:underline"
              >
                {chainDest.codename}
              </Link>
            </p>
            {totalLength != null && (
              <p className="mt-1 text-[11px] text-text-dim">
                Total cable:{" "}
                {frontConn?.cableLengthFeet == null && frontLength != null ? "~" : ""}
                {frontLength ?? 0} ft +{" "}
                {rearConn?.cableLengthFeet == null && rearLength != null ? "~" : ""}
                {rearLength ?? 0} ft = {totalLength} ft
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {frontConn ? (
            <LinkButton
              href={`/connections/${frontConn.id}/edit`}
              variant="secondary"
              className="flex-1 text-center"
            >
              Edit front connection
            </LinkButton>
          ) : (
            <LinkButton
              href="/connections/new?type=NETWORK"
              variant="secondary"
              className="flex-1 text-center"
            >
              Add front connection
            </LinkButton>
          )}
          {rearConn ? (
            <LinkButton
              href={`/connections/${rearConn.id}/edit`}
              variant="primary"
              className="flex-1 text-center"
            >
              Edit rear connection
            </LinkButton>
          ) : (
            <LinkButton
              href="/connections/new?type=NETWORK"
              variant="primary"
              className="flex-1 text-center"
            >
              Add rear connection
            </LinkButton>
          )}
        </div>
      </div>
    );
  }

  // Non-patch-panel: single-connection display
  const connection = connections[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black">Port {portNumber}</h3>
          <Badge>{PORT_TYPE_LABELS[group.portType]}</Badge>
          {group.portSpeed && <Badge>{group.portSpeed}</Badge>}
          <Badge tone={connection ? "success" : "neutral"}>
            {connection ? "Connected" : "Empty"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[12px] text-text-dim">
          {group.name ?? PORT_TYPE_LABELS[group.portType]} · on{" "}
          <Link
            href={`/assets/${group.asset.id}`}
            className="text-accent hover:underline"
          >
            {group.asset.codename}
          </Link>
        </p>
      </div>

      <ConnectionSummary connection={connection} localAssetId={group.assetId} />

      <div className="flex gap-2 border-t border-border pt-3">
        {connection ? (
          <LinkButton
            href={`/connections/${connection.id}/edit`}
            variant="primary"
            className="flex-1 text-center"
          >
            Edit connection
          </LinkButton>
        ) : (
          <LinkButton
            href="/connections/new?type=NETWORK"
            variant="primary"
            className="flex-1 text-center"
          >
            Add connection
          </LinkButton>
        )}
      </div>
    </div>
  );
}

async function OutletInspector({
  outletGroupId,
  outletNumber,
}: {
  outletGroupId: string;
  outletNumber: number;
}) {
  const group = await prisma.outletGroup.findUnique({
    where: { id: outletGroupId },
    include: { asset: { select: { id: true, codename: true, name: true } } },
  });
  if (!group) notFound();

  const connection = await prisma.connection.findFirst({
    where: {
      OR: [
        { aEndOutletGroupId: outletGroupId, aEndOutletNumber: outletNumber },
        { bEndOutletGroupId: outletGroupId, bEndOutletNumber: outletNumber },
      ],
    },
    include: {
      aEnd: { select: { id: true, codename: true } },
      bEnd: { select: { id: true, codename: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black">Outlet {outletNumber}</h3>
          {group.outletType && <Badge>{group.outletType}</Badge>}
          {group.batteryBacked && <Badge tone="success">Battery</Badge>}
          {group.surgeProtected && !group.batteryBacked && (
            <Badge>Surge</Badge>
          )}
          <Badge tone={connection ? "success" : "neutral"}>
            {connection ? "Connected" : "Empty"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[12px] text-text-dim">
          {group.name ?? "Outlets"} · on{" "}
          <Link
            href={`/assets/${group.asset.id}`}
            className="text-accent hover:underline"
          >
            {group.asset.codename}
          </Link>
        </p>
      </div>

      <ConnectionSummary
        connection={connection}
        localAssetId={group.assetId}
      />

      <div className="flex gap-2 border-t border-border pt-3">
        {connection ? (
          <LinkButton
            href={`/connections/${connection.id}/edit`}
            variant="primary"
            className="flex-1 text-center"
          >
            Edit connection
          </LinkButton>
        ) : (
          <LinkButton
            href="/connections/new?type=POWER"
            variant="primary"
            className="flex-1 text-center"
          >
            Add connection
          </LinkButton>
        )}
      </div>
    </div>
  );
}

// ---------- NIC / PSU / KVM (label-based connection lookup) ----------
//
// Built-in NICs / PSUs / KVM channels don't have a structured ref on
// Connection — they're addressed by the auto-built label string. Match
// connections by (assetId AND label === expected) on either end.
async function findLabeledConnection(
  assetId: string,
  label: string,
) {
  return prisma.connection.findFirst({
    where: {
      OR: [
        { aEndAssetId: assetId, aEndLabel: label },
        { bEndAssetId: assetId, bEndLabel: label },
      ],
    },
    include: {
      aEnd: { select: { id: true, codename: true } },
      bEnd: { select: { id: true, codename: true } },
    },
  });
}

async function NicInspector({
  assetId,
  kind,
  index,
}: {
  assetId: string;
  kind: "eth" | "sfp";
  index: number;
}) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, codename: true, name: true, category: true },
  });
  if (!asset) notFound();
  const label =
    kind === "sfp"
      ? `Built-in SFP port ${index}`
      : `Built-in Ethernet port ${index}`;
  const connection = await findLabeledConnection(assetId, label);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black">
            {kind === "sfp" ? "SFP" : "NIC"} {index}
          </h3>
          <Badge>{kind === "sfp" ? "SFP" : "Ethernet"}</Badge>
          <Badge tone={connection ? "success" : "neutral"}>
            {connection ? "Connected" : "Empty"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[12px] text-text-dim">
          Built-in on{" "}
          <Link
            href={`/assets/${asset.id}`}
            className="text-accent hover:underline"
          >
            {asset.codename}
          </Link>
        </p>
      </div>

      <ConnectionSummary connection={connection} localAssetId={asset.id} />

      <div className="flex gap-2 border-t border-border pt-3">
        {connection ? (
          <LinkButton
            href={`/connections/${connection.id}/edit`}
            variant="primary"
            className="flex-1 text-center"
          >
            Edit connection
          </LinkButton>
        ) : (
          <LinkButton
            href="/connections/new?type=NETWORK"
            variant="primary"
            className="flex-1 text-center"
          >
            Add connection
          </LinkButton>
        )}
      </div>
    </div>
  );
}

async function PsuInspector({
  assetId,
  index,
}: {
  assetId: string;
  index: number;
}) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, codename: true, name: true, psuCount: true },
  });
  if (!asset) notFound();
  // Labels from the connection form may be "PSU 1" or "PSU 1 port 1". Match
  // "PSU <index>" exactly or followed by a space — never "PSU 10" for index 1.
  const connection = await prisma.connection.findFirst({
    where: {
      OR: [
        { aEndAssetId: assetId, aEndLabel: `PSU ${index}` },
        { aEndAssetId: assetId, aEndLabel: { startsWith: `PSU ${index} ` } },
        { bEndAssetId: assetId, bEndLabel: `PSU ${index}` },
        { bEndAssetId: assetId, bEndLabel: { startsWith: `PSU ${index} ` } },
      ],
    },
    include: {
      aEnd: { select: { id: true, codename: true } },
      bEnd: { select: { id: true, codename: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black">PSU {index}</h3>
          <Badge tone={connection ? "success" : "neutral"}>
            {connection ? "Powered" : "Unplugged"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[12px] text-text-dim">
          Power supply on{" "}
          <Link
            href={`/assets/${asset.id}`}
            className="text-accent hover:underline"
          >
            {asset.codename}
          </Link>
        </p>
      </div>

      <ConnectionSummary connection={connection} localAssetId={asset.id} />

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {connection ? (
          <LinkButton
            href={`/connections/${connection.id}/edit`}
            variant="primary"
            className="flex-1 text-center"
          >
            Edit connection
          </LinkButton>
        ) : (
          <LinkButton
            href="/connections/new?type=POWER"
            variant="primary"
            className="flex-1 text-center"
          >
            Add power connection
          </LinkButton>
        )}
      </div>
    </div>
  );
}

async function KvmInspector({
  assetId,
  channel,
}: {
  assetId: string;
  channel: number;
}) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, codename: true, name: true },
  });
  if (!asset) notFound();
  const connection = await findLabeledConnection(assetId, `Channel ${channel}`);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black">Channel {channel}</h3>
          <Badge tone={connection ? "success" : "neutral"}>
            {connection ? "Mapped" : "Unmapped"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[12px] text-text-dim">
          KVM channel on{" "}
          <Link
            href={`/assets/${asset.id}`}
            className="text-accent hover:underline"
          >
            {asset.codename}
          </Link>
        </p>
      </div>

      <ConnectionSummary connection={connection} localAssetId={asset.id} />

      <div className="flex gap-2 border-t border-border pt-3">
        {connection ? (
          <LinkButton
            href={`/connections/${connection.id}/edit`}
            variant="primary"
            className="flex-1 text-center"
          >
            Edit mapping
          </LinkButton>
        ) : (
          <LinkButton
            href="/connections/new?type=KVM"
            variant="primary"
            className="flex-1 text-center"
          >
            Map to a server
          </LinkButton>
        )}
      </div>
    </div>
  );
}

// ---------- PCIe NIC port ----------
async function PciNicInspector({
  componentId,
  portNumber,
}: {
  componentId: string;
  portNumber: number;
}) {
  const component = await prisma.component.findUnique({
    where: { id: componentId },
    select: {
      id: true,
      name: true,
      type: true,
      portCount: true,
      portType: true,
      portSpeed: true,
      manufacturer: true,
      installedIn: { select: { id: true, codename: true } },
      pciSlot: { select: { sortOrder: true } },
    },
  });
  if (!component) notFound();

  // Slot-encoded label so identically-named cards in one host don't collide.
  const label =
    component.pciSlot != null
      ? pciNicPortLabel(component.name, component.pciSlot.sortOrder, portNumber)
      : `${component.name} Port ${portNumber}`;
  const connection = component.installedIn
    ? await findLabeledConnection(component.installedIn.id, label)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black">Port {portNumber}</h3>
          <Badge>
            {(component.portType
              ? (PORT_TYPE_LABELS as Record<string, string>)[component.portType]
              : null) ??
              component.portType ??
              "NIC"}
          </Badge>
          {component.portSpeed && <Badge>{component.portSpeed}</Badge>}
          <Badge tone={connection ? "success" : "neutral"}>
            {connection ? "Connected" : "Empty"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[12px] text-text-dim">
          From{" "}
          <Link
            href={`/components/${component.id}`}
            className="text-accent hover:underline"
          >
            {component.name}
          </Link>
          {component.installedIn && (
            <>
              {" "}· on{" "}
              <Link
                href={`/assets/${component.installedIn.id}`}
                className="text-accent hover:underline"
              >
                {component.installedIn.codename}
              </Link>
            </>
          )}
        </p>
      </div>

      <ConnectionSummary
        connection={connection}
        localAssetId={component.installedIn?.id ?? ""}
      />

      <div className="flex gap-2 border-t border-border pt-3">
        {connection ? (
          <LinkButton
            href={`/connections/${connection.id}/edit`}
            variant="primary"
            className="flex-1 text-center"
          >
            Edit connection
          </LinkButton>
        ) : (
          <>
            <LinkButton
              href={`/components/${component.id}`}
              variant="secondary"
              className="flex-1 text-center"
            >
              Open component
            </LinkButton>
            {component.installedIn && (
              <LinkButton
                href={`/connections/new?type=NETWORK&aEndAssetId=${component.installedIn.id}&aEndLabel=${encodeURIComponent(label)}`}
                variant="primary"
                className="flex-1 text-center"
              >
                Add connection
              </LinkButton>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Shared block — renders "what's plugged into this" with a link to the
// counterpart. Used by every port/outlet/NIC/PSU/KVM inspector.
function ConnectionSummary({
  connection,
  localAssetId,
}: {
  connection: {
    id: string;
    type: string;
    aEndAssetId: string;
    bEndAssetId: string | null;
    aEndLabel: string;
    bEndLabel: string | null;
    aEnd: { id: string; codename: string };
    bEnd: { id: string; codename: string } | null;
    cableCategory: string | null;
    cableLengthFeet: number | null;
    estimatedCableLengthFeet: number | null;
    isPatch: boolean;
  } | null;
  localAssetId: string;
}) {
  if (!connection) {
    return (
      <p className="rounded-md border border-dashed border-border bg-panel-2 px-3 py-3 text-[12px] text-faint">
        Nothing plugged in yet.
      </p>
    );
  }
  const fromHere = connection.aEndAssetId === localAssetId;
  const counterpart = fromHere ? connection.bEnd : connection.aEnd;
  const counterpartLabel = fromHere ? connection.bEndLabel : connection.aEndLabel;
  const length =
    connection.cableLengthFeet ?? connection.estimatedCableLengthFeet;
  return (
    <div className="rounded-md border border-border bg-panel-2 p-3">
      <div className="flex items-center gap-2">
        <Badge tone="accent">{enumLabel(connection.type)}</Badge>
        {connection.isPatch && <Badge>Patch</Badge>}
        {connection.cableCategory && <Badge>{connection.cableCategory}</Badge>}
        {length != null && (
          <span className="ml-auto text-[11px] text-text-dim">
            {connection.cableLengthFeet != null ? `${length} ft` : `~${length} ft`}
          </span>
        )}
      </div>
      <p className="mt-2 text-[12.5px]">
        Connected to{" "}
        {counterpart ? (
          <Link
            href={`/assets/${counterpart.id}`}
            className="font-bold text-accent hover:underline"
          >
            {counterpart.codename}
          </Link>
        ) : (
          <span className="text-faint">(unknown counterpart)</span>
        )}
        {counterpartLabel && (
          <>
            <span className="text-text-dim"> · </span>
            <span>{counterpartLabel}</span>
          </>
        )}
      </p>
    </div>
  );
}
