import { z } from "zod";

// Reusable Zod field helpers for parsing HTML form values. Form inputs arrive as
// strings (or absent, for conditionally-rendered fields), so each helper tolerates
// undefined and an empty string, normalising "empty" to null.

export function requiredText(label: string) {
  return z.string().trim().min(1, `${label} is required`);
}

export function requiredInt(label: string) {
  return z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") {
        ctx.addIssue({ code: "custom", message: `${label} is required` });
        return z.NEVER;
      }
      const n = Number(v);
      if (!Number.isInteger(n)) {
        ctx.addIssue({
          code: "custom",
          message: `${label} must be a whole number`,
        });
        return z.NEVER;
      }
      return n;
    });
}

export const optionalText = z
  .string()
  .optional()
  .transform((v) => {
    const trimmed = (v ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const optionalInt = z
  .string()
  .optional()
  .transform((v, ctx) => {
    const trimmed = (v ?? "").trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    if (!Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: "Must be a whole number" });
      return z.NEVER;
    }
    return n;
  });

export const optionalNumber = z
  .string()
  .optional()
  .transform((v, ctx) => {
    const trimmed = (v ?? "").trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    if (Number.isNaN(n)) {
      ctx.addIssue({ code: "custom", message: "Must be a number" });
      return z.NEVER;
    }
    return n;
  });

export const optionalDate = z
  .string()
  .optional()
  .transform((v, ctx) => {
    const trimmed = (v ?? "").trim();
    if (trimmed === "") return null;
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });

// HTML checkboxes submit "on" when checked and are absent when unchecked.
export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");
