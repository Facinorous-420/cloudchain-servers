import { z } from "zod";
import {
  ASSET_CATEGORIES,
  DEVICE_SIDES,
  DRIVE_SIZES,
  FACE_SIDES,
  FORM_FACTORS,
  PORT_TYPES,
} from "@/lib/enums";

// Model-specific fields only — strips codename, serial, acquisition, placement.
// Values are native types (numbers as numbers), not the string-encoded form data.

export const assetPresetBayZoneSchema = z.object({
  name: z.string(),
  faceSide: z.enum(FACE_SIDES),
  driveSize: z.enum(DRIVE_SIZES),
  bayCount: z.number().int().positive(),
  sortOrder: z.number().int().nonnegative().default(0),
  vertical: z.boolean().optional().default(false),
  // Faceplate layout (optional — null means auto-layout in the designer)
  gridRow: z.number().int().nonnegative().optional(),
  gridCol: z.number().int().nonnegative().optional(),
  rows: z.number().int().positive().optional(),
  columns: z.number().int().positive().optional(),
});

export const assetPresetPortGroupSchema = z.object({
  name: z.string().optional(),
  portCount: z.number().int().positive(),
  portType: z.enum(PORT_TYPES),
  portSpeed: z.string().optional(),
  poePerPort: z.number().int().nonnegative().optional(),
  side: z.enum(DEVICE_SIDES).default("LEFT"),
  sortOrder: z.number().int().nonnegative().default(0),
  // Faceplate layout
  face: z.enum(FACE_SIDES).optional(),
  gridRow: z.number().int().nonnegative().optional(),
  gridCol: z.number().int().nonnegative().optional(),
  rows: z.number().int().positive().optional(),
  columns: z.number().int().positive().optional(),
  hiddenPorts: z.array(z.number().int().positive()).optional(),
});

export const assetPresetOutletGroupSchema = z.object({
  name: z.string().optional(),
  outletCount: z.number().int().positive(),
  outletType: z.string().optional(),
  batteryBacked: z.boolean().default(false),
  surgeProtected: z.boolean().default(true),
  side: z.enum(DEVICE_SIDES).default("LEFT"),
  sortOrder: z.number().int().nonnegative().default(0),
  // Faceplate layout
  face: z.enum(FACE_SIDES).optional(),
  gridRow: z.number().int().nonnegative().optional(),
  gridCol: z.number().int().nonnegative().optional(),
  rows: z.number().int().positive().optional(),
  columns: z.number().int().positive().optional(),
  hiddenPorts: z.array(z.number().int().positive()).optional(),
});

export const assetPresetSchema = z.object({
  name: z.string(),
  category: z.enum(ASSET_CATEGORIES),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
  // Optional gallery (paths relative to the preset folder, e.g. "images/front.png").
  // When omitted, the single `thumbnail` image is used as the gallery.
  images: z.array(z.string()).optional(),

  formFactor: z.enum(FORM_FACTORS),
  heightInches: z.number().optional(),
  widthInches: z.number().optional(),
  depthInches: z.number().optional(),
  rackUnits: z.number().int().optional(),
  requiresSupport: z.boolean().optional(),

  // Built-in counts
  builtInEthernetCount: z.number().int().optional(),
  builtInSfpCount: z.number().int().optional(),
  builtInPortsSide: z.enum(DEVICE_SIDES).optional(),
  surgeProtectedEthernetCount: z.number().int().optional(),
  kvmChannelCount: z.number().int().optional(),
  psuCount: z.number().int().optional(),

  // Power
  maxPowerDrawWatts: z.number().int().optional(),
  idlePowerWatts: z.number().int().optional(),

  // Server spec
  chassis: z.string().optional(),
  mainboard: z.string().optional(),
  raidController: z.string().optional(),
  operatingSystem: z.string().optional(),
  extras: z.string().optional(),

  // Switch
  managementType: z.string().optional(),
  poeBudgetWatts: z.number().int().optional(),

  // Gateway / Firewall
  throughputGbps: z.number().optional(),
  maxConcurrentConnections: z.number().int().optional(),

  // UPS
  vaRating: z.number().int().optional(),
  wattsRating: z.number().int().optional(),
  estimatedRuntimeMinutes: z.number().int().optional(),

  // PDU
  amperage: z.string().optional(),
  pduType: z.string().optional(),

  // KVM
  supportedProtocols: z.string().optional(),

  // Access point
  wifiStandard: z.string().optional(),
  maxThroughputMbps: z.number().int().optional(),
  bandSupport: z.string().optional(),
  poeInputType: z.string().optional(),
  placement: z.string().optional(),

  // Shelf
  maxLoadLbs: z.number().optional(),
  ventilated: z.boolean().optional(),

  // Drawer
  drawerType: z.string().optional(),
  pulloutDepthInches: z.number().optional(),

  // Blank panel
  purpose: z.string().optional(),

  // Patch panel
  patchPanelType: z.string().optional(),

  // Structural layouts
  bayZones: z.array(assetPresetBayZoneSchema).optional(),
  portGroups: z.array(assetPresetPortGroupSchema).optional(),
  outletGroups: z.array(assetPresetOutletGroupSchema).optional(),
  pciSlots: z.array(z.object({
    sortOrder: z.number().int().nonnegative().default(0),
    size: z.string(),
  })).optional(),

  // Faceplate designer layout — carried through preset save/load so a saved
  // server re-opens with its port/bay positions intact.
  builtInGridRow: z.number().int().nonnegative().optional(),
  builtInGridCol: z.number().int().nonnegative().optional(),
  builtInFace: z.enum(FACE_SIDES).optional(),
  annotations: z.array(z.object({
    face: z.enum(FACE_SIDES),
    kind: z.enum(["TEXT", "SPACER", "DIVIDER"]),
    text: z.string().nullable().optional(),
    gridRow: z.number().int().nonnegative().nullable().optional(),
    gridCol: z.number().int().nonnegative().nullable().optional(),
    rowSpan: z.number().int().positive().default(1),
    colSpan: z.number().int().positive().default(1),
    sortOrder: z.number().int().nonnegative().default(0),
  })).optional(),
  psus: z.array(z.object({
    sortOrder: z.number().int().nonnegative(),
    wattage: z.number().int().positive().optional(),
    portCount: z.number().int().positive().default(1),
    side: z.enum(DEVICE_SIDES),
    face: z.enum(FACE_SIDES).nullable().optional(),
    gridRow: z.number().int().nonnegative().nullable().optional(),
    gridCol: z.number().int().nonnegative().nullable().optional(),
  })).optional(),
});

export type AssetPreset = z.infer<typeof assetPresetSchema>;
