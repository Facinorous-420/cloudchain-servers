import { z } from "zod";
import { DEVICE_SIDES } from "@/lib/enums";

// Inline-edited on the asset form for UPS / PDU and submitted as a JSON array.
export const outletGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().nullable().optional(),
  outletCount: z.number().int().positive("Outlet count must be at least 1"),
  outletType: z.string().nullable().optional(),
  batteryBacked: z.boolean().default(false),
  surgeProtected: z.boolean().default(true),
  side: z.enum(DEVICE_SIDES).default("LEFT"),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type OutletGroupInput = z.infer<typeof outletGroupSchema>;

export const outletGroupsSchema = z.array(outletGroupSchema);
