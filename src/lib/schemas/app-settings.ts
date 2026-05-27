import { z } from "zod";

// Allowed accent colours (UniFi palette subset). Any valid CSS hex is accepted
// by the form; this list drives the swatch picker.
export const ACCENT_COLOR_SWATCHES = [
  "#00a8c6", // teal (default)
  "#3b82f6", // blue
  "#3fb950", // green
  "#c678dd", // purple
  "#d9a441", // amber
  "#e0823d", // orange
  "#e05e5e", // red
] as const;

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex colour (#rrggbb)");

const colorMapSchema = z.record(z.string(), hexColor);
const labelMapSchema = z.record(
  z.string(),
  z.string().min(1).max(4, "Max 4 characters"),
);

export const appSettingsSchema = z.object({
  appName: z.string().min(1, "App name is required").max(60, "Max 60 characters"),
  appDescription: z.string().max(120, "Max 120 characters"),
  accentColor: hexColor,
  serviceLoopLengthInches: z
    .number()
    .int()
    .positive("Service loop must be at least 1 inch"),
  portTypeColors: colorMapSchema.optional(),
  portTypeLabels: labelMapSchema.optional(),
  categoryColors: colorMapSchema.optional(),
});

export type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;
