import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DetailField,
  DetailGrid,
  DetailSection,
} from "@/components/ui/detail";
import { Panel } from "@/components/ui/panel";
import { EntityImage } from "@/components/ui/entity-image";
import { formatDate, formatMoney } from "@/lib/format";
import {
  enumLabel,
  PORT_TYPE_LABELS,
  type PORT_TYPES,
} from "@/lib/enums";
import { CpuSection } from "@/components/asset-detail/cpu-section";
import { RamSection } from "@/components/asset-detail/ram-section";
import { DriveBaySections } from "@/components/asset-detail/drive-bay-section";
import { PciSection } from "@/components/asset-detail/pci-section";
import { SaveAsPresetButton } from "@/components/save-as-preset-button";
import { AssetDetailTabs, DetailTab } from "@/components/asset-detail/asset-detail-tabs";
import { RackFaceplatePreview } from "@/components/asset-detail/rack-preview";
import type { DiagramAsset } from "@/app/(app)/topology/rack-diagram";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      storage: { select: { id: true, name: true } },
      rack: { select: { id: true, name: true } },
      images: { orderBy: { sortOrder: "asc" } },
      parentAsset: { select: { id: true, codename: true } },
      shelfItems: {
        select: { id: true, codename: true, name: true, category: true },
        orderBy: { codename: "asc" },
      },
      bayZones: {
        orderBy: { sortOrder: "asc" },
        include: {
          drives: {
            orderBy: { bayNumber: "asc" },
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
          id: true, sortOrder: true, wattage: true,
          portCount: true, side: true, state: true,
          face: true, gridRow: true, gridCol: true,
        },
      },
      faceplateAnnotations: { orderBy: { sortOrder: "asc" } },
      components: {
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          type: true,
          quantity: true,
          manufacturer: true,
          model: true,
          speedGHz: true,
          cores: true,
          threads: true,
          tdpWatts: true,
          capacityGB: true,
          speedMHz: true,
          generation: true,
          ecc: true,
          wattsRating: true,
          portCount: true,
          portType: true,
          portSpeed: true,
        },
      },
      batteries: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          quantity: true,
          voltage: true,
          capacityAh: true,
        },
      },
      applications: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          operatingSystem: true,
          status: true,
        },
      },
      licenseLinks: {
        include: {
          license: { select: { id: true, name: true, type: true } },
        },
      },
      pciSlots: {
        orderBy: { sortOrder: "asc" },
        include: {
          occupiedBy: {
            select: {
              id: true,
              name: true,
              type: true,
              portCount: true,
              portType: true,
              portSpeed: true,
              m2SlotCount: true,
              bayZones: {
                include: {
                  drives: {
                    orderBy: { bayNumber: "asc" },
                    select: {
                      id: true,
                      name: true,
                      kind: true,
                      capacityGB: true,
                      bayNumber: true,
                    },
                  },
                },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!asset) notFound();

  const isServerLike =
    asset.category === "SERVER" || asset.category === "NUC" || asset.category === "SBC";

  // Spare components for quick-add dropdowns (only loaded for server-like assets)
  const spareComponents = isServerLike
    ? await prisma.component.findMany({
        where: {
          installedInId: null,
          state: { notIn: ["SOLD", "JUNKED"] },
          type: {
            in: [
              "CPU",
              "RAM",
              "PCIE_CARD",
              "NIC_CARD",
              "GPU",
              "NVME_RISER",
              "RAID_CONTROLLER",
            ],
          },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          type: true,
          capacityGB: true,
          speedGHz: true,
          cores: true,
          threads: true,
          generation: true,
          ecc: true,
          speedMHz: true,
          portCount: true,
          portSpeed: true,
          m2SlotCount: true,
          tdpWatts: true,
        },
      })
    : [];

  // Connections where this asset is either end. Pulled separately so we can
  // OR on both endpoint columns and include the other side's codename.
  const connections = await prisma.connection.findMany({
    where: {
      OR: [{ aEndAssetId: asset.id }, { bEndAssetId: asset.id }],
    },
    orderBy: [{ type: "asc" }, { aEndAssetId: "asc" }],
    include: {
      aEnd: { select: { id: true, codename: true } },
      bEnd: { select: { id: true, codename: true } },
    },
  });

  // Lookup maps so the per-port / per-outlet / per-channel views can find
  // whether a given port number is connected without an O(n²) scan.
  const portConnByKey = new Map<string, (typeof connections)[number]>();
  const outletConnByKey = new Map<string, (typeof connections)[number]>();
  const kvmChannelConn = new Map<number, (typeof connections)[number]>();
  for (const c of connections) {
    if (c.aEndAssetId === asset.id) {
      if (c.aEndPortGroupId && c.aEndPortNumber != null) {
        portConnByKey.set(`${c.aEndPortGroupId}:${c.aEndPortNumber}`, c);
      }
      if (c.aEndOutletGroupId && c.aEndOutletNumber != null) {
        outletConnByKey.set(`${c.aEndOutletGroupId}:${c.aEndOutletNumber}`, c);
      }
      if (c.type === "KVM") {
        const m = /channel\s+(\d+)/i.exec(c.aEndLabel);
        if (m) kvmChannelConn.set(Number(m[1]), c);
      }
    }
    if (c.bEndAssetId === asset.id) {
      if (c.bEndPortGroupId && c.bEndPortNumber != null) {
        portConnByKey.set(`${c.bEndPortGroupId}:${c.bEndPortNumber}`, c);
      }
      if (c.bEndOutletGroupId && c.bEndOutletNumber != null) {
        outletConnByKey.set(`${c.bEndOutletGroupId}:${c.bEndOutletNumber}`, c);
      }
      if (c.type === "KVM" && c.bEndLabel) {
        const m = /channel\s+(\d+)/i.exec(c.bEndLabel);
        if (m) kvmChannelConn.set(Number(m[1]), c);
      }
    }
  }

  // Build a DiagramAsset shape for the rack preview. Connected ports are all
  // empty (no connection colouring in the preview — it's just a shape preview).
  const diagramAsset: DiagramAsset = {
    id: asset.id,
    codename: asset.codename,
    name: asset.name,
    category: asset.category,
    formFactor: asset.formFactor,
    startU: asset.startU,
    rackUnits: asset.rackUnits,
    gridColumn: asset.gridColumn,
    columnSpan: asset.columnSpan,
    state: asset.state,
    requiresSupport: asset.requiresSupport,
    depthInches: asset.depthInches ?? null,
    widthInches: asset.widthInches ?? null,
    rackRenderFrontPath: asset.rackRenderFrontPath ?? null,
    rackRenderRearPath: asset.rackRenderRearPath ?? null,
    faceOrientation: asset.faceOrientation ?? null,
    rackFace: asset.rackFace ?? null,
    patchPanelType: asset.patchPanelType ?? null,
    kvmChannelCount: asset.kvmChannelCount,
    builtInEthernetCount: asset.builtInEthernetCount,
    builtInSfpCount: asset.builtInSfpCount,
    psuCount: asset.psuCount,
    builtInGridRow: asset.builtInGridRow,
    builtInGridCol: asset.builtInGridCol,
    builtInFace: asset.builtInFace,
    psus: asset.psus,
    connectedPsuOrders: [],
    connectedKvmChannels: [],
    annotations: asset.faceplateAnnotations.map((a) => ({
      face: a.face,
      kind: a.kind,
      text: a.text,
      gridRow: a.gridRow,
      gridCol: a.gridCol,
    })),
    bayZones: asset.bayZones,
    portGroups: asset.portGroups.map((pg) => ({
      ...pg,
      hiddenPorts: (pg.hiddenPorts as number[] | null) ?? null,
      connectedPorts: [],
    })),
    outletGroups: asset.outletGroups.map((og) => ({
      ...og,
      hiddenPorts: (og.hiddenPorts as number[] | null) ?? null,
      connectedOutlets: [],
    })),
    shelfItems: asset.shelfItems,
    pciNics: asset.pciSlots
      .filter(
        (s) =>
          (s.occupiedBy?.type === "NIC_CARD" || s.occupiedBy?.type === "RAID_CONTROLLER") &&
          (s.occupiedBy.portCount ?? 0) > 0,
      )
      .map((s) => ({
        componentId: s.occupiedBy!.id,
        slotSortOrder: s.sortOrder,
        portCount: s.occupiedBy!.portCount!,
        portType: s.occupiedBy!.portType ?? "ETHERNET",
        portSpeed: s.occupiedBy!.portSpeed ?? null,
        componentName: s.occupiedBy!.name,
      })),
  };

  const isServer = asset.category === "SERVER";
  const isNuc = asset.category === "NUC";
  const isSbc = asset.category === "SBC";
  const isSwitch = asset.category === "SWITCH";
  const isGwOrFw =
    asset.category === "GATEWAY" || asset.category === "FIREWALL";
  const isUps = asset.category === "UPS";
  const isPdu = asset.category === "PDU";
  const isKvm = asset.category === "KVM";
  const isAp = asset.category === "ACCESS_POINT";
  const isShelf = asset.category === "SHELF";
  const isDrawer = asset.category === "DRAWER";
  const isBlank = asset.category === "BLANK_PANEL";
  const hasPortGroups = isSwitch || isGwOrFw || isAp;
  const hasOutletGroups = isUps || isPdu;

  const cpus = asset.components.filter((c) => c.type === "CPU");
  const rams = asset.components.filter((c) => c.type === "RAM");
  const otherComponents = asset.components.filter(
    (c) => c.type !== "CPU" && c.type !== "RAM",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                asset.state === "IN_USE" ? "bg-status-green" : "bg-faint"
              }`}
              title={asset.state === "IN_USE" ? "In use" : "Retired / spare"}
            />
            <h1 className="text-xl font-black">{asset.codename}</h1>
            <Badge tone="accent">{enumLabel(asset.category)}</Badge>
            <Badge>{enumLabel(asset.location)}</Badge>
            {asset.state !== "IN_USE" && <Badge>{asset.state.replace("_", " ")}</Badge>}
          </div>
          <p className="mt-0.5 text-[11.5px] text-text-dim">{asset.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/assets">Back</LinkButton>
          <SaveAsPresetButton assetId={asset.id} defaultName={asset.name} />
          <LinkButton href={`/assets/new?fromId=${asset.id}`}>
            Duplicate
          </LinkButton>
          <LinkButton href={`/assets/${asset.id}/edit`} variant="primary">
            Edit
          </LinkButton>
        </div>
      </div>

      <AssetDetailTabs hasRendering={true}>
      <DetailTab tab="rendering">
      <DetailSection title="Rack preview">
        <RackFaceplatePreview asset={diagramAsset} />
      </DetailSection>

      {asset.images.length > 0 && (
        <DetailSection title="Images">
          <div className="flex flex-wrap gap-3">
            {asset.images.map((img) => (
              <EntityImage
                key={img.id}
                path={img.path}
                alt={asset.codename}
                className={img.isMain ? "ring-2 ring-accent/60" : ""}
              />
            ))}
          </div>
        </DetailSection>
      )}
      </DetailTab>

      <DetailTab tab="general">
      <DetailSection title="Identification">
        <DetailGrid>
          <DetailField label="Name" value={asset.name} />
          <DetailField label="Category" value={enumLabel(asset.category)} />
          <DetailField label="Manufacturer" value={asset.manufacturer} />
          <DetailField label="Model" value={asset.modelNumber} />
          <DetailField label="Serial number" value={asset.serialNumber} />
          <DetailField label="Condition" value={asset.condition} />
        </DetailGrid>
      </DetailSection>
      </DetailTab>

      <DetailTab tab="size">
      <DetailSection title="Physical">
        <DetailGrid>
          <DetailField
            label="Form factor"
            value={enumLabel(asset.formFactor)}
          />
          <DetailField label="Rack units" value={asset.rackUnits} />
          <DetailField
            label="Height"
            value={asset.heightInches ? `${asset.heightInches} in` : null}
          />
          <DetailField
            label="Width"
            value={asset.widthInches ? `${asset.widthInches} in` : null}
          />
          <DetailField
            label="Depth"
            value={asset.depthInches ? `${asset.depthInches} in` : null}
          />
          <DetailField
            label="Requires support"
            value={asset.requiresSupport ? "Yes" : "No"}
          />
        </DetailGrid>
      </DetailSection>
      </DetailTab>

      <DetailTab tab="general">
      <DetailSection title="Placement">
        <DetailGrid>
          <DetailField label="Location" value={enumLabel(asset.location)} />
          <DetailField label="Storage">
            {asset.storage ? (
              <Link
                href={`/storages/${asset.storage.id}`}
                className="text-accent hover:underline"
              >
                {asset.storage.name}
              </Link>
            ) : null}
          </DetailField>
          <DetailField label="Rack">
            {asset.rack ? (
              <Link
                href={`/racks/${asset.rack.id}`}
                className="text-accent hover:underline"
              >
                {asset.rack.name}
              </Link>
            ) : null}
          </DetailField>
          {asset.rack && (
            <>
              <DetailField label="Start U" value={asset.startU} />
              <DetailField label="Grid column" value={asset.gridColumn} />
              <DetailField label="Column span" value={asset.columnSpan} />
            </>
          )}
          {asset.parentAsset && (
            <DetailField label="Sits on">
              <Link
                href={`/assets/${asset.parentAsset.id}`}
                className="text-accent hover:underline"
              >
                {asset.parentAsset.codename}
              </Link>
            </DetailField>
          )}
        </DetailGrid>
      </DetailSection>

      {(asset.maxPowerDrawWatts != null ||
        asset.idlePowerWatts != null ||
        asset.warrantyEndDate ||
        asset.firmwareVersion) && (
        <DetailSection title="Stats">
          <DetailGrid>
            <DetailField
              label="Max power draw"
              value={
                asset.maxPowerDrawWatts
                  ? `${asset.maxPowerDrawWatts} W`
                  : null
              }
            />
            <DetailField
              label="Idle power"
              value={
                asset.idlePowerWatts ? `${asset.idlePowerWatts} W` : null
              }
            />
            <DetailField
              label="Warranty end"
              value={formatDate(asset.warrantyEndDate)}
            />
            <DetailField
              label="Firmware version"
              value={asset.firmwareVersion}
            />
          </DetailGrid>
        </DetailSection>
      )}
      </DetailTab>

      <DetailTab tab="hardware">
      {isServerLike && (
        <DetailSection title="Current hardware">
          <DetailGrid>
            <DetailField label="Chassis" value={asset.chassis} />
            <DetailField label="Mainboard" value={asset.mainboard} />
            <DetailField
              label="RAID controller"
              value={asset.raidController}
            />
            <DetailField
              label="Operating system"
              value={asset.operatingSystem}
            />
            <DetailField label="BIOS version" value={asset.biosVersion} />
            <DetailField
              label="Built-in Ethernet"
              value={asset.builtInEthernetCount}
            />
            <DetailField label="Built-in SFP" value={asset.builtInSfpCount} />
            <DetailField label="PSUs" value={asset.psuCount} />
          </DetailGrid>
          {asset.extras && (
            <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-[13px] text-text">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-text-dim">
                Extras
              </span>
              {asset.extras}
            </p>
          )}
        </DetailSection>
      )}

      {isServerLike && (
        <DetailSection title="CPUs">
          <CpuSection
            assetId={asset.id}
            cpus={cpus}
            spareCpus={spareComponents.filter((c) => c.type === "CPU")}
          />
        </DetailSection>
      )}

      {isServerLike && (
        <DetailSection title="RAM">
          <RamSection
            assetId={asset.id}
            rams={rams}
            spareRams={spareComponents.filter((c) => c.type === "RAM")}
          />
        </DetailSection>
      )}

      {asset.bayZones.length > 0 && (
        <DetailSection title="Drive bays">
          <DriveBaySections assetId={asset.id} zones={asset.bayZones} />
        </DetailSection>
      )}

      {asset.pciSlots.length > 0 && (
        <DetailSection title="PCIe slots">
          <PciSection
            assetId={asset.id}
            slots={asset.pciSlots}
            spareComponents={spareComponents.filter((c) =>
              ["PCIE_CARD", "NIC_CARD", "GPU", "NVME_RISER", "RAID_CONTROLLER"].includes(
                c.type,
              ),
            )}
          />
        </DetailSection>
      )}

      {hasPortGroups && asset.portGroups.length > 0 && (
        <DetailSection
          title="Port groups"
          description="Each port shows what is plugged in. Click an occupied port to edit the connection."
        >
          <div className="flex flex-col gap-4">
            {asset.portGroups.map((g) => (
              <PortGroupBlock
                key={g.id}
                group={g}
                assetId={asset.id}
                portConnByKey={portConnByKey}
              />
            ))}
          </div>
        </DetailSection>
      )}

      {hasOutletGroups && asset.outletGroups.length > 0 && (
        <DetailSection
          title="Outlet groups"
          description="Each outlet shows what is plugged in."
        >
          <div className="flex flex-col gap-4">
            {asset.outletGroups.map((g) => (
              <OutletGroupBlock
                key={g.id}
                group={g}
                assetId={asset.id}
                outletConnByKey={outletConnByKey}
              />
            ))}
          </div>
        </DetailSection>
      )}

      {isKvm && (asset.kvmChannelCount ?? 0) > 0 && (
        <DetailSection
          title="KVM channels"
          description="Each channel button on the KVM switch and which server it routes to."
        >
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: asset.kvmChannelCount ?? 0 }, (_, i) => {
              const n = i + 1;
              const conn = kvmChannelConn.get(n);
              const other =
                conn?.aEndAssetId === asset.id ? conn?.bEnd : conn?.aEnd;
              const otherLabel =
                conn?.aEndAssetId === asset.id
                  ? conn?.bEndLabel
                  : conn?.aEndLabel;
              return (
                <li
                  key={n}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-panel-2 px-3 py-2 text-[12.5px]"
                >
                  <span className="font-bold">Channel {n}</span>
                  {conn && other ? (
                    <Link
                      href={`/connections/${conn.id}/edit`}
                      className="truncate text-accent hover:underline"
                      title={`${other.codename} ${otherLabel ?? ""}`}
                    >
                      {other.codename}
                    </Link>
                  ) : (
                    <span className="text-faint">Unused</span>
                  )}
                </li>
              );
            })}
          </ul>
        </DetailSection>
      )}

      {isSwitch && (
        <DetailSection title="Switch">
          <DetailGrid>
            <DetailField
              label="Management type"
              value={asset.managementType}
            />
            <DetailField
              label="PoE budget"
              value={
                asset.poeBudgetWatts ? `${asset.poeBudgetWatts} W` : null
              }
            />
          </DetailGrid>
        </DetailSection>
      )}

      {isGwOrFw && (
        <DetailSection title={isGwOrFw && asset.category === "GATEWAY" ? "Gateway" : "Firewall"}>
          <DetailGrid>
            <DetailField
              label="Throughput"
              value={
                asset.throughputGbps ? `${asset.throughputGbps} Gbps` : null
              }
            />
            <DetailField
              label="Max concurrent connections"
              value={asset.maxConcurrentConnections}
            />
          </DetailGrid>
        </DetailSection>
      )}

      {isUps && (
        <DetailSection title="UPS">
          <DetailGrid>
            <DetailField
              label="VA rating"
              value={asset.vaRating ? `${asset.vaRating} VA` : null}
            />
            <DetailField
              label="Wattage rating"
              value={asset.wattsRating ? `${asset.wattsRating} W` : null}
            />
            <DetailField
              label="Estimated runtime"
              value={
                asset.estimatedRuntimeMinutes
                  ? `${asset.estimatedRuntimeMinutes} min`
                  : null
              }
            />
            <DetailField
              label="Surge-protected Ethernet"
              value={asset.surgeProtectedEthernetCount}
            />
          </DetailGrid>
        </DetailSection>
      )}

      {isPdu && (
        <DetailSection title="PDU">
          <DetailGrid>
            <DetailField label="Amperage" value={asset.amperage} />
            <DetailField label="PDU type" value={asset.pduType} />
          </DetailGrid>
        </DetailSection>
      )}

      {isKvm && (
        <DetailSection title="KVM">
          <DetailGrid>
            <DetailField label="Channels" value={asset.kvmChannelCount} />
            <DetailField
              label="Supported protocols"
              value={asset.supportedProtocols}
            />
          </DetailGrid>
        </DetailSection>
      )}

      {isAp && (
        <DetailSection title="Access point">
          <DetailGrid>
            <DetailField label="Wi-Fi standard" value={asset.wifiStandard} />
            <DetailField
              label="Max throughput"
              value={
                asset.maxThroughputMbps
                  ? `${asset.maxThroughputMbps} Mbps`
                  : null
              }
            />
            <DetailField label="Bands" value={asset.bandSupport} />
            <DetailField label="PoE input" value={asset.poeInputType} />
            <DetailField label="Placement" value={asset.placement} />
            <DetailField
              label="Built-in Ethernet"
              value={asset.builtInEthernetCount}
            />
          </DetailGrid>
        </DetailSection>
      )}

      {isShelf && (
        <DetailSection title="Shelf">
          <DetailGrid>
            <DetailField
              label="Max load"
              value={asset.maxLoadLbs ? `${asset.maxLoadLbs} lbs` : null}
            />
            <DetailField
              label="Ventilated"
              value={
                asset.ventilated == null
                  ? null
                  : asset.ventilated
                    ? "Yes"
                    : "No"
              }
            />
          </DetailGrid>
        </DetailSection>
      )}

      {isDrawer && (
        <DetailSection title="Drawer">
          <DetailGrid>
            <DetailField label="Drawer type" value={asset.drawerType} />
            <DetailField
              label="Pullout depth"
              value={
                asset.pulloutDepthInches
                  ? `${asset.pulloutDepthInches} in`
                  : null
              }
            />
          </DetailGrid>
        </DetailSection>
      )}

      {isBlank && (
        <DetailSection title="Blank panel">
          <DetailGrid>
            <DetailField label="Purpose" value={asset.purpose} />
          </DetailGrid>
        </DetailSection>
      )}

      {asset.shelfItems.length > 0 && (
        <DetailSection title="Items on this shelf">
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {asset.shelfItems.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/assets/${c.id}`}
                  className="text-accent hover:underline"
                >
                  {c.codename}
                </Link>
                <span className="text-text-dim">
                  {" "}
                  — {c.name} ({enumLabel(c.category)})
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {isServer && (
        <DetailSection
          title="Applications & VMs"
          description={`${asset.applications.length} entr${asset.applications.length === 1 ? "y" : "ies"}`}
          actions={
            <LinkButton
              href={`/applications/new?hostId=${asset.id}`}
              className="px-2.5 py-1 text-xs"
            >
              Add
            </LinkButton>
          }
        >
          {asset.applications.length === 0 ? (
            <p className="text-[13px] text-faint">
              No applications recorded for this server.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {asset.applications.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-panel-2 px-3 py-2 text-[13px]"
                >
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/applications/${a.id}/edit`}
                      className="font-bold text-accent hover:underline"
                    >
                      {a.name}
                    </Link>
                    <Badge>{enumLabel(a.type)}</Badge>
                  </div>
                  <span className="text-text-dim">
                    {[a.operatingSystem, a.status].filter(Boolean).join(" · ") ||
                      "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
      )}

      {isUps && asset.batteries.length > 0 && (
        <DetailSection title="Batteries">
          <ul className="flex flex-col gap-2">
            {asset.batteries.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-panel-2 px-3 py-2 text-[13px]"
              >
                <div>
                  <Link
                    href={`/batteries/${b.id}`}
                    className="font-bold text-accent hover:underline"
                  >
                    {b.name}
                  </Link>
                  <span className="ml-2 text-text-dim">×{b.quantity}</span>
                </div>
                <span className="text-text-dim">
                  {[
                    b.voltage ? `${b.voltage} V` : null,
                    b.capacityAh ? `${b.capacityAh} Ah` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {otherComponents.length > 0 && (
        <DetailSection
          title="Components installed"
          description={`${otherComponents.length} item${otherComponents.length === 1 ? "" : "s"} (excluding CPU/RAM)`}
        >
          <ul className="flex flex-col gap-2">
            {otherComponents.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-panel-2 px-3 py-2 text-[13px]"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/components/${c.id}`}
                    className="font-bold text-accent hover:underline"
                  >
                    {c.name}
                  </Link>
                  <Badge>{enumLabel(c.type)}</Badge>
                  <span className="text-text-dim">×{c.quantity}</span>
                </div>
                <span className="text-text-dim">
                  {[c.manufacturer, c.model].filter(Boolean).join(" ") || "—"}
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      </DetailTab>

      <DetailTab tab="general">
      {asset.licenseLinks.length > 0 && (
        <DetailSection title="Licenses assigned">
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {asset.licenseLinks.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/licenses/${l.license.id}`}
                  className="text-accent hover:underline"
                >
                  {l.license.name}
                </Link>
                {l.license.type && (
                  <span className="text-text-dim"> — {l.license.type}</span>
                )}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      </DetailTab>

      <DetailTab tab="hardware">
      {connections.length > 0 && (
        <DetailSection
          title="Connections"
          description={`${connections.length} link${connections.length === 1 ? "" : "s"}`}
          actions={
            <LinkButton
              href="/connections/new"
              className="px-2.5 py-1 text-xs"
            >
              Add
            </LinkButton>
          }
        >
          <ul className="flex flex-col gap-2">
            {connections.map((c) => {
              const isAEnd = c.aEndAssetId === asset.id;
              const localLabel = isAEnd ? c.aEndLabel : c.bEndLabel;
              const other = isAEnd ? c.bEnd : c.aEnd;
              const otherLabel = isAEnd ? c.bEndLabel : c.aEndLabel;
              const lengthFt =
                c.cableLengthFeet ?? c.estimatedCableLengthFeet;
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-panel-2 px-3 py-2 text-[13px]"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">{enumLabel(c.type)}</Badge>
                    <span className="font-bold">{localLabel}</span>
                    <span className="text-text-dim">↔</span>
                    {other ? (
                      <Link
                        href={`/assets/${other.id}`}
                        className="text-accent hover:underline"
                      >
                        {other.codename}
                      </Link>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                    {otherLabel && (
                      <span className="text-text-dim">{otherLabel}</span>
                    )}
                    {c.isPatch && <Badge>Patch</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    {c.cableCategory && (
                      <span className="text-text-dim">{c.cableCategory}</span>
                    )}
                    {lengthFt != null && (
                      <span className="text-text-dim">
                        {c.cableLengthFeet != null
                          ? `${lengthFt} ft`
                          : `~${lengthFt} ft`}
                      </span>
                    )}
                    <Link
                      href={`/connections/${c.id}/edit`}
                      className="text-[11.5px] text-text-dim hover:text-accent"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </DetailSection>
      )}

      </DetailTab>

      <DetailTab tab="general">
      <DetailSection title="Acquisition">
        <DetailGrid>
          <DetailField
            label="Purchase date"
            value={formatDate(asset.purchaseDate)}
          />
          <DetailField
            label="Purchase price"
            value={formatMoney(asset.purchasePrice)}
          />
          <DetailField
            label="Price (before shipping)"
            value={formatMoney(asset.purchasePriceBeforeShip)}
          />
          <DetailField label="Purchased from">
            {asset.purchasedFromUrl ? (
              <a
                href={asset.purchasedFromUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                {asset.purchasedFrom ?? asset.purchasedFromUrl}
              </a>
            ) : (
              asset.purchasedFrom
            )}
          </DetailField>
          <DetailField
            label="Sold date"
            value={formatDate(asset.soldDate)}
          />
          <DetailField
            label="Sold price"
            value={formatMoney(asset.soldPrice)}
          />
        </DetailGrid>
      </DetailSection>

      {asset.notes && (
        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-[13px] text-text">
            {asset.notes}
          </p>
        </DetailSection>
      )}
      </DetailTab>
      </AssetDetailTabs>
    </div>
  );
}

type EndpointConnection = {
  id: string;
  type: string;
  aEndAssetId: string;
  bEndAssetId: string | null;
  aEndLabel: string;
  bEndLabel: string | null;
  aEnd: { id: string; codename: string };
  bEnd: { id: string; codename: string } | null;
  cableLengthFeet: number | null;
  estimatedCableLengthFeet: number | null;
  cableCategory: string | null;
  isPatch: boolean;
};

function PortGroupBlock({
  group,
  assetId,
  portConnByKey,
}: {
  group: {
    id: string;
    name: string | null;
    portCount: number;
    portType: (typeof PORT_TYPES)[number];
    portSpeed: string | null;
    poePerPort: number | null;
    side: string;
  };
  assetId: string;
  portConnByKey: Map<string, EndpointConnection>;
}) {
  const ports = Array.from({ length: group.portCount }, (_, i) => i + 1);
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold">
            {group.name ?? PORT_TYPE_LABELS[group.portType]}
          </span>
          <Badge>{PORT_TYPE_LABELS[group.portType]}</Badge>
          {group.portSpeed && <Badge>{group.portSpeed}</Badge>}
          {group.poePerPort ? <Badge>{group.poePerPort}W PoE</Badge> : null}
          <Badge>{group.side.toLowerCase()} side</Badge>
        </div>
        <span className="text-[11.5px] text-text-dim">
          {ports.filter((n) => portConnByKey.has(`${group.id}:${n}`)).length} of{" "}
          {group.portCount} in use
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {ports.map((n) => {
          const conn = portConnByKey.get(`${group.id}:${n}`);
          if (!conn) {
            return (
              <div
                key={n}
                className="flex flex-col gap-0.5 rounded border border-border/50 bg-panel-2/40 px-2 py-1.5 text-[11px] text-faint"
              >
                <span className="text-[9.5px] font-bold uppercase">
                  Port {n}
                </span>
                <span>Empty</span>
              </div>
            );
          }
          const other =
            conn.aEndAssetId === assetId ? conn.bEnd : conn.aEnd;
          const otherLabel =
            conn.aEndAssetId === assetId ? conn.bEndLabel : conn.aEndLabel;
          return (
            <Link
              key={n}
              href={`/connections/${conn.id}/edit`}
              className="flex flex-col gap-0.5 rounded border border-status-green/50 bg-status-green/10 px-2 py-1.5 text-[11px] text-text hover:bg-status-green/20"
              title={`${other?.codename ?? "?"} ${otherLabel ?? ""}`}
            >
              <span className="text-[9.5px] font-bold uppercase text-text-dim">
                Port {n}
              </span>
              <span className="truncate font-bold">
                {other?.codename ?? "?"}
              </span>
              <span className="truncate text-[10px] text-text-dim">
                {otherLabel ?? ""}
              </span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function OutletGroupBlock({
  group,
  assetId,
  outletConnByKey,
}: {
  group: {
    id: string;
    name: string | null;
    outletCount: number;
    outletType: string | null;
    batteryBacked: boolean;
    surgeProtected: boolean;
    side: string;
  };
  assetId: string;
  outletConnByKey: Map<string, EndpointConnection>;
}) {
  const outlets = Array.from({ length: group.outletCount }, (_, i) => i + 1);
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold">
            {group.name ?? "Outlets"}
          </span>
          {group.outletType && <Badge>{group.outletType}</Badge>}
          {group.batteryBacked && <Badge tone="success">Battery</Badge>}
          {group.surgeProtected && <Badge>Surge</Badge>}
          <Badge>{group.side.toLowerCase()} side</Badge>
        </div>
        <span className="text-[11.5px] text-text-dim">
          {
            outlets.filter((n) => outletConnByKey.has(`${group.id}:${n}`))
              .length
          }{" "}
          of {group.outletCount} in use
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {outlets.map((n) => {
          const conn = outletConnByKey.get(`${group.id}:${n}`);
          if (!conn) {
            return (
              <div
                key={n}
                className="flex flex-col gap-0.5 rounded border border-border/50 bg-panel-2/40 px-2 py-1.5 text-[11px] text-faint"
              >
                <span className="text-[9.5px] font-bold uppercase">
                  Outlet {n}
                </span>
                <span>Empty</span>
              </div>
            );
          }
          const other =
            conn.aEndAssetId === assetId ? conn.bEnd : conn.aEnd;
          const otherLabel =
            conn.aEndAssetId === assetId ? conn.bEndLabel : conn.aEndLabel;
          return (
            <Link
              key={n}
              href={`/connections/${conn.id}/edit`}
              className="flex flex-col gap-0.5 rounded border border-status-green/50 bg-status-green/10 px-2 py-1.5 text-[11px] text-text hover:bg-status-green/20"
              title={`${other?.codename ?? "?"} ${otherLabel ?? ""}`}
            >
              <span className="text-[9.5px] font-bold uppercase text-text-dim">
                Outlet {n}
              </span>
              <span className="truncate font-bold">
                {other?.codename ?? "?"}
              </span>
              <span className="truncate text-[10px] text-text-dim">
                {otherLabel ?? ""}
              </span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
