import { z } from "zod";
import { optionalText, requiredText } from "./fields";

export const storageSchema = z.object({
  name: requiredText("Name"),
  notes: optionalText,
  imagePath: optionalText,
});

export type StorageFormValues = z.infer<typeof storageSchema>;
