"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState } from "@/lib/form-state";
import {
  applicationSchema,
  type ApplicationFormValues,
} from "@/lib/schemas/application";

function scalarData(v: ApplicationFormValues) {
  return {
    name: v.name,
    type: v.type,
    hostId: v.hostId,
    operatingSystem: v.operatingSystem,
    status: v.status,
    notes: v.notes,
    imagePath: v.imagePath,
  };
}

export async function createApplication(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.application.create({ data: scalarData(parsed.data) });
  revalidatePath(`/assets/${parsed.data.hostId}`);
  redirect(`/assets/${parsed.data.hostId}`);
}

export async function updateApplication(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.application.update({
    where: { id },
    data: scalarData(parsed.data),
  });
  revalidatePath(`/assets/${parsed.data.hostId}`);
  redirect(`/assets/${parsed.data.hostId}`);
}

export async function deleteApplication(id: string): Promise<void> {
  await requireUser();
  const app = await prisma.application.delete({ where: { id } });
  revalidatePath(`/assets/${app.hostId}`);
}
