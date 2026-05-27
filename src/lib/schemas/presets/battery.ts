import { z } from "zod";

export const batteryPresetSchema = z.object({
  name: z.string(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  voltage: z.number().optional(),
  capacityAh: z.number().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
});

export type BatteryPreset = z.infer<typeof batteryPresetSchema>;
