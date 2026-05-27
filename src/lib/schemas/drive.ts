import { z } from "zod";
import { DRIVE_KINDS, DRIVE_SIZES, LIFECYCLE_STATES } from "@/lib/enums";
import {
  optionalDate,
  optionalInt,
  optionalNumber,
  optionalText,
  requiredInt,
  requiredText,
} from "./fields";

// Field-level parsing only. The conditional placement rule (host set => bay
// zone + bay number required, valid, drive.size matches zone.driveSize, and the
// bay is unoccupied) is enforced in the server action, since it needs to query
// bay zones and existing drives.
export const driveSchema = z.object({
  name: requiredText("Name"),
  manufacturer: optionalText,
  model: optionalText,
  kind: z.enum(DRIVE_KINDS),
  size: z.enum(DRIVE_SIZES),
  capacityGB: requiredInt("Capacity (GB)"),
  serialNumber: optionalText,
  manufactureDate: optionalDate,
  purchaseDate: optionalDate,
  purchasePrice: optionalNumber,
  purchasedFrom: optionalText,
  purchasedFromUrl: optionalText,
  condition: optionalText,
  assignedUse: optionalText,
  state: z.enum(LIFECYCLE_STATES).default("IN_USE"),
  soldDate: optionalDate,
  soldPrice: optionalNumber,
  notes: optionalText,
  imagePath: optionalText,
  installedInId: optionalText,
  bayZoneId: optionalText,
  bayNumber: optionalInt,
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

export type DriveFormValues = z.infer<typeof driveSchema>;
