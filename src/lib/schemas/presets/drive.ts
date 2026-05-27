import { z } from "zod";
import { DRIVE_KINDS } from "@/lib/enums";

export const drivePresetSchema = z.object({
  name: z.string(),
  kind: z.enum(DRIVE_KINDS),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  capacityGB: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
});

export type DrivePreset = z.infer<typeof drivePresetSchema>;
