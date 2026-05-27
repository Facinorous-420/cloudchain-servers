import { z } from "zod";
import { DEVICE_SIDES, PORT_TYPES } from "@/lib/enums";

// Inline-edited on the asset form for SWITCH / GATEWAY / FIREWALL / AP and
// submitted as a JSON array, so numeric values arrive already typed.
export const portGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().nullable().optional(),
  portCount: z.number().int().positive("Port count must be at least 1"),
  portType: z.enum(PORT_TYPES),
  portSpeed: z.string().nullable().optional(),
  poePerPort: z.number().int().nonnegative().nullable().optional(),
  side: z.enum(DEVICE_SIDES).default("LEFT"),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type PortGroupInput = z.infer<typeof portGroupSchema>;

export const portGroupsSchema = z.array(portGroupSchema);
