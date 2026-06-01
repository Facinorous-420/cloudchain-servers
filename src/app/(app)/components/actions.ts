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

const CARD_TYPES = new Set([
  "RAID_CONTROLLER",
  "PCIE_CARD",
  "NIC_CARD",
  "GPU",
  "NVME_RISER",
]);
// Types that occupy a PCIe/M.2 slot and therefore carry a structured cardSize.
const SIZED_CARD_TYPES = new Set([
  "RAID_CONTROLLER",
  "PCIE_CARD",
  "NIC_CARD",
  "GPU",
  "NVME_RISER",
]);

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
    cardSize: SIZED_CARD_TYPES.has(v.type) ? v.cardSize : null,
    wattsRating: v.type === "POWER_SUPPLY" ? v.wattsRating : null,
    modular: v.type === "POWER_SUPPLY" ? v.modular : null,
    m2SlotCount: v.type === "NVME_RISER" ? v.m2SlotCount : null,
    state: v.state,
    soldDate: v.soldDate,
    soldPrice: v.soldPrice,
  };
}

// An NVMe riser exposes its M.2 slots as a single BayZone (driveSize=M2) keyed
// by componentId. Keep that zone in sync with the riser's m2SlotCount: create
// it, resize it, or remove it. Returns a FormState error when the change would
// orphan mounted drives, else null on success.
async function reconcileRiserBayZone(
  componentId: string,
  type: string,
  m2SlotCount: number | null,
): Promise<FormState | null> {
  const existing = await prisma.bayZone.findFirst({
    where: { componentId },
    include: { _count: { select: { drives: true } } },
  });
  const wantCount = type === "NVME_RISER" ? m2SlotCount ?? 0 : 0;

  if (wantCount <= 0) {
    // No slots wanted — remove the zone unless drives are still mounted.
    if (existing) {
      if (existing._count.drives > 0) {
        return {
          fieldErrors: {
            m2SlotCount: [
              "Remove the mounted drives before clearing this riser's slots",
            ],
          },
        };
      }
      await prisma.bayZone.delete({ where: { id: existing.id } });
    }
    return null;
  }

  if (!existing) {
    await prisma.bayZone.create({
      data: {
        componentId,
        name: "M.2 slots",
        faceSide: "FRONT",
        driveSize: "M2",
        bayCount: wantCount,
        sortOrder: 0,
      },
    });
    return null;
  }

  if (wantCount < existing.bayCount) {
    // Shrinking — make sure no drive occupies a slot above the new count.
    const tooHigh = await prisma.drive.findFirst({
      where: { bayZoneId: existing.id, bayNumber: { gt: wantCount } },
      select: { id: true },
    });
    if (tooHigh) {
      return {
        fieldErrors: {
          m2SlotCount: [
            "A drive is mounted in a slot above this count — unmount it first",
          ],
        },
      };
    }
  }
  if (wantCount !== existing.bayCount) {
    await prisma.bayZone.update({
      where: { id: existing.id },
      data: { bayCount: wantCount },
    });
  }
  return null;
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
  const created = await prisma.component.create({ data: scalarData(parsed.data) });
  await reconcileRiserBayZone(created.id, parsed.data.type, parsed.data.m2SlotCount);
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
  const riserError = await reconcileRiserBayZone(
    id,
    parsed.data.type,
    parsed.data.m2SlotCount,
  );
  if (riserError) return riserError;
  await prisma.component.update({ where: { id }, data: scalarData(parsed.data) });
  revalidatePath("/components");
  revalidatePath(`/components/${id}`);
  redirect("/components");
}

export async function deleteComponent(id: string): Promise<void> {
  await requireUser();
  await prisma.component.delete({ where: { id } });
  revalidatePath("/components");
}
