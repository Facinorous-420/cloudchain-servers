export { assetPresetSchema } from "./asset";
export type { AssetPreset } from "./asset";

export { drivePresetSchema } from "./drive";
export type { DrivePreset } from "./drive";

export { componentPresetSchema } from "./component";
export type { ComponentPreset } from "./component";

export { consumablePresetSchema } from "./consumable";
export type { ConsumablePreset } from "./consumable";

export { batteryPresetSchema } from "./battery";
export type { BatteryPreset } from "./battery";

export { licensePresetSchema } from "./license";
export type { LicensePreset } from "./license";

import { assetPresetSchema } from "./asset";
import { drivePresetSchema } from "./drive";
import { componentPresetSchema } from "./component";
import { consumablePresetSchema } from "./consumable";
import { batteryPresetSchema } from "./battery";
import { licensePresetSchema } from "./license";

export const PRESET_SCHEMAS = {
  assets: assetPresetSchema,
  drives: drivePresetSchema,
  components: componentPresetSchema,
  consumables: consumablePresetSchema,
  batteries: batteryPresetSchema,
  licenses: licensePresetSchema,
} as const;

export type PresetEntityType = keyof typeof PRESET_SCHEMAS;
