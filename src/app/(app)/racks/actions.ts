"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState } from "@/lib/form-state";
import { rackSchema, type RackFormValues } from "@/lib/schemas/rack";

function scalarData(v: RackFormValues) {
  return {
    name: v.name,
    totalU: v.totalU,
    columnCount: v.columnCount ?? 6,
    manufacturer: v.manufacturer,
    modelNumber: v.modelNumber,
    serialNumber: v.serialNumber,
    condition: v.condition,
    purchaseDate: v.purchaseDate,
    purchasePrice: v.purchasePrice,
    purchasedFrom: v.purchasedFrom,
    purchasedFromUrl: v.purchasedFromUrl,
    inUse: v.inUse,
    notes: v.notes,
    imagePath: v.imagePath,
  };
}

export async function createRack(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = rackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.rack.create({ data: scalarData(parsed.data) });
  revalidatePath("/racks");
  redirect("/racks");
}

export async function updateRack(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = rackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.rack.update({ where: { id }, data: scalarData(parsed.data) });
  revalidatePath("/racks");
  redirect("/racks");
}

export async function deleteRack(id: string): Promise<void> {
  await requireUser();
  await prisma.rack.delete({ where: { id } });
  revalidatePath("/racks");
  revalidatePath("/assets");
}

// Flip the lock flag. When true the topology view disables drag-and-drop
// for assets in this rack so the layout can't be edited by accident. The
// data itself stays editable through the regular asset edit pages.
export async function toggleRackLock(id: string): Promise<void> {
  await requireUser();
  const rack = await prisma.rack.findUnique({
    where: { id },
    select: { isLocked: true },
  });
  if (!rack) return;
  await prisma.rack.update({
    where: { id },
    data: { isLocked: !rack.isLocked },
  });
  revalidatePath("/topology");
  revalidatePath(`/racks/${id}`);
  revalidatePath("/racks");
}

// Mark a rack as the "default" view on /topology. Only one row should be
// flagged at a time — clear the rest in the same transaction.
export async function setDefaultRack(id: string): Promise<void> {
  await requireUser();
  await prisma.$transaction([
    prisma.rack.updateMany({
      where: { id: { not: id }, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.rack.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/racks");
  revalidatePath(`/racks/${id}`);
  revalidatePath("/topology");
}
