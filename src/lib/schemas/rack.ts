import { z } from "zod";
import {
  checkbox,
  optionalDate,
  optionalInt,
  optionalNumber,
  optionalText,
  requiredInt,
  requiredText,
} from "./fields";

export const rackSchema = z.object({
  name: requiredText("Name"),
  totalU: requiredInt("Total U"),
  columnCount: optionalInt,
  manufacturer: optionalText,
  modelNumber: optionalText,
  serialNumber: optionalText,
  condition: optionalText,
  purchaseDate: optionalDate,
  purchasePrice: optionalNumber,
  purchasedFrom: optionalText,
  purchasedFromUrl: optionalText,
  inUse: checkbox,
  notes: optionalText,
  imagePath: optionalText,
});

export type RackFormValues = z.infer<typeof rackSchema>;
