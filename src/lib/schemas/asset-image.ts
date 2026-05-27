import { z } from "zod";

export const assetImageSchema = z.object({
  assetId: z.string().min(1),
  path: z.string().min(1),
  sortOrder: z.number().int().nonnegative().default(0),
  isMain: z.boolean().default(false),
});

export type AssetImageFormValues = z.infer<typeof assetImageSchema>;

// Reorder payload used by drag-to-reorder in the gallery UI.
export const assetImageReorderSchema = z.array(
  z.object({
    id: z.string().min(1),
    sortOrder: z.number().int().nonnegative(),
    isMain: z.boolean(),
  }),
);
