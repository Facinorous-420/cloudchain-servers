"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState } from "@/lib/form-state";
import { driveSchema, type DriveFormValues } from "@/lib/schemas/drive";
import { DRIVE_KINDS } from "@/lib/enums";
import type { DriveKind } from "@/generated/prisma";

function driveScalarData(v: DriveFormValues) {
  return {
    name: v.name,
    manufacturer: v.manufacturer,
    model: v.model,
    kind: v.kind,
    size: v.size,
    capacityGB: v.capacityGB,
    serialNumber: v.serialNumber,
    manufactureDate: v.manufactureDate,
    purchaseDate: v.purchaseDate,
    purchasePrice: v.purchasePrice,
    purchasedFrom: v.purchasedFrom,
    purchasedFromUrl: v.purchasedFromUrl,
    condition: v.condition,
    assignedUse: v.assignedUse,
    notes: v.notes,
    imagePath: v.imagePath,
    state: v.state,
    soldDate: v.soldDate,
    soldPrice: v.soldPrice,
  };
}

type Placement = {
  installedInId: string | null;
  bayZoneId: string | null;
  bayNumber: number | null;
};

// Enforces the drive placement rule (CLAUDE.md §5): a drive with a host must
// have a valid, in-range, unoccupied bay; a drive in storage has none.
// Placement is keyed by the bay zone — the host asset is derived from it. A zone
// can belong directly to an asset (server bays) or to an NVMe riser component,
// in which case the host is the asset the riser is installed in (or none, if the
// riser is itself in storage).
async function resolvePlacement(
  v: DriveFormValues,
  currentDriveId: string | null,
): Promise<{ ok: true; placement: Placement } | { ok: false; state: FormState }> {
  if (!v.bayZoneId) {
    // A mount target was chosen but no bay — nudge the user rather than
    // silently dropping the drive into storage.
    if (v.installedInId) {
      return {
        ok: false,
        state: {
          fieldErrors: {
            bayZoneId: ["Select a bay zone, or set 'Installed in' to storage"],
          },
        },
      };
    }
    return {
      ok: true,
      placement: { installedInId: null, bayZoneId: null, bayNumber: null },
    };
  }

  const { bayZoneId, bayNumber } = v;
  if (bayNumber == null) {
    return {
      ok: false,
      state: {
        fieldErrors: { bayNumber: ["Required when the drive is installed"] },
      },
    };
  }

  const zone = await prisma.bayZone.findUnique({
    where: { id: bayZoneId },
    include: { component: { select: { installedInId: true } } },
  });
  if (!zone) {
    return {
      ok: false,
      state: { fieldErrors: { bayZoneId: ["That bay zone no longer exists"] } },
    };
  }
  // Host: the asset that owns the zone, or the asset the riser is installed in.
  const hostAssetId = zone.assetId ?? zone.component?.installedInId ?? null;
  if (zone.driveSize !== v.size) {
    return {
      ok: false,
      state: {
        fieldErrors: {
          bayZoneId: [
            `This drive is ${v.size}, but that bay zone is ${zone.driveSize}`,
          ],
        },
      },
    };
  }
  if (bayNumber < 1 || bayNumber > zone.bayCount) {
    return {
      ok: false,
      state: {
        fieldErrors: {
          bayNumber: [`Bay number must be between 1 and ${zone.bayCount}`],
        },
      },
    };
  }

  const occupied = await prisma.drive.findFirst({
    where: {
      bayZoneId,
      bayNumber,
      ...(currentDriveId ? { NOT: { id: currentDriveId } } : {}),
    },
    select: { id: true },
  });
  if (occupied) {
    return {
      ok: false,
      state: { fieldErrors: { bayNumber: ["That bay is already occupied"] } },
    };
  }

  return {
    ok: true,
    placement: { installedInId: hostAssetId, bayZoneId, bayNumber },
  };
}

export async function createDrive(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = driveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const placement = await resolvePlacement(parsed.data, null);
  if (!placement.ok) return placement.state;

  await prisma.drive.create({
    data: { ...driveScalarData(parsed.data), ...placement.placement },
  });
  revalidatePath("/drives");
  redirect("/drives");
}

export async function updateDrive(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = driveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const placement = await resolvePlacement(parsed.data, id);
  if (!placement.ok) return placement.state;

  await prisma.drive.update({
    where: { id },
    data: { ...driveScalarData(parsed.data), ...placement.placement },
  });
  revalidatePath("/drives");
  redirect("/drives");
}

export async function deleteDrive(id: string): Promise<void> {
  await requireUser();
  await prisma.drive.delete({ where: { id } });
  revalidatePath("/drives");
}

