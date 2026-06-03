import path from "path";
import fs from "fs/promises";
import { PRESET_SCHEMAS, type PresetEntityType, type AssetPreset } from "@/lib/schemas/presets/index";
import type { AssetFormData } from "@/components/forms/asset-form";
import type { BayZoneInput } from "@/lib/schemas/asset";
import type { PortGroupInput } from "@/lib/schemas/port-group";
import type { OutletGroupInput } from "@/lib/schemas/outlet-group";
import type { InlinePciSlotInput, InlinePsuInput, FaceplateAnnotationInput } from "@/lib/schemas/inline-components";

const PRESETS_ROOT = path.join(process.cwd(), "presets");
const SYSTEM_BASE = path.join(PRESETS_ROOT, "system");
const CUSTOM_BASE = path.join(PRESETS_ROOT, "custom");

export type PresetMeta = {
  id: string;      // folder name (slug)
  source: "system" | "custom";
  name: string;
  category?: string;
  manufacturer?: string;
  tags?: string[];
  thumbnailUrl?: string;
};

type ParsedPreset<T extends PresetEntityType> = {
  id: string;
  source: "system" | "custom";
  data: (typeof PRESET_SCHEMAS)[T]["_output"];
  thumbnailUrl?: string;
};

function thumbnailUrl(source: "system" | "custom", entityType: string, folder: string, relative: string): string {
  const src = `${source}/${entityType}/${folder}/${relative}`;
  return `/api/preset-image?src=${encodeURIComponent(src)}`;
}

// Reference identifying a parsed preset on disk, used to resolve its images.
export type PresetRef = { source: "system" | "custom"; id: string };

// Marker prefix for gallery entries that still point at a preset image on disk.
// On asset save these are copied into public/uploads (see materializePresetImages).
export const PRESET_IMAGE_PREFIX = "/api/preset-image?src=";

async function readEntityDir<T extends PresetEntityType>(
  base: string,
  source: "system" | "custom",
  entityType: T,
): Promise<ParsedPreset<T>[]> {
  const dir = path.join(base, entityType);
  let folders: string[];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const schema = PRESET_SCHEMAS[entityType];
  const results: ParsedPreset<T>[] = [];

  for (const folder of folders) {
    const jsonPath = path.join(dir, folder, "preset.json");
    let raw: unknown;
    try {
      const text = await fs.readFile(jsonPath, "utf-8");
      raw = JSON.parse(text);
    } catch {
      continue;
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) continue;

    const data = parsed.data as (typeof PRESET_SCHEMAS)[T]["_output"];
    const thumbField = (data as { thumbnail?: string }).thumbnail;
    const thumbUrl = thumbField ? thumbnailUrl(source, entityType, folder, thumbField) : undefined;

    results.push({ id: folder, source, data, thumbnailUrl: thumbUrl });
  }

  return results;
}

export async function loadPresets<T extends PresetEntityType>(entityType: T): Promise<ParsedPreset<T>[]> {
  const [system, custom] = await Promise.all([
    readEntityDir(SYSTEM_BASE, "system", entityType),
    readEntityDir(CUSTOM_BASE, "custom", entityType),
  ]);

  // Custom overrides system by id (same folder name → same slug)
  const map = new Map<string, ParsedPreset<T>>();
  for (const p of system) map.set(p.id, p);
  for (const p of custom) map.set(p.id, p);

  return Array.from(map.values()).sort((a, b) => {
    const aName = (a.data as { name: string }).name ?? a.id;
    const bName = (b.data as { name: string }).name ?? b.id;
    return aName.localeCompare(bName);
  });
}

