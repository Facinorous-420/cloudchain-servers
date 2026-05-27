import { z } from "zod";
import { COMPONENT_TYPES } from "@/lib/enums";

export const componentPresetSchema = z.object({
  name: z.string(),
  type: z.enum(COMPONENT_TYPES),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  specs: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
});

export type ComponentPreset = z.infer<typeof componentPresetSchema>;
