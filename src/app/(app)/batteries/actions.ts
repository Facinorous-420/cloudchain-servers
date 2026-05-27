"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState } from "@/lib/form-state";
import { batterySchema, type BatteryFormValues } from "@/lib/schemas/battery";

function scalarData(v: BatteryFormValues) {
  return {
    name: v.name,
    manufacturer: v.manufacturer,
    model: v.model,
    voltage: v.voltage,
    capacityAh: v.capacityAh,
    quantity: v.quantity,
    installDate: v.installDate,
    purchaseDate: v.purchaseDate,
    purchasePrice: v.purchasePrice,
    purchasedFrom: v.purchasedFrom,
    purchasedFromUrl: v.purchasedFromUrl,
    state: v.state,
    soldDate: v.soldDate,
    soldPrice: v.soldPrice,
    notes: v.notes,
    imagePath: v.imagePath,
    installedInId: v.installedInId,
    storageId: v.storageId,
  };
}

export async function createBattery(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = batterySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.battery.create({ data: scalarData(parsed.data) });
  revalidatePath("/batteries");
  redirect("/batteries");
}

export async function updateBattery(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = batterySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.battery.update({ where: { id }, data: scalarData(parsed.data) });
  revalidatePath("/batteries");
  redirect("/batteries");
}

export async function deleteBattery(id: string): Promise<void> {
  await requireUser();
  await prisma.battery.delete({ where: { id } });
  revalidatePath("/batteries");
}
