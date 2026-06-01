import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AssetForm, type AssetFormData } from "@/components/forms/asset-form";
import { dateInput } from "@/lib/format";
import { getSuggestions } from "@/lib/suggestions";
import { updateAsset } from "../../actions";

const PCI_INSTALLABLE_TYPES = ["NIC_CARD", "GPU", "PCIE_CARD", "RAID_CONTROLLER", "NVME_RISER"] as const;

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [asset, storages, suggestions, pciInventory] = await Promise.all([
    prisma.asset.findUnique({
      where: { id },
      include: {
        bayZones: { orderBy: { sortOrder: "asc" } },
        portGroups: { orderBy: { sortOrder: "asc" } },
        outletGroups: { orderBy: { sortOrder: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        components: {
          where: { type: { in: ["CPU", "RAM"] } },
          orderBy: { createdAt: "asc" },
        },
        pciSlots: {
          orderBy: { sortOrder: "asc" },
          include: {
            occupiedBy: { select: { id: true, name: true, type: true } },
          },
        },
        psus: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.storage.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getSuggestions(),
    prisma.component.findMany({
      where: {
        type: { in: [...PCI_INSTALLABLE_TYPES] },
        installedInId: null,
        pciSlot: null,
      },
      select: { id: true, name: true, type: true, portCount: true, portType: true, portSpeed: true, cardSize: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!asset) notFound();

  const data: AssetFormData = {
    id: asset.id,
    codename: asset.codename,
    name: asset.name,
    category: asset.category,
    manufacturer: asset.manufacturer ?? "",
    modelNumber: asset.modelNumber ?? "",
    serialNumber: asset.serialNumber ?? "",
    condition: asset.condition ?? "",
    purchaseDate: dateInput(asset.purchaseDate),
    purchasePrice: asset.purchasePrice?.toString() ?? "",
    purchasePriceBeforeShip: asset.purchasePriceBeforeShip?.toString() ?? "",
    purchasedFrom: asset.purchasedFrom ?? "",
    purchasedFromUrl: asset.purchasedFromUrl ?? "",
    state: asset.state,
    soldDate: dateInput(asset.soldDate),
    soldPrice: asset.soldPrice?.toString() ?? "",
    notes: asset.notes ?? "",
    imageGallery: JSON.stringify(
      asset.images.map((img) => ({ path: img.path, isMain: img.isMain }))
    ),
    formFactor: asset.formFactor,
    faceOrientation: asset.faceOrientation ?? "FRONT_FRONT",
    rackFace: asset.rackFace ?? "",
    heightInches: asset.heightInches?.toString() ?? "",
    widthInches: asset.widthInches?.toString() ?? "",
    depthInches: asset.depthInches?.toString() ?? "",
    rackUnits: asset.rackUnits?.toString() ?? "",
    requiresSupport: asset.requiresSupport,
    storageId: asset.storageId ?? "",
    builtInEthernetCount: asset.builtInEthernetCount?.toString() ?? "",
    builtInSfpCount: asset.builtInSfpCount?.toString() ?? "",
    builtInPortsSide: asset.builtInPortsSide ?? "",
    surgeProtectedEthernetCount:
      asset.surgeProtectedEthernetCount?.toString() ?? "",
    kvmChannelCount: asset.kvmChannelCount?.toString() ?? "",
    psuCount: asset.psuCount?.toString() ?? "",
    chassis: asset.chassis ?? "",
    mainboard: asset.mainboard ?? "",
    raidController: asset.raidController ?? "",
    operatingSystem: asset.operatingSystem ?? "",
    biosVersion: asset.biosVersion ?? "",
    extras: asset.extras ?? "",
    maxPowerDrawWatts: asset.maxPowerDrawWatts?.toString() ?? "",
    idlePowerWatts: asset.idlePowerWatts?.toString() ?? "",
    warrantyEndDate: dateInput(asset.warrantyEndDate),
    firmwareVersion: asset.firmwareVersion ?? "",
    managementType: asset.managementType ?? "",
    poeBudgetWatts: asset.poeBudgetWatts?.toString() ?? "",
    throughputGbps: asset.throughputGbps?.toString() ?? "",
    maxConcurrentConnections: asset.maxConcurrentConnections?.toString() ?? "",
    vaRating: asset.vaRating?.toString() ?? "",
    wattsRating: asset.wattsRating?.toString() ?? "",
    estimatedRuntimeMinutes: asset.estimatedRuntimeMinutes?.toString() ?? "",
    amperage: asset.amperage ?? "",
    pduType: asset.pduType ?? "",
    supportedProtocols: asset.supportedProtocols ?? "",
    wifiStandard: asset.wifiStandard ?? "",
    maxThroughputMbps: asset.maxThroughputMbps?.toString() ?? "",
    bandSupport: asset.bandSupport ?? "",
    bandsLegacyText: asset.bandsLegacyText ?? "",
    poeInputType: asset.poeInputType ?? "",
    placement: asset.placement ?? "",
    maxLoadLbs: asset.maxLoadLbs?.toString() ?? "",
    ventilated: asset.ventilated ?? false,
    drawerType: asset.drawerType ?? "",
    pulloutDepthInches: asset.pulloutDepthInches?.toString() ?? "",
    purpose: asset.purpose ?? "",
    patchPanelType: asset.patchPanelType ?? "",
    bayZones: asset.bayZones.map((z) => ({
      id: z.id,
      name: z.name,
      faceSide: z.faceSide,
      driveSize: z.driveSize,
      bayCount: z.bayCount,
      sortOrder: z.sortOrder,
    })),
    portGroups: asset.portGroups.map((g) => ({
      id: g.id,
      name: g.name,
      portCount: g.portCount,
      portType: g.portType,
      portSpeed: g.portSpeed,
      poePerPort: g.poePerPort,
      side: g.side,
      sortOrder: g.sortOrder,
    })),
    outletGroups: asset.outletGroups.map((g) => ({
      id: g.id,
      name: g.name,
      outletCount: g.outletCount,
      outletType: g.outletType,
      batteryBacked: g.batteryBacked,
      surgeProtected: g.surgeProtected,
      side: g.side,
      sortOrder: g.sortOrder,
    })),
    cpus: asset.components
      .filter((c) => c.type === "CPU")
      .map((c) => ({
        id: c.id,
        name: c.name,
        manufacturer: c.manufacturer,
        model: c.model,
        quantity: c.quantity,
        speedGHz: c.speedGHz,
        cores: c.cores,
        threads: c.threads,
        socket: c.socket,
        tdpWatts: c.tdpWatts,
      })),
    rams: asset.components
      .filter((c) => c.type === "RAM")
      .map((c) => ({
        id: c.id,
        name: c.name,
        manufacturer: c.manufacturer,
        model: c.model,
        quantity: c.quantity,
        capacityGB: c.capacityGB,
        speedMHz: c.speedMHz,
        generation: c.generation,
        ecc: c.ecc,
        formFactor: c.formFactor,
      })),
    pciSlots: asset.pciSlots.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      size: s.size,
      occupiedByComponentId: s.occupiedByComponentId ?? null,
      occupiedByName: s.occupiedBy?.name ?? null,
    })),
    psus: asset.psus.map((p) => ({
      id: p.id,
      sortOrder: p.sortOrder,
      side: p.side as "LEFT" | "CENTER" | "RIGHT",
      wattage: p.wattage ?? null,
      portCount: p.portCount,
      state: p.state as "IN_USE" | "STORED" | "SOLD" | "JUNKED",
      manufacturer: p.manufacturer ?? null,
      model: p.model ?? null,
    })),
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit asset</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">{asset.codename}</p>
      </div>
      <AssetForm
        action={updateAsset.bind(null, asset.id)}
        asset={data}
        storages={storages}
        suggestions={suggestions}
        submitLabel="Save changes"
        pciInventory={pciInventory}
      />
    </div>
  );
}
