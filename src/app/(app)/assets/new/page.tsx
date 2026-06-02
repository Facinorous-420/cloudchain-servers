import { prisma } from "@/lib/prisma";
import { AssetForm, type AssetFormData } from "@/components/forms/asset-form";
import { getSuggestions } from "@/lib/suggestions";
import { createAsset } from "../actions";
import { loadPresetMeta, loadPreset, assetPresetToFormData } from "@/lib/presets";
import { PresetPicker } from "@/components/preset-picker";

const PCI_INSTALLABLE_TYPES = ["NIC_CARD", "GPU", "PCIE_CARD", "RAID_CONTROLLER", "NVME_RISER"] as const;

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ fromId?: string; preset?: string; skip?: string; category?: string }>;
}) {
  const { fromId, preset: presetId, skip, category: categoryParam } = await searchParams;

  // Load preset metadata for the picker (always — cheap, just reads folder names + JSON).
  const presetMeta = await loadPresetMeta("assets");

  const [storages, suggestions, source, selectedPreset, pciInventory] = await Promise.all([
    prisma.storage.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getSuggestions(),
    fromId
      ? prisma.asset.findUnique({
          where: { id: fromId },
          include: {
            bayZones: { orderBy: { sortOrder: "asc" } },
            portGroups: { orderBy: { sortOrder: "asc" } },
            outletGroups: { orderBy: { sortOrder: "asc" } },
            pciSlots: { orderBy: { sortOrder: "asc" } },
            components: {
              where: { type: { in: ["CPU", "RAM"] } },
              orderBy: { createdAt: "asc" },
            },
          },
        })
      : Promise.resolve(null),
    presetId ? loadPreset("assets", presetId) : Promise.resolve(null),
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

  const isDuplicating = Boolean(source);
  const usingPreset = Boolean(selectedPreset);
  // Show the picker when no preset/duplicate is active AND the user hasn't clicked "skip".
  const showPicker = !isDuplicating && !usingPreset && !skip;

  let prefill: AssetFormData | undefined;

  if (source) {
    prefill = {
      id: "",
      codename: "",
      serialNumber: "",
      state: "IN_USE",
      soldDate: "",
      soldPrice: "",
      storageId: "",
      imageGallery: "[]", rackRenderFrontPath: "", rackRenderRearPath: "",
      annotations: [], builtInGridRow: "", builtInGridCol: "", builtInFace: "",
      bandsLegacyText: "",
      name: source.name,
      category: source.category,
      manufacturer: source.manufacturer ?? "",
      modelNumber: source.modelNumber ?? "",
      condition: source.condition ?? "",
      purchaseDate: "",
      purchasePrice: "",
      purchasePriceBeforeShip: "",
      purchasedFrom: source.purchasedFrom ?? "",
      purchasedFromUrl: source.purchasedFromUrl ?? "",
      notes: source.notes ?? "",
      formFactor: source.formFactor,
      faceOrientation: source.faceOrientation ?? "FRONT_FRONT",
      rackFace: source.rackFace ?? "",
      heightInches: source.heightInches?.toString() ?? "",
      widthInches: source.widthInches?.toString() ?? "",
      depthInches: source.depthInches?.toString() ?? "",
      rackUnits: source.rackUnits?.toString() ?? "",
      requiresSupport: source.requiresSupport,
      builtInEthernetCount: source.builtInEthernetCount?.toString() ?? "",
      builtInSfpCount: source.builtInSfpCount?.toString() ?? "",
      builtInPortsSide: source.builtInPortsSide ?? "",
      surgeProtectedEthernetCount: source.surgeProtectedEthernetCount?.toString() ?? "",
      kvmChannelCount: source.kvmChannelCount?.toString() ?? "",
      psuCount: source.psuCount?.toString() ?? "",
      chassis: source.chassis ?? "",
      mainboard: source.mainboard ?? "",
      raidController: source.raidController ?? "",
      operatingSystem: source.operatingSystem ?? "",
      biosVersion: source.biosVersion ?? "",
      extras: source.extras ?? "",
      maxPowerDrawWatts: source.maxPowerDrawWatts?.toString() ?? "",
      idlePowerWatts: source.idlePowerWatts?.toString() ?? "",
      warrantyEndDate: "",
      firmwareVersion: source.firmwareVersion ?? "",
      managementType: source.managementType ?? "",
      poeBudgetWatts: source.poeBudgetWatts?.toString() ?? "",
      throughputGbps: source.throughputGbps?.toString() ?? "",
      maxConcurrentConnections: source.maxConcurrentConnections?.toString() ?? "",
      vaRating: source.vaRating?.toString() ?? "",
      wattsRating: source.wattsRating?.toString() ?? "",
      estimatedRuntimeMinutes: source.estimatedRuntimeMinutes?.toString() ?? "",
      amperage: source.amperage ?? "",
      pduType: source.pduType ?? "",
      supportedProtocols: source.supportedProtocols ?? "",
      wifiStandard: source.wifiStandard ?? "",
      maxThroughputMbps: source.maxThroughputMbps?.toString() ?? "",
      bandSupport: source.bandSupport ?? "",
      poeInputType: source.poeInputType ?? "",
      placement: source.placement ?? "",
      maxLoadLbs: source.maxLoadLbs?.toString() ?? "",
      ventilated: source.ventilated ?? false,
      drawerType: source.drawerType ?? "",
      pulloutDepthInches: source.pulloutDepthInches?.toString() ?? "",
      purpose: source.purpose ?? "",
      patchPanelType: source.patchPanelType ?? "",
      bayZones: source.bayZones.map((z) => ({
        id: z.id,
        name: z.name,
        faceSide: z.faceSide,
        driveSize: z.driveSize,
        bayCount: z.bayCount,
        sortOrder: z.sortOrder,
      })),
      portGroups: source.portGroups.map((g) => ({
        id: g.id,
        name: g.name,
        portCount: g.portCount,
        portType: g.portType,
        portSpeed: g.portSpeed,
        poePerPort: g.poePerPort,
        side: g.side,
        sortOrder: g.sortOrder,
      })),
      outletGroups: source.outletGroups.map((g) => ({
        id: g.id,
        name: g.name,
        outletCount: g.outletCount,
        outletType: g.outletType,
        batteryBacked: g.batteryBacked,
        surgeProtected: g.surgeProtected,
        side: g.side,
        sortOrder: g.sortOrder,
      })),
      cpus: source.components
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
      rams: source.components
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
      pciSlots: source.pciSlots.map((s) => ({
        id: s.id,
        sortOrder: s.sortOrder,
        size: s.size,
      })),
      psus: [],
    };
  } else if (selectedPreset) {
    prefill = {
      id: "",
      ...assetPresetToFormData(selectedPreset.data, {
        source: selectedPreset.source,
        id: selectedPreset.id,
      }),
    };
  } else if (categoryParam) {
    // "Start from scratch" from the preset picker — category pre-selected.
    prefill = {
      id: "", codename: "", name: "", serialNumber: "", condition: "",
      manufacturer: "", modelNumber: "",
      purchaseDate: "", purchasePrice: "", purchasePriceBeforeShip: "",
      purchasedFrom: "", purchasedFromUrl: "", state: "IN_USE",
      soldDate: "", soldPrice: "", notes: "", imageGallery: "[]", rackRenderFrontPath: "", rackRenderRearPath: "",
      annotations: [], builtInGridRow: "", builtInGridCol: "", builtInFace: "",
      formFactor: "RACK", faceOrientation: "FRONT_FRONT", rackFace: "",
      heightInches: "", widthInches: "", depthInches: "",
      rackUnits: "", requiresSupport: false, storageId: "",
      builtInEthernetCount: "", builtInSfpCount: "", builtInPortsSide: "",
      surgeProtectedEthernetCount: "", kvmChannelCount: "", psuCount: "",
      chassis: "", mainboard: "", raidController: "", operatingSystem: "",
      biosVersion: "", extras: "", maxPowerDrawWatts: "", idlePowerWatts: "",
      warrantyEndDate: "", firmwareVersion: "", managementType: "",
      poeBudgetWatts: "", throughputGbps: "", maxConcurrentConnections: "",
      vaRating: "", wattsRating: "", estimatedRuntimeMinutes: "",
      amperage: "", pduType: "", supportedProtocols: "", wifiStandard: "",
      maxThroughputMbps: "", bandSupport: "", bandsLegacyText: "",
      poeInputType: "", placement: "", maxLoadLbs: "", ventilated: false,
      drawerType: "", pulloutDepthInches: "", purpose: "", patchPanelType: "",
      bayZones: [], portGroups: [], outletGroups: [], cpus: [], rams: [], pciSlots: [], psus: [],
      category: categoryParam,
    };
  }

  const presetName = selectedPreset
    ? (selectedPreset.data as { name: string }).name
    : null;

  if (showPicker) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-black">New asset</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Pick a device preset to auto-fill the form.
          </p>
        </div>
        <PresetPicker presets={presetMeta} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">
          {isDuplicating ? "Duplicate asset" : "New asset"}
        </h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          {isDuplicating ? (
            <>
              Copied from{" "}
              <span className="font-bold text-text">{source?.name}</span>.
              Set a new codename and serial number for this unit — everything
              else is pre-filled from the source.
            </>
          ) : usingPreset ? (
            <span className="flex items-center gap-2">
              <span>
                Using preset:{" "}
                <span className="font-bold text-text">{presetName}</span>
              </span>
              <a
                href="/assets/new"
                className="rounded px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/40 hover:bg-accent/10 transition-colors"
              >
                Change
              </a>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>Add a server, switch, UPS, or other rack gear.</span>
              <a
                href="/assets/new"
                className="rounded px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/40 hover:bg-accent/10 transition-colors"
              >
                Pick a preset
              </a>
            </span>
          )}
        </p>
      </div>
      <AssetForm
        action={createAsset}
        asset={prefill}
        storages={storages}
        suggestions={suggestions}
        submitLabel={isDuplicating ? "Create duplicate" : "Create asset"}
        pciInventory={pciInventory}
      />
    </div>
  );
}
