import { z } from "zod";
import { APP_TYPES } from "@/lib/enums";
import { optionalText, requiredText } from "./fields";

export const applicationSchema = z.object({
  name: requiredText("Name"),
  type: z.enum(APP_TYPES),
  hostId: requiredText("Host"),
  operatingSystem: optionalText,
  status: optionalText,
  notes: optionalText,
  imagePath: optionalText,
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;
