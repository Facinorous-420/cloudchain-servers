"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState } from "@/lib/form-state";
import {
  connectionSchema,
  type ConnectionFormValues,
} from "@/lib/schemas/connection";

// Swap the A and B endpoint fields of a parsed connection. The A end's asset
// and label are required, so callers must ensure the end moving into A is
// non-null (the `?? ""` fallbacks are dead once that guard holds).
function swapEnds(v: ConnectionFormValues): ConnectionFormValues {
  return {
    ...v,
    aEndAssetId: v.bEndAssetId ?? "",
    aEndLabel: v.bEndLabel ?? "",
    aEndPortGroupId: v.bEndPortGroupId,
    aEndPortNumber: v.bEndPortNumber,
    aEndOutletGroupId: v.bEndOutletGroupId,
    aEndOutletNumber: v.bEndOutletNumber,
    bEndAssetId: v.aEndAssetId,
    bEndLabel: v.aEndLabel,
    bEndPortGroupId: v.aEndPortGroupId,
    bEndPortNumber: v.aEndPortNumber,
    bEndOutletGroupId: v.aEndOutletGroupId,
    bEndOutletNumber: v.aEndOutletNumber,
  };
}

// Enforce the patch-panel front/rear invariant the readers rely on:
//   FRONT (patch side)     ⇒ the patch panel is the B end
//   REAR  (permanent side) ⇒ the patch panel is the A end
// When exactly one end is a patch-panel port group and the user picked a side
// that doesn't match the current ordering, swap the ends before saving.
async function normalizePatchPanelEnds(
  v: ConnectionFormValues,
  patchPanelSide: string | null,
): Promise<ConnectionFormValues> {
  if (!patchPanelSide) return v;
  const groupIds = [v.aEndPortGroupId, v.bEndPortGroupId].filter(
    (id): id is string => Boolean(id),
  );
  if (groupIds.length === 0) return v;

  const ppGroups = await prisma.portGroup.findMany({
    where: { id: { in: groupIds }, asset: { category: "PATCH_PANEL" } },
    select: { id: true },
  });
  const ppSet = new Set(ppGroups.map((g) => g.id));
  const aIsPp = Boolean(v.aEndPortGroupId && ppSet.has(v.aEndPortGroupId));
  const bIsPp = Boolean(v.bEndPortGroupId && ppSet.has(v.bEndPortGroupId));
  if (aIsPp === bIsPp) return v; // both or neither — nothing to normalise

  const ppOnA = aIsPp;
  const wantPpOnA = patchPanelSide === "REAR";
  if (ppOnA === wantPpOnA) return v; // already correct ordering

  // The end moving into the (required) A slot must carry an asset + label.
  const movingToAAsset = ppOnA ? v.bEndAssetId : v.aEndAssetId;
  const movingToALabel = ppOnA ? v.bEndLabel : v.aEndLabel;
  if (!movingToAAsset || !movingToALabel) return v; // can't normalise safely

  return swapEnds(v);
}

function scalarData(v: ConnectionFormValues) {
  return {
    type: v.type,
    aEndAssetId: v.aEndAssetId,
    aEndLabel: v.aEndLabel,
    aEndPortGroupId: v.aEndPortGroupId,
    aEndPortNumber: v.aEndPortNumber,
    aEndOutletGroupId: v.aEndOutletGroupId,
    aEndOutletNumber: v.aEndOutletNumber,
    bEndAssetId: v.bEndAssetId,
    bEndLabel: v.bEndLabel,
    bEndPortGroupId: v.bEndPortGroupId,
    bEndPortNumber: v.bEndPortNumber,
    bEndOutletGroupId: v.bEndOutletGroupId,
    bEndOutletNumber: v.bEndOutletNumber,
    cableType: v.cableType,
    cableCategory: v.cableCategory,
    isPatch: v.isPatch,
    speed: v.speed,
    cableLengthFeet: v.cableLengthFeet,
    estimatedCableLengthFeet: v.estimatedCableLengthFeet,
    serviceLoopLengthInches: v.serviceLoopLengthInches,
    notes: v.notes,
  };
}

export async function createConnection(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = connectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const patchPanelSide = formData.get("patchPanelSide");
  const data = await normalizePatchPanelEnds(
    parsed.data,
    typeof patchPanelSide === "string" ? patchPanelSide : null,
  );
  await prisma.connection.create({ data: scalarData(data) });
  revalidatePath("/connections");
  if (data.aEndAssetId) {
    revalidatePath(`/assets/${data.aEndAssetId}`);
  }
  if (data.bEndAssetId) {
    revalidatePath(`/assets/${data.bEndAssetId}`);
  }
  redirect("/connections");
}

export async function updateConnection(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = connectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const patchPanelSide = formData.get("patchPanelSide");
  const data = await normalizePatchPanelEnds(
    parsed.data,
    typeof patchPanelSide === "string" ? patchPanelSide : null,
  );
  await prisma.connection.update({
    where: { id },
    data: scalarData(data),
  });
  revalidatePath("/connections");
  if (data.aEndAssetId) {
    revalidatePath(`/assets/${data.aEndAssetId}`);
  }
  if (data.bEndAssetId) {
    revalidatePath(`/assets/${data.bEndAssetId}`);
  }
  redirect("/connections");
}

export async function deleteConnection(id: string): Promise<void> {
  await requireUser();
  const conn = await prisma.connection.delete({ where: { id } });
  revalidatePath("/connections");
  revalidatePath(`/assets/${conn.aEndAssetId}`);
  if (conn.bEndAssetId) revalidatePath(`/assets/${conn.bEndAssetId}`);
}
