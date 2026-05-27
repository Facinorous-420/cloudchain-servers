"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState } from "@/lib/form-state";
import { licenseSchema, type LicenseFormValues } from "@/lib/schemas/license";
import { computeRenewalDate } from "@/lib/renewal";

function scalarData(v: LicenseFormValues) {
  return {
    name: v.name,
    type: v.type,
    licenseKey: v.licenseKey,
    seats: v.seats,
    renewalPeriod: v.renewalPeriod,
    renewalDate: computeRenewalDate(v.purchaseDate, v.renewalPeriod),
    purchaseDate: v.purchaseDate,
    cost: v.cost,
    purchasedFrom: v.purchasedFrom,
    purchasedFromUrl: v.purchasedFromUrl,
    notes: v.notes,
    imagePath: v.imagePath,
  };
}

function assetIdsFrom(formData: FormData): string[] {
  return formData
    .getAll("assetIds")
    .filter((v): v is string => typeof v === "string" && v !== "");
}

export async function createLicense(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = licenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const assetIds = assetIdsFrom(formData);

  await prisma.license.create({
    data: {
      ...scalarData(parsed.data),
      assignments: assetIds.length
        ? { create: assetIds.map((assetId) => ({ assetId })) }
        : undefined,
    },
  });
  revalidatePath("/licenses");
  redirect("/licenses");
}

export async function updateLicense(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = licenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const assetIds = assetIdsFrom(formData);

  await prisma.$transaction(async (tx) => {
    await tx.license.update({ where: { id }, data: scalarData(parsed.data) });
    await tx.licenseAssignment.deleteMany({ where: { licenseId: id } });
    if (assetIds.length > 0) {
      await tx.licenseAssignment.createMany({
        data: assetIds.map((assetId) => ({ licenseId: id, assetId })),
      });
    }
  });
  revalidatePath("/licenses");
  redirect("/licenses");
}

export async function deleteLicense(id: string): Promise<void> {
  await requireUser();
  await prisma.license.delete({ where: { id } });
  revalidatePath("/licenses");
}
