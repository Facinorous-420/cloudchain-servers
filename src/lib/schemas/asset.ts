import { z } from "zod";
import {
  ASSET_CATEGORIES,
  DEVICE_SIDES,
  DRIVE_SIZES,
  FACE_SIDES,
  FORM_FACTORS,
  LIFECYCLE_STATES,
} from "@/lib/enums";
import {
  checkbox,
  optionalDate,
  optionalInt,
  optionalNumber,
  optionalText,
  requiredText,
} from "./fields";

// A server's drive-bay zone. Edited inline on the Asset form and submitted as a
// JSON array, so values arrive already typed (numbers as numbers).
export const bayZoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Zone name is required"),
  faceSide: z.enum(FACE_SIDES),
  driveSize: z.enum(DRIVE_SIZES),
  bayCount: z.number().int().positive("Bay count must be at least 1"),
  sortOrder: z.number().int().nonnegative().default(0),
  // Faceplate designer placement (issue 5).
  gridRow: z.number().int().nonnegative().nullable().optional(),
  gridCol: z.number().int().nonnegative().nullable().optional(),
  rows: z.number().int().positive().nullable().optional(),
  columns: z.number().int().positive().nullable().optional(),
});
export type BayZoneInput = z.infer<typeof bayZoneSchema>;

export const bayZonesSchema = z.array(bayZoneSchema);

// Core Asset fields plus all the per-category extras. The form decides which
// sections to render based on the chosen category; the Zod schema treats every
// category-specific field as optional.
export const assetSchema = z.object({
  codename: requiredText("Codename"),
  name: requiredText("Name"),
  category: z.enum(ASSET_CATEGORIES),
  manufacturer: optionalText,
  modelNumber: optionalText,
  serialNumber: optionalText,
  condition: optionalText,

  purchaseDate: optionalDate,
  purchasePrice: optionalNumber,
  purchasePriceBeforeShip: optionalNumber,
  purchasedFrom: optionalText,
  purchasedFromUrl: optionalText,
  state: z.enum(LIFECYCLE_STATES).default("IN_USE"),
  soldDate: optionalDate,
  soldPrice: optionalNumber,
  notes: optionalText,
  rackRenderFrontPath: optionalText,
  rackRenderRearPath: optionalText,

  formFactor: z.enum(FORM_FACTORS),
  faceOrientation: z.enum(["FRONT_FRONT", "FRONT_REAR"]).default("FRONT_FRONT"),
  rackFace: z.enum(["FRONT", "REAR"]).nullable().optional(),
  heightInches: optionalNumber,
  widthInches: optionalNumber,
  depthInches: optionalNumber,
  rackUnits: optionalInt,
  requiresSupport: checkbox,

  storageId: optionalText,

  // Built-in counts (server / NUC / AP)
  builtInEthernetCount: optionalInt,
  builtInSfpCount: optionalInt,
  // Which side of the chassis built-in / PSU ports live on — used by the
  // cable-length estimator. Empty string → null.
  builtInPortsSide: z
    .string()
    .optional()
    .transform((v, ctx) => {
      const trimmed = (v ?? "").trim();
      if (trimmed === "") return null;
      if (
        !DEVICE_SIDES.includes(trimmed as (typeof DEVICE_SIDES)[number])
      ) {
        ctx.addIssue({ code: "custom", message: "Invalid side" });
        return z.NEVER;
      }
      return trimmed as (typeof DEVICE_SIDES)[number];
    }),
  // UPS pass-through
  surgeProtectedEthernetCount: optionalInt,
  // KVM
  kvmChannelCount: optionalInt,
  // Server / NUC
  psuCount: optionalInt,

  // Faceplate designer placement for the built-in NIC strip (issue 5).
  builtInGridRow: optionalInt,
  builtInGridCol: optionalInt,
  builtInFace: optionalText,

  // Server / NUC spec
  chassis: optionalText,
  mainboard: optionalText,
  raidController: optionalText,
  operatingSystem: optionalText,
  biosVersion: optionalText,
  extras: optionalText,

  // Common stat-tracking
  maxPowerDrawWatts: optionalInt,
  idlePowerWatts: optionalInt,
  warrantyEndDate: optionalDate,
  firmwareVersion: optionalText,

  // SWITCH
  managementType: optionalText,
  poeBudgetWatts: optionalInt,

  // GATEWAY / FIREWALL
  throughputGbps: optionalNumber,
  maxConcurrentConnections: optionalInt,

  // UPS
  vaRating: optionalInt,
  wattsRating: optionalInt,
  estimatedRuntimeMinutes: optionalInt,

  // PDU
  amperage: optionalText,
  pduType: optionalText,

  // KVM
  supportedProtocols: optionalText,

  // ACCESS_POINT
  wifiStandard: optionalText,
  maxThroughputMbps: optionalInt,
  bandSupport: optionalText,
  bandsLegacyText: optionalText,
  poeInputType: optionalText,
  placement: optionalText,

  // SHELF
  maxLoadLbs: optionalNumber,
  ventilated: checkbox,

  // DRAWER
  drawerType: optionalText,
  pulloutDepthInches: optionalNumber,

  // BLANK_PANEL
  purpose: optionalText,

  // PATCH_PANEL
  patchPanelType: optionalText,
}).superRefine((v, ctx) => {
  // Rack-mounted and tower form factors must declare a U height so the rack
  // diagram knows how tall to render them.
  if ((v.formFactor === "RACK" || v.formFactor === "TOWER") && v.rackUnits == null) {
    ctx.addIssue({
      code: "custom",
      path: ["rackUnits"],
      message: "Required for rack and tower form factors",
    });
  }
  if (v.state === "SOLD" && !v.soldDate) {
    ctx.addIssue({ code: "custom", path: ["soldDate"], message: "Required when sold" });
  }
  if (v.state === "SOLD" && !v.soldPrice) {
    ctx.addIssue({ code: "custom", path: ["soldPrice"], message: "Required when sold" });
  }
  if (v.state === "JUNKED" && !v.soldDate) {
    ctx.addIssue({ code: "custom", path: ["soldDate"], message: "Required when junked (use as disposal date)" });
  }
});

export type AssetFormValues = z.infer<typeof assetSchema>;