export async function loadPreset<T extends PresetEntityType>(entityType: T, id: string): Promise<ParsedPreset<T> | null> {
  // Custom takes precedence over system
  for (const base of [CUSTOM_BASE, SYSTEM_BASE] as const) {
    const source = base === CUSTOM_BASE ? "custom" : "system";
    const jsonPath = path.join(base, entityType, id, "preset.json");
    let raw: unknown;
    try {
      const text = await fs.readFile(jsonPath, "utf-8");
      raw = JSON.parse(text);
    } catch {
      continue;
    }
    const schema = PRESET_SCHEMAS[entityType];
    const parsed = schema.safeParse(raw);
    if (!parsed.success) continue;
    const data = parsed.data as (typeof PRESET_SCHEMAS)[T]["_output"];
    const thumbField = (data as { thumbnail?: string }).thumbnail;
    const thumbUrl = thumbField ? thumbnailUrl(source, entityType, id, thumbField) : undefined;
    return { id, source, data, thumbnailUrl: thumbUrl } as ParsedPreset<T>;
  }
  return null;
}

// Returns lightweight metadata for the picker grid (no nested zones/groups).
export async function loadPresetMeta(entityType: PresetEntityType): Promise<PresetMeta[]> {
  const presets = await loadPresets(entityType);
  return presets.map((p) => {
    const d = p.data as Record<string, unknown>;
    return {
      id: p.id,
      source: p.source,
      name: (d.name as string) ?? p.id,
      category: d.category as string | undefined,
      manufacturer: d.manufacturer as string | undefined,
      tags: d.tags as string[] | undefined,
      thumbnailUrl: p.thumbnailUrl,
    };
  });
}

