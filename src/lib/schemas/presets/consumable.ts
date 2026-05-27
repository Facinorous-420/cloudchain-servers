import { z } from "zod";

export const consumablePresetSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
});

export type ConsumablePreset = z.infer<typeof consumablePresetSchema>;
