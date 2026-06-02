import { z } from "zod";

// Inline-edited on the server asset form. CPUs and RAM are persisted as
// Component rows of type=CPU / type=RAM with installedInId pointing at the
// server, so they show up in /components like any other Component.
export const inlineCpuSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Required"),
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  speedGHz: z.number().nullable().optional(),
  cores: z.number().int().nullable().optional(),
  threads: z.number().int().nullable().optional(),
  socket: z.string().nullable().optional(),
  tdpWatts: z.number().int().nullable().optional(),
});
export type InlineCpuInput = z.infer<typeof inlineCpuSchema>;
export const inlineCpusSchema = z.array(inlineCpuSchema);

export const inlineRamSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Required"),
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  capacityGB: z.number().int().nullable().optional(),
  speedMHz: z.number().int().nullable().optional(),
  generation: z.string().nullable().optional(),
  ecc: z.boolean().nullable().optional(),
  formFactor: z.string().nullable().optional(),
});
export type InlineRamInput = z.infer<typeof inlineRamSchema>;
export const inlineRamsSchema = z.array(inlineRamSchema);

// A drive created inline alongside a new NVMe riser, dropped into its bays in order.
export const riserDriveDraftSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  capacityGB: z.number().int().positive(),
});
export type RiserDriveDraft = z.infer<typeof riserDriveDraftSchema>;

// Definition for a new PCIe component created inline from the slot editor
export const pciNewComponentDraftSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  type: z.string().min(1),
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  portCount: z.number().int().positive().nullable().optional(),
  portType: z.string().nullable().optional(),
  portSpeed: z.string().nullable().optional(),
  cardInterface: z.string().nullable().optional(),
  // Structured connector size (x8, M.2 2280…) for slot-fit checks.
  cardSize: z.string().nullable().optional(),
  // NVME_RISER-only: how many M.2 slots the riser adds, their size label, and
  // any NVMe drives to create + mount into those slots on save.
  m2SlotCount: z.number().int().positive().nullable().optional(),
  m2SlotSize: z.string().nullable().optional(),
  drives: z.array(riserDriveDraftSchema).optional(),
});
export type PciNewComponentDraft = z.infer<typeof pciNewComponentDraftSchema>;

export const inlinePciSlotSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  size: z.string().min(1),
  // Display-only fields populated from DB for the edit form (not mutated by server)
  occupiedByComponentId: z.string().nullable().optional(),
  occupiedByName: z.string().nullable().optional(),
  // Pending actions applied on form submit:
  pendingExistingComponentId: z.string().nullable().optional(), // install an inventory component
  pendingNewComponent: pciNewComponentDraftSchema.nullable().optional(), // create & install new
  pendingVacate: z.boolean().optional(), // remove the current occupant
});
export type InlinePciSlotInput = z.infer<typeof inlinePciSlotSchema>;
export const inlinePciSlotsSchema = z.array(inlinePciSlotSchema);

export const inlinePsuSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  side: z.enum(["LEFT", "CENTER", "RIGHT"]),
  wattage: z.number().int().positive().nullable().optional(),
  portCount: z.number().int().positive().default(1),
  state: z.enum(["IN_USE", "STORED", "SOLD", "JUNKED"]).default("IN_USE"),
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  // Faceplate designer placement (issue 5).
  face: z.enum(["FRONT", "REAR", "INTERIOR"]).nullable().optional(),
  gridRow: z.number().int().nonnegative().nullable().optional(),
  gridCol: z.number().int().nonnegative().nullable().optional(),
});
export type InlinePsuInput = z.infer<typeof inlinePsuSchema>;
export const inlinePsusSchema = z.array(inlinePsuSchema);

// Custom text / spacer annotations placed on the faceplate grid (issue 5).
export const faceplateAnnotationSchema = z.object({
  id: z.string().optional(),
  face: z.enum(["FRONT", "REAR", "INTERIOR"]).default("FRONT"),
  kind: z.enum(["TEXT", "SPACER", "DIVIDER"]),
  text: z.string().nullable().optional(),
  gridRow: z.number().int().nonnegative().nullable().optional(),
  gridCol: z.number().int().nonnegative().nullable().optional(),
  rowSpan: z.number().int().positive().default(1),
  colSpan: z.number().int().positive().default(1),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type FaceplateAnnotationInput = z.infer<typeof faceplateAnnotationSchema>;
export const faceplateAnnotationsSchema = z.array(faceplateAnnotationSchema);
