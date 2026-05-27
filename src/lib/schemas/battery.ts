import { z } from "zod";
import { LIFECYCLE_STATES } from "@/lib/enums";
import {
  optionalDate,
  optionalNumber,
  optionalText,
  requiredInt,
  requiredText,
} from "./fields";

export const batterySchema = z.object({
  name: requiredText("Name"),
  manufacturer: optionalText,
  model: optionalText,
  voltage: optionalNumber,
  capacityAh: optionalNumber,
  quantity: requiredInt("Quantity"),
  installDate: optionalDate,
  purchaseDate: optionalDate,
  purchasePrice: optionalNumber,
  purchasedFrom: optionalText,
  purchasedFromUrl: optionalText,
  state: z.enum(LIFECYCLE_STATES).default("IN_USE"),
  soldDate: optionalDate,
  soldPrice: optionalNumber,
  notes: optionalText,
  imagePath: optionalText,
  installedInId: optionalText,
  storageId: optionalText,
}).superRefine((v, ctx) => {
  if (v.state === "SOLD" && !v.soldDate) {
    ctx.addIssue({ code: "custom", path: ["soldDate"], message: "Required when sold" });
  }
  if (v.state === "SOLD" && !v.soldPrice) {
    ctx.addIssue({ code: "custom", path: ["soldPrice"], message: "Required when sold" });
  }
  if (v.state === "JUNKED" && !v.soldDate) {
    ctx.addIssue({ code: "custom", path: ["soldDate"], message: "Required when junked (use as disposal date)" });
  }
});

export type BatteryFormValues = z.infer<typeof batterySchema>;
