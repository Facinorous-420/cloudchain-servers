import { z } from "zod";
import { RENEWAL_PERIODS } from "@/lib/enums";
import {
  optionalDate,
  optionalInt,
  optionalNumber,
  optionalText,
  requiredText,
} from "./fields";

// renewalPeriod is a select on the form; "" -> null. renewalDate is no longer
// taken from the form — it is computed by the action from purchaseDate + period.
export const licenseSchema = z.object({
  name: requiredText("Name"),
  type: optionalText,
  licenseKey: optionalText,
  seats: optionalInt,
  renewalPeriod: z
    .string()
    .optional()
    .transform((v, ctx) => {
      const trimmed = (v ?? "").trim();
      if (trimmed === "") return null;
      if (
        !RENEWAL_PERIODS.includes(trimmed as (typeof RENEWAL_PERIODS)[number])
      ) {
        ctx.addIssue({ code: "custom", message: "Invalid renewal period" });
        return z.NEVER;
      }
      return trimmed as (typeof RENEWAL_PERIODS)[number];
    }),
  purchaseDate: optionalDate,
  cost: optionalNumber,
  purchasedFrom: optionalText,
  purchasedFromUrl: optionalText,
  notes: optionalText,
  imagePath: optionalText,
});

export type LicenseFormValues = z.infer<typeof licenseSchema>;
