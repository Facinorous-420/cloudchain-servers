"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState } from "@/lib/form-state";
import { storageSchema, type StorageFormValues } from "@/lib/schemas/storage";

function scalarData(v: StorageFormValues) {
  return { name: v.name, notes: v.notes, imagePath: v.imagePath };
}

function isUniqueNameError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createStorage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = storageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    await prisma.storage.create({ data: scalarData(parsed.data) });
  } catch (error) {
    if (isUniqueNameError(error)) {
      return { fieldErrors: { name: ["A storage with that name already exists"] } };
    }
    throw error;
  }
  revalidatePath("/storages");
  redirect("/storages");
}

export async function updateStorage(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = storageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    await prisma.storage.update({ where: { id }, data: scalarData(parsed.data) });
  } catch (error) {
    if (isUniqueNameError(error)) {
      return { fieldErrors: { name: ["A storage with that name already exists"] } };
    }
    throw error;
  }
  revalidatePath("/storages");
  redirect("/storages");
}

export async function deleteStorage(id: string): Promise<void> {
  await requireUser();
  await prisma.storage.delete({ where: { id } });
  revalidatePath("/storages");
  revalidatePath("/assets");
}