// Drop an existing (in-storage) drive into a specific bay. Used by the
// topology inspector's "Mount existing drive" action — the user picks a
// drive from the compatible list and submits this form. We validate that
// the bay matches the drive size and isn't already filled.
export async function mountDriveInBay(formData: FormData): Promise<void> {
  await requireUser();
  const driveId = formData.get("driveId");
  const bayZoneId = formData.get("bayZoneId");
  const bayNumberRaw = formData.get("bayNumber");
  if (
    typeof driveId !== "string" ||
    typeof bayZoneId !== "string" ||
    typeof bayNumberRaw !== "string"
  ) {
    return;
  }
  const bayNumber = Number(bayNumberRaw);
  if (!Number.isFinite(bayNumber) || bayNumber < 1) return;

  const [drive, zone] = await Promise.all([
    prisma.drive.findUnique({ where: { id: driveId } }),
    prisma.bayZone.findUnique({
      where: { id: bayZoneId },
      include: { component: { select: { id: true, installedInId: true } } },
    }),
  ]);
  if (!drive || !zone) return;
  if (drive.state === "SOLD" || drive.state === "JUNKED") return;
  if (drive.size !== zone.driveSize) return;
  if (bayNumber > zone.bayCount) return;

  // Refuse to clobber an existing occupant.
  const occupied = await prisma.drive.findFirst({
    where: { bayZoneId, bayNumber, NOT: { id: drive.id } },
    select: { id: true },
  });
  if (occupied) return;

  // Host asset is the zone's asset, or the asset the riser is installed in.
  const hostAssetId = zone.assetId ?? zone.component?.installedInId ?? null;

  await prisma.drive.update({
    where: { id: drive.id },
    data: { installedInId: hostAssetId, bayZoneId, bayNumber },
  });
  revalidatePath("/drives");
  revalidatePath(`/drives/${drive.id}`);
  revalidatePath("/topology");
  if (zone.component) revalidatePath(`/components/${zone.component.id}`);
  if (hostAssetId) {
    revalidatePath(`/assets/${hostAssetId}`);
    const host = await prisma.asset.findUnique({
      where: { id: hostAssetId },
      select: { rackId: true },
    });
    if (host?.rackId) revalidatePath(`/racks/${host.rackId}`);
  }
}

// Create a brand-new drive directly into a bay (used by the riser detail page's
// "create + mount" quick action, mirroring mountDriveInBay for an existing one).
export async function createDriveInBay(formData: FormData): Promise<void> {
  await requireUser();
  const name = formData.get("name");
  const bayZoneId = formData.get("bayZoneId");
  const bayNumberRaw = formData.get("bayNumber");
  const capacityRaw = formData.get("capacityGB");
  const kindRaw = formData.get("kind");
  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    typeof bayZoneId !== "string" ||
    typeof bayNumberRaw !== "string"
  ) {
    return;
  }
  const bayNumber = Number(bayNumberRaw);
  const capacityGB = Number(capacityRaw);
  if (!Number.isFinite(bayNumber) || bayNumber < 1) return;
  if (!Number.isFinite(capacityGB) || capacityGB <= 0) return;

  const zone = await prisma.bayZone.findUnique({
    where: { id: bayZoneId },
    include: { component: { select: { id: true, installedInId: true } } },
  });
  if (!zone) return;
  if (bayNumber > zone.bayCount) return;

  const occupied = await prisma.drive.findFirst({
    where: { bayZoneId, bayNumber },
    select: { id: true },
  });
  if (occupied) return;

  const kind: DriveKind =
    typeof kindRaw === "string" &&
    (DRIVE_KINDS as readonly string[]).includes(kindRaw)
      ? (kindRaw as DriveKind)
      : "NVME";
  const hostAssetId = zone.assetId ?? zone.component?.installedInId ?? null;

  await prisma.drive.create({
    data: {
      name: name.trim(),
      kind,
      size: zone.driveSize,
      capacityGB: Math.floor(capacityGB),
      state: "IN_USE",
      installedInId: hostAssetId,
      bayZoneId,
      bayNumber,
    },
  });
  revalidatePath("/drives");
  revalidatePath("/topology");
  if (zone.component) revalidatePath(`/components/${zone.component.id}`);
  if (hostAssetId) {
    revalidatePath(`/assets/${hostAssetId}`);
    const host = await prisma.asset.findUnique({
      where: { id: hostAssetId },
      select: { rackId: true },
    });
    if (host?.rackId) revalidatePath(`/racks/${host.rackId}`);
  }
}

// Pull a drive out of its bay without deleting the record. The drive
// goes back to "storage" (installedInId, bayZoneId, bayNumber all null).
// Used by the bay inspector + drive detail page so swapping a drive is
// one click away.
export async function removeDriveFromBay(id: string): Promise<void> {
  await requireUser();
  const drive = await prisma.drive.findUnique({
    where: { id },
    select: {
      installedInId: true,
      installedIn: { select: { rackId: true } },
      bayZone: { select: { componentId: true } },
    },
  });
  await prisma.drive.update({
    where: { id },
    data: { installedInId: null, bayZoneId: null, bayNumber: null },
  });
  revalidatePath("/drives");
  revalidatePath(`/drives/${id}`);
  revalidatePath("/topology");
  if (drive?.installedInId) {
    revalidatePath(`/assets/${drive.installedInId}`);
  }
  if (drive?.installedIn?.rackId) {
    revalidatePath(`/racks/${drive.installedIn.rackId}`);
  }
  if (drive?.bayZone?.componentId) {
    revalidatePath(`/components/${drive.bayZone.componentId}`);
  }
}
