"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState } from "@/lib/form-state";
import {
  componentSchema,
  type ComponentFormValues,
} from "@/lib/schemas/component";

const CARD_TYPES = new Set(["RAID_CONTROLLER", "PCIE_CARD", "NIC_CARD"]);

// Only persist type-specific fields when they actually apply to the chosen
// type — for everything else, write null so the row doesn't carry irrelevant
// data (e.g. a CPU shouldn't say "ecc: false").
function scalarData(v: ComponentFormValues) {
  return {
    name: v.name,
    type: v.type,
    manufacturer: v.manufacturer,
    model: v.model,
    specs: v.specs,
    serialNumber: v.serialNumber,
    quantity: v.quantity,
    purchaseDate: v.purchaseDate,
    purchasePrice: v.purchasePrice,
    purchasedFrom: v.purchasedFrom,
    purchasedFromUrl: v.purchasedFromUrl,
    notes: v.notes,
    imagePath: v.imagePath,
    installedInId: v.installedInId,
    speedGHz: v.type === "CPU" ? v.speedGHz : null,
    cores: v.type === "CPU" ? v.cores : null,
    threads: v.type === "CPU" ? v.threads : null,
    socket: v.type === "CPU" ? v.socket : null,
    tdpWatts: v.type === "CPU" ? v.tdpWatts : null,
    capacityGB: v.type === "RAM" ? v.capacityGB : null,
    speedMHz: v.type === "RAM" ? v.speedMHz : null,
    generation: v.type === "RAM" ? v.generation : null,
    ecc: v.type === "RAM" ? v.ecc : null,
    formFactor: v.type === "RAM" ? v.formFactor : null,
    portCount: v.type === "NIC_CARD" ? v.portCount : null,
    portType: v.type === "NIC_CARD" ? v.portType : null,
    portSpeed: v.type === "NIC_CARD" ? v.portSpeed : null,
    cardInterface: CARD_TYPES.has(v.type) ? v.cardInterface : null,
    wattsRating: v.type === "POWER_SUPPLY" ? v.wattsRating : null,
    modular: v.type === "POWER_SUPPLY" ? v.modular : null,
    state: v.state,
    soldDate: v.soldDate,
    soldPrice: v.soldPrice,
  };
}

export async function createComponent(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = componentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.component.create({ data: scalarData(parsed.data) });
  revalidatePath("/components");
  redirect("/components");
}

export async function updateComponent(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = componentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.component.update({ where: { id }, data: scalarData(parsed.data) });
  revalidatePath("/components");
  redirect("/components");
}

export async function deleteComponent(id: string): Promise<void> {
  await requireUser();
  await prisma.component.delete({ where: { id } });
  revalidatePath("/components");
}
