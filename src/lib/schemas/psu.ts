import { z } from "zod";
import { DEVICE_SIDES, LIFECYCLE_STATES } from "@/lib/enums";
import {
  optionalDate,
  optionalInt,
  optionalNumber,
  optionalText,
  requiredText,
} from "./fields";

export const psuSchema = z.object({
  assetId: requiredText("Asset"),
  sortOrder: z.number().int().nonnegative().default(0),
  side: z.enum(DEVICE_SIDES).default("LEFT"),
  wattage: optionalInt,
  portCount: z.number().int().positive().default(1),
  state: z.enum(LIFECYCLE_STATES).default("IN_USE"),
  manufacturer: optionalText,
  model: optionalText,
  serialNumber: optionalText,
  purchaseDate: optionalDate,
  purchasePrice: optionalNumber,
  purchasedFrom: optionalText,
  soldDate: optionalDate,
  soldPrice: optionalNumber,
  notes: optionalText,
});

export type PsuFormValues = z.infer<typeof psuSchema>;
