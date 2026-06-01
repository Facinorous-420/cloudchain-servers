import { z } from "zod";
import { DEVICE_SIDES, FACE_SIDES } from "@/lib/enums";

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
  // Faceplate editor layout (issue 5).
  face: z.enum(FACE_SIDES).nullable().optional(),
  rows: z.number().int().positive().nullable().optional(),
  columns: z.number().int().positive().nullable().optional(),
  hiddenPorts: z.array(z.number().int().positive()).nullable().optional(),
});
export type OutletGroupInput = z.infer<typeof outletGroupSchema>;

export const outletGroupsSchema = z.array(outletGroupSchema);
