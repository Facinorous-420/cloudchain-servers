"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState } from "@/lib/form-state";
import {
  consumableSchema,
  type ConsumableFormValues,
} from "@/lib/schemas/consumable";

function scalarData(v: ConsumableFormValues) {
  return {
    name: v.name,
    type: v.type,
    quantity: v.quantity,
    location: v.location,
    purchaseDate: v.purchaseDate,
    purchasePrice: v.purchasePrice,
    purchasedFrom: v.purchasedFrom,
    purchasedFromUrl: v.purchasedFromUrl,
    state: v.state,
    notes: v.notes,
    imagePath: v.imagePath,
  };
}

export async function createConsumable(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = consumableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.consumable.create({ data: scalarData(parsed.data) });
  revalidatePath("/consumables");
  redirect("/consumables");
}

export async function updateConsumable(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = consumableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.consumable.update({
    where: { id },
    data: scalarData(parsed.data),
  });
  revalidatePath("/consumables");
  redirect("/consumables");
}

export async function deleteConsumable(id: string): Promise<void> {
  await requireUser();
  await prisma.consumable.delete({ where: { id } });
  revalidatePath("/consumables");
}
