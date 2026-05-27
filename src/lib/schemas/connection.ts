import { z } from "zod";
import { CONNECTION_TYPES } from "@/lib/enums";
import {
  checkbox,
  optionalInt,
  optionalText,
  requiredText,
} from "./fields";

// Endpoint refs (port group OR outlet group) are all optional — connections
// can be label-only for free-form cases (USB, console serial, etc).
export const connectionSchema = z.object({
  type: z.enum(CONNECTION_TYPES),
  aEndAssetId: requiredText("A-end asset"),
  aEndLabel: requiredText("A-end label"),
  aEndPortGroupId: optionalText,
  aEndPortNumber: optionalInt,
  aEndOutletGroupId: optionalText,
  aEndOutletNumber: optionalInt,
  bEndAssetId: optionalText,
  bEndLabel: optionalText,
  bEndPortGroupId: optionalText,
  bEndPortNumber: optionalInt,
  bEndOutletGroupId: optionalText,
  bEndOutletNumber: optionalInt,
  cableType: optionalText,
  cableCategory: optionalText,
  isPatch: checkbox,
  speed: optionalText,
  cableLengthFeet: optionalInt,
  estimatedCableLengthFeet: optionalInt,
  serviceLoopLengthInches: optionalInt,
  notes: optionalText,
});

export type ConnectionFormValues = z.infer<typeof connectionSchema>;