// Maps a validated asset preset to the string-value shape AssetForm expects.
// Instance-specific fields (codename, serial, acquisition) are left blank.
export function assetPresetToFormData(
  preset: AssetPreset,
  presetRef?: PresetRef,
): Omit<AssetFormData, "id"> {
  const str = (v: number | undefined): string => (v != null ? String(v) : "");
  const bool = (v: boolean | undefined): boolean => v ?? false;

  // Seed the image gallery from the preset's images (or its single thumbnail).
  // Entries point at /api/preset-image; they are copied into uploads on save.
  const presetImages = preset.images ?? (preset.thumbnail ? [preset.thumbnail] : []);
  const imageGallery =
    presetRef && presetImages.length > 0
      ? JSON.stringify(
          presetImages.map((rel, i) => ({
            path: thumbnailUrl(presetRef.source, "assets", presetRef.id, rel),
            isMain: i === 0,
          })),
        )
      : "[]";

  const bayZones: BayZoneInput[] = (preset.bayZones ?? []).map((z, i) => ({
    name: z.name,
    faceSide: z.faceSide,
    driveSize: z.driveSize,
    bayCount: z.bayCount,
    sortOrder: z.sortOrder ?? i,
    vertical: z.vertical ?? false,
    gridRow: z.gridRow ?? null,
    gridCol: z.gridCol ?? null,
    rows: z.rows ?? null,
    columns: z.columns ?? null,
  }));

  const portGroups: PortGroupInput[] = (preset.portGroups ?? []).map((g, i) => ({
    name: g.name ?? null,
    portCount: g.portCount,
    portType: g.portType,
    portSpeed: g.portSpeed ?? null,
    poePerPort: g.poePerPort ?? null,
    side: g.side ?? "LEFT",
    sortOrder: g.sortOrder ?? i,
    face: g.face ?? null,
    gridRow: g.gridRow ?? null,
    gridCol: g.gridCol ?? null,
    rows: g.rows ?? null,
    columns: g.columns ?? null,
    hiddenPorts: g.hiddenPorts ?? null,
  }));

  const outletGroups: OutletGroupInput[] = (preset.outletGroups ?? []).map((g, i) => ({
    name: g.name ?? null,
    outletCount: g.outletCount,
    outletType: g.outletType ?? null,
    batteryBacked: g.batteryBacked ?? false,
    surgeProtected: g.surgeProtected ?? true,
    side: g.side ?? "LEFT",
    sortOrder: g.sortOrder ?? i,
    face: g.face ?? null,
    gridRow: g.gridRow ?? null,
    gridCol: g.gridCol ?? null,
    rows: g.rows ?? null,
    columns: g.columns ?? null,
    hiddenPorts: g.hiddenPorts ?? null,
  }));

  return {
    codename: "",
    serialNumber: "",
    purchaseDate: "",
    purchasePrice: "",
    purchasePriceBeforeShip: "",
    purchasedFrom: "",
    purchasedFromUrl: "",
    state: "IN_USE",
    soldDate: "",
    soldPrice: "",
    notes: "",
    imageGallery,
    rackRenderFrontPath: "",
    rackRenderRearPath: "",
    annotations: (preset.annotations ?? []).map((a, i): FaceplateAnnotationInput => ({
      face: a.face,
      kind: a.kind,
      text: a.text ?? null,
      gridRow: a.gridRow ?? null,
      gridCol: a.gridCol ?? null,
      rowSpan: a.rowSpan ?? 1,
      colSpan: a.colSpan ?? 1,
      sortOrder: a.sortOrder ?? i,
    })),
    builtInGridRow: preset.builtInGridRow != null ? String(preset.builtInGridRow) : "",
    builtInGridCol: preset.builtInGridCol != null ? String(preset.builtInGridCol) : "",
    builtInFace: preset.builtInFace ?? "",
    storageId: "",
    warrantyEndDate: "",
    biosVersion: "",
    bandsLegacyText: "",
    cpus: [],
    rams: [],

    name: preset.name,
    category: preset.category,
    manufacturer: preset.manufacturer ?? "",
    modelNumber: preset.modelNumber ?? "",
    condition: "",
    formFactor: preset.formFactor,
    faceOrientation: "FRONT_FRONT",
    rackFace: "",
    heightInches: str(preset.heightInches),
    widthInches: str(preset.widthInches),
    depthInches: str(preset.depthInches),
    rackUnits: str(preset.rackUnits),
    requiresSupport: bool(preset.requiresSupport),
    builtInEthernetCount: str(preset.builtInEthernetCount),
    builtInSfpCount: str(preset.builtInSfpCount),
    builtInPortsSide: preset.builtInPortsSide ?? "",
    surgeProtectedEthernetCount: str(preset.surgeProtectedEthernetCount),
    kvmChannelCount: str(preset.kvmChannelCount),
    psuCount: str(preset.psuCount),
    maxPowerDrawWatts: str(preset.maxPowerDrawWatts),
    idlePowerWatts: str(preset.idlePowerWatts),
    chassis: preset.chassis ?? "",
    mainboard: preset.mainboard ?? "",
    raidController: preset.raidController ?? "",
    operatingSystem: preset.operatingSystem ?? "",
    extras: preset.extras ?? "",
    firmwareVersion: "",
    managementType: preset.managementType ?? "",
    poeBudgetWatts: str(preset.poeBudgetWatts),
    throughputGbps: str(preset.throughputGbps),
    maxConcurrentConnections: str(preset.maxConcurrentConnections),
    vaRating: str(preset.vaRating),
    wattsRating: str(preset.wattsRating),
    estimatedRuntimeMinutes: str(preset.estimatedRuntimeMinutes),
    amperage: preset.amperage ?? "",
    pduType: preset.pduType ?? "",
    supportedProtocols: preset.supportedProtocols ?? "",
    wifiStandard: preset.wifiStandard ?? "",
    maxThroughputMbps: str(preset.maxThroughputMbps),
    bandSupport: preset.bandSupport ?? "",
    poeInputType: preset.poeInputType ?? "",
    placement: preset.placement ?? "",
    maxLoadLbs: str(preset.maxLoadLbs),
    ventilated: bool(preset.ventilated),
    drawerType: preset.drawerType ?? "",
    pulloutDepthInches: str(preset.pulloutDepthInches),
    purpose: preset.purpose ?? "",
    patchPanelType: preset.patchPanelType ?? "",
    bayZones,
    portGroups,
    outletGroups,
    pciSlots: (preset.pciSlots ?? []).map((s, i): InlinePciSlotInput => ({
      sortOrder: s.sortOrder ?? i,
      size: s.size,
    })),
    psus: (preset.psus ?? []).map((p, i): InlinePsuInput => ({
      sortOrder: p.sortOrder ?? i,
      side: p.side ?? "LEFT",
      wattage: p.wattage ?? null,
      portCount: p.portCount ?? 1,
      state: "IN_USE",
      face: p.face ?? null,
      gridRow: p.gridRow ?? null,
      gridCol: p.gridCol ?? null,
    })),
  };
}
