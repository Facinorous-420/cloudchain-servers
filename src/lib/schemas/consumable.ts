import { z } from "zod";
import { LIFECYCLE_STATES } from "@/lib/enums";
import {
  optionalDate,
  optionalNumber,
  optionalText,
  requiredInt,
  requiredText,
} from "./fields";

export const consumableSchema = z.object({
  name: requiredText("Name"),
  type: optionalText,
  quantity: requiredInt("Quantity"),
  location: optionalText,
  purchaseDate: optionalDate,
  purchasePrice: optionalNumber,
  purchasedFrom: optionalText,
  purchasedFromUrl: optionalText,
  state: z.enum(LIFECYCLE_STATES).default("IN_USE"),
  notes: optionalText,
  imagePath: optionalText,
});

export type ConsumableFormValues = z.infer<typeof consumableSchema>;
