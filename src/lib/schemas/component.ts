import { z } from "zod";
import { COMPONENT_TYPES, LIFECYCLE_STATES, PORT_TYPES } from "@/lib/enums";
import {
  checkbox,
  optionalDate,
  optionalInt,
  optionalNumber,
  optionalText,
  requiredInt,
  requiredText,
} from "./fields";

// Core component fields plus per-type extras (all optional — the form only
// renders the fields relevant to the chosen type).
export const componentSchema = z.object({
  name: requiredText("Name"),
  type: z.enum(COMPONENT_TYPES),
  manufacturer: optionalText,
  model: optionalText,
  specs: optionalText,
  serialNumber: optionalText,
  quantity: requiredInt("Quantity"),
  purchaseDate: optionalDate,
  purchasePrice: optionalNumber,
  purchasedFrom: optionalText,
  purchasedFromUrl: optionalText,
  notes: optionalText,
  imagePath: optionalText,
  installedInId: optionalText,

  // CPU
  speedGHz: optionalNumber,
  cores: optionalInt,
  threads: optionalInt,
  socket: optionalText,
  tdpWatts: optionalInt,

  // RAM
  capacityGB: optionalInt,
  speedMHz: optionalInt,
  generation: optionalText,
  ecc: checkbox,
  formFactor: optionalText,

  // NIC_CARD
  portCount: optionalInt,
  portType: z
    .string()
    .optional()
    .transform((v, ctx) => {
      const trimmed = (v ?? "").trim();
      if (trimmed === "") return null;
      if (!PORT_TYPES.includes(trimmed as (typeof PORT_TYPES)[number])) {
        ctx.addIssue({ code: "custom", message: "Invalid port type" });
        return z.NEVER;
      }
      return trimmed as (typeof PORT_TYPES)[number];
    }),
  portSpeed: optionalText,

  // RAID_CONTROLLER / PCIE_CARD / NIC_CARD
  cardInterface: optionalText,

  // POWER_SUPPLY
  wattsRating: optionalInt,
  modular: checkbox,

  // NVME_RISER
  m2SlotCount: optionalInt,

  state: z.enum(LIFECYCLE_STATES).default("IN_USE"),
  soldDate: optionalDate,
  soldPrice: optionalNumber,
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

export type ComponentFormValues = z.infer<typeof componentSchema>;
