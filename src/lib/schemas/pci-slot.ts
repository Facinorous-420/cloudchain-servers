import { z } from "zod";
import { optionalText, requiredText } from "./fields";

export const pciSlotSchema = z.object({
  assetId: requiredText("Asset"),
  sortOrder: z.number().int().nonnegative().default(0),
  // "x1", "x4", "x8", "x16", "M.2 2280", "M.2 2242", etc.
  size: requiredText("Slot size"),
  occupiedByComponentId: optionalText,
});

export type PciSlotFormValues = z.infer<typeof pciSlotSchema>;
