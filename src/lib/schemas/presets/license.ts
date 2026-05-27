import { z } from "zod";
import { RENEWAL_PERIODS } from "@/lib/enums";

export const licensePresetSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  seats: z.number().int().optional(),
  renewalPeriod: z.enum(RENEWAL_PERIODS).optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
});

export type LicensePreset = z.infer<typeof licensePresetSchema>;
