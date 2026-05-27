"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { appSettingsSchema } from "@/lib/schemas/app-settings";
import type { FormState } from "@/lib/form-state";

export async function saveSettings(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const portTypeColorsRaw = formData.get("portTypeColors");
  const portTypeLabelsRaw = formData.get("portTypeLabels");
  const categoryColorsRaw = formData.get("categoryColors");

  let portTypeColors: Record<string, string> | undefined;
  let portTypeLabels: Record<string, string> | undefined;
  let categoryColors: Record<string, string> | undefined;

  try {
    if (portTypeColorsRaw) portTypeColors = JSON.parse(portTypeColorsRaw as string);
    if (portTypeLabelsRaw) portTypeLabels = JSON.parse(portTypeLabelsRaw as string);
    if (categoryColorsRaw) categoryColors = JSON.parse(categoryColorsRaw as string);
  } catch {
    return { error: "Invalid diagram settings data." };
  }

  const raw = {
    appName: formData.get("appName"),
    appDescription: formData.get("appDescription") ?? "",
    accentColor: formData.get("accentColor"),
    serviceLoopLengthInches: Number(formData.get("serviceLoopLengthInches")),
    portTypeColors,
    portTypeLabels,
    categoryColors,
  };

  const parsed = appSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });

  revalidatePath("/", "layout");
  return {};
}

export async function resetDiagramColors(): Promise<FormState> {
  await requireAdmin();

  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {
      portTypeColors: Prisma.DbNull,
      portTypeLabels: Prisma.DbNull,
      categoryColors: Prisma.DbNull,
    },
    create: { id: 1 },
  });

  revalidatePath("/", "layout");
  return {};
}
