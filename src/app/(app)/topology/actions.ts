"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import {
  checkSupport,
  validatePlacement,
  type PlacedAsset,
} from "@/lib/placement";
import { parseDiagramPrefs } from "@/lib/diagram-prefs";

// Persist the current user's rack-diagram view preferences (per-user, JSON).
export async function saveDiagramPrefs(raw: unknown): Promise<void> {
  const user = await requireUser();
  if (!user.id) return;
  const prefs = parseDiagramPrefs(raw);
  await prisma.user.update({
    where: { id: user.id },
    data: { diagramPrefs: prefs },
  });
}

export type PlacementResult =
  | { ok: true }
  | { ok: false; reason: string }
  | {
      ok: false;
      reason: string;
      confirmRequired: true;
      dependents: { id: string; codename: string }[];
    };

type RackDrop = {
  kind: "rack";
  rackId: string;
  startU: number;
  gridColumn: number;
};

type StorageDrop = {
  kind: "storage";
  storageId: string | null;
};

export type PlacementTarget = RackDrop | StorageDrop;

// Runtime validation for the client-supplied drop target. The action args are
// typed but not trusted — a direct call can send NaN/floats/negatives, which
// would otherwise slip past the placement math (NaN comparisons are all false).
const placementTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("rack"),
    rackId: z.string().min(1),
    startU: z.number().int().min(1),
    gridColumn: z.number().int().min(0),
  }),
  z.object({
    kind: z.literal("storage"),
    storageId: z.string().min(1).nullable(),
  }),
]);

// Categories treated as "thin items" that can be mounted from a specific face.
const THIN_CATEGORIES = new Set(["PATCH_PANEL", "BLANK_PANEL", "SHELF"]);

// Asset states that no longer occupy physical rack space.
const INACTIVE_STATES = ["SOLD", "JUNKED"] as const;

// Map a DB asset row to the PlacedAsset shape the placement rules expect,
// normalising rack-form gear to a full-width span.
function toPlaced(
  o: {
    id: string;
    category: string;
    startU: number | null;
    rackUnits: number | null;
    gridColumn: number | null;
    columnSpan: number | null;
    formFactor: string;
    requiresSupport: boolean;
    rackFace: string | null;
    depthInches: number | null;
  },
  columnCount: number,
): PlacedAsset {
  const isRack = o.formFactor === "RACK";
  return {
    id: o.id,
    category: o.category,
    startU: o.startU as number,
    rackUnits: o.rackUnits as number,
    gridColumn: isRack ? 0 : o.gridColumn ?? 0,
    columnSpan: isRack ? columnCount : o.columnSpan ?? 1,
    requiresSupport: o.requiresSupport,
    rackFace: o.rackFace ?? null,
    depthInches: o.depthInches ?? null,
  };
}

// Compute, server-authoritatively, which assets would be left unsupported after
// `movedAsset` is placed at `newPlacement` (or removed from the rack when
// `newPlacement` is null). Iterates to a fixpoint so transitive support chains
// (A holds B holds C) all cascade. Excludes SOLD/JUNKED assets, which no longer
// occupy space. The moved asset's own support is validated separately.
async function computeUnsupportedAfterMove(
  rackId: string,
  movedAssetId: string,
  newPlacement: PlacedAsset | null,
  columnCount: number,
): Promise<{ id: string; codename: string }[]> {
  const rows = await prisma.asset.findMany({
    where: {
      rackId,
      id: { not: movedAssetId },
      startU: { not: null },
      rackUnits: { not: null },
      state: { notIn: [...INACTIVE_STATES] },
    },
    select: {
      id: true,
      codename: true,
      category: true,
      startU: true,
      rackUnits: true,
      gridColumn: true,
      columnSpan: true,
      formFactor: true,
      requiresSupport: true,
      rackFace: true,
      depthInches: true,
    },
  });

  const codenames = new Map(rows.map((r) => [r.id, r.codename]));
  const placed = rows.map((r) => toPlaced(r, columnCount));

  // `present` holds the assets still standing; the moved asset (at its new
  // position) is always available as a supporter but is never itself evaluated.
  const present = new Map(placed.map((p) => [p.id, p]));
  const removed = new Set<string>();

  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of present.values()) {
      if (!candidate.requiresSupport) continue;
      const supporters: PlacedAsset[] = [];
      if (newPlacement) supporters.push(newPlacement);
      for (const other of present.values()) {
        if (other.id !== candidate.id) supporters.push(other);
      }
      if (!checkSupport(candidate, supporters).ok) {
        present.delete(candidate.id);
        removed.add(candidate.id);
        changed = true;
      }
    }
  }

  return [...removed].map((id) => ({ id, codename: codenames.get(id) ?? id }));
}

export async function updateAssetPlacement(
  assetId: string,
  target: PlacementTarget,
): Promise<PlacementResult> {
  await requireUser();

  const parsedTarget = placementTargetSchema.safeParse(target);
  if (!parsedTarget.success) {
    return { ok: false, reason: "Invalid drop target." };
  }
  target = parsedTarget.data;

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      category: true,
      formFactor: true,
      rackUnits: true,
      columnSpan: true,
      requiresSupport: true,
      rackId: true,
      startU: true,
      gridColumn: true,
      rackFace: true,
      depthInches: true,
    },
  });
  if (!asset) return { ok: false, reason: "Asset not found." };

  // ---------- Drop into a storage box ----------
  if (target.kind === "storage") {
    if (target.storageId) {
      const storage = await prisma.storage.findUnique({
        where: { id: target.storageId },
        select: { id: true },
      });
      if (!storage) return { ok: false, reason: "Storage box not found." };
    }

    if (asset.rackId && asset.startU != null && asset.rackUnits != null) {
      const rack = await prisma.rack.findUnique({
        where: { id: asset.rackId },
        select: { columnCount: true },
      });
      if (rack) {
        const deps = await computeUnsupportedAfterMove(
          asset.rackId,
          assetId,
          null,
          rack.columnCount,
        );
        if (deps.length > 0) {
          return {
            ok: false,
            reason: "Moving this asset will leave some items unsupported.",
            confirmRequired: true,
            dependents: deps,
          };
        }
      }
    }

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        storageId: target.storageId,
        rackId: null,
        startU: null,
        gridColumn: null,
        columnSpan: null,
        location: "STORAGE",
      },
    });
    revalidatePath("/topology");
    revalidatePath(`/assets/${assetId}`);
    revalidatePath("/assets");
    revalidatePath("/storages");
    if (target.storageId) revalidatePath(`/storages/${target.storageId}`);
    if (asset.rackId) revalidatePath(`/racks/${asset.rackId}`);
    return { ok: true };
  }

  // ---------- Drop onto the rack ----------
  const rack = await prisma.rack.findUnique({
    where: { id: target.rackId },
    select: { id: true, totalU: true, columnCount: true, depthInches: true },
  });
  if (!rack) return { ok: false, reason: "Rack not found." };

  if (asset.rackUnits == null || asset.rackUnits < 1) {
    return {
      ok: false,
      reason:
        "Asset has no Rack U height — edit it and set Rack units first.",
    };
  }

  const isRackForm = asset.formFactor === "RACK";
  const columnSpan = isRackForm ? rack.columnCount : asset.columnSpan ?? 1;
  const gridColumn = isRackForm ? 0 : target.gridColumn;

  const others = await prisma.asset.findMany({
    where: {
      rackId: rack.id,
      id: { not: assetId },
      startU: { not: null },
      rackUnits: { not: null },
      state: { notIn: [...INACTIVE_STATES] },
    },
    select: {
      id: true,
      category: true,
      startU: true,
      rackUnits: true,
      gridColumn: true,
      columnSpan: true,
      formFactor: true,
      requiresSupport: true,
      rackFace: true,
      depthInches: true,
    },
  });

  const otherPlaced: PlacedAsset[] = others.map((o) => toPlaced(o, rack.columnCount));

  // Thin items default to FRONT face when first placed in a rack
  const candidateRackFace =
    asset.rackFace ??
    (THIN_CATEGORIES.has(asset.category) ? "FRONT" : null);

  const candidate: PlacedAsset = {
    id: assetId,
    category: asset.category,
    startU: target.startU,
    rackUnits: asset.rackUnits,
    gridColumn,
    columnSpan,
    requiresSupport: asset.requiresSupport,
    rackFace: candidateRackFace,
    depthInches: asset.depthInches ?? null,
  };

  const result = validatePlacement(
    candidate,
    otherPlaced,
    rack.totalU,
    rack.columnCount,
    rack.depthInches ?? 24.0,
  );
  if (!result.ok) return result;

  // Moving away from the current rack position must not orphan dependents.
  if (asset.rackId === rack.id && asset.startU != null) {
    const deps = await computeUnsupportedAfterMove(
      rack.id,
      assetId,
      candidate,
      rack.columnCount,
    );
    if (deps.length > 0) {
      return {
        ok: false,
        reason: "Moving this asset will leave some items unsupported.",
        confirmRequired: true,
        dependents: deps,
      };
    }
  }

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      rackId: rack.id,
      startU: target.startU,
      gridColumn,
      columnSpan,
      storageId: null,
      location: "RACKED",
      // Persist the rackFace for thin items the first time they're placed
      ...(candidateRackFace !== (asset.rackFace ?? null)
        ? { rackFace: candidateRackFace }
        : {}),
    },
  });
  revalidatePath("/topology");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath(`/racks/${rack.id}`);
  if (asset.rackId && asset.rackId !== rack.id) {
    revalidatePath(`/racks/${asset.rackId}`);
  }
  return { ok: true };
}

// Create a POWER connection from a PSU to "Wall" (no B-end asset).
export async function connectPsuToWall(
  assetId: string,
  psuIndex: number,
): Promise<void> {
  await requireUser();

  if (!Number.isInteger(psuIndex) || psuIndex < 1) return;

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, psuCount: true },
  });
  if (!asset) return;
  if ((asset.psuCount ?? 0) < psuIndex) return;

  // Don't create a duplicate "PSU N → Wall" row on repeated clicks. Match
  // "PSU N" exactly or "PSU N <something>" (e.g. "PSU N port 1"), never "PSU NN".
  const existing = await prisma.connection.findFirst({
    where: {
      type: "POWER",
      aEndAssetId: assetId,
      OR: [
        { aEndLabel: `PSU ${psuIndex}` },
        { aEndLabel: { startsWith: `PSU ${psuIndex} ` } },
      ],
    },
    select: { id: true },
  });
  if (existing) return;

  await prisma.connection.create({
    data: {
      type: "POWER",
      aEndAssetId: assetId,
      aEndLabel: `PSU ${psuIndex}`,
      bEndAssetId: null,
      bEndLabel: "Wall",
    },
  });
  revalidatePath("/topology");
  revalidatePath(`/assets/${assetId}`);
}

// Toggle an asset's mounting direction between FRONT_FRONT and FRONT_REAR.
// Only valid for full-depth items (rackFace = null). Thin items use flipRackFace.
export async function flipFaceOrientation(assetId: string): Promise<void> {
  await requireUser();
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { faceOrientation: true, rackFace: true },
  });
  if (!asset || asset.rackFace != null) return; // thin items don't use faceOrientation
  const next =
    asset.faceOrientation === "FRONT_REAR" ? "FRONT_FRONT" : "FRONT_REAR";
  await prisma.asset.update({
    where: { id: assetId },
    data: { faceOrientation: next },
  });
  revalidatePath("/topology");
  revalidatePath(`/assets/${assetId}`);
}

// Move a thin item (PATCH_PANEL, BLANK_PANEL, SHELF) to the opposite rack face.
// No-ops silently if the target face is already occupied at the same U.
export async function flipRackFace(assetId: string): Promise<void> {
  await requireUser();
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { rackFace: true, rackId: true, startU: true, rackUnits: true },
  });
  if (!asset?.rackFace || !asset.rackId || asset.startU == null || asset.rackUnits == null) return;

  const targetFace = asset.rackFace === "FRONT" ? "REAR" : "FRONT";
  const assetEnd = asset.startU + asset.rackUnits - 1;

  // Fetch all thin items on the target face in this rack and check U overlap
  const allOnTargetFace = await prisma.asset.findMany({
    where: {
      rackId: asset.rackId,
      id: { not: assetId },
      rackFace: targetFace,
      startU: { not: null },
      rackUnits: { not: null },
      state: { notIn: [...INACTIVE_STATES] },
    },
    select: { startU: true, rackUnits: true },
  });

  const hasConflict = allOnTargetFace.some((o) => {
    const oEnd = o.startU! + (o.rackUnits ?? 1) - 1;
    return o.startU! <= assetEnd && asset.startU! <= oEnd;
  });

  if (hasConflict) return; // silently no-op; UI shows disabled button

  await prisma.asset.update({
    where: { id: assetId },
    data: { rackFace: targetFace },
  });
  revalidatePath("/topology");
  revalidatePath(`/assets/${assetId}`);
}

// Confirmed move: perform the placement AND cascade dependent items to storage.
// Re-validates the placement and re-derives the dependent set server-side — the
// client is never trusted for either the target or which items get cascaded.
export async function forceMoveWithCascade(
  assetId: string,
  target: PlacementTarget,
): Promise<PlacementResult> {
  await requireUser();

  const parsedTarget = placementTargetSchema.safeParse(target);
  if (!parsedTarget.success) {
    return { ok: false, reason: "Invalid drop target." };
  }
  target = parsedTarget.data;

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      category: true,
      formFactor: true,
      rackUnits: true,
      columnSpan: true,
      requiresSupport: true,
      rackId: true,
      startU: true,
      rackFace: true,
      depthInches: true,
    },
  });
  if (!asset) return { ok: false, reason: "Asset not found." };

  if (target.kind === "storage") {
    if (target.storageId) {
      const storage = await prisma.storage.findUnique({
        where: { id: target.storageId },
        select: { id: true },
      });
      if (!storage) return { ok: false, reason: "Storage box not found." };
    }

    const dependentIds = asset.rackId
      ? (
          await computeUnsupportedAfterMove(
            asset.rackId,
            assetId,
            null,
            (
              await prisma.rack.findUnique({
                where: { id: asset.rackId },
                select: { columnCount: true },
              })
            )?.columnCount ?? 6,
          )
        ).map((d) => d.id)
      : [];

    await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId },
        data: {
          storageId: target.storageId,
          rackId: null,
          startU: null,
          gridColumn: null,
          columnSpan: null,
          location: "STORAGE",
        },
      }),
      prisma.asset.updateMany({
        where: { id: { in: dependentIds } },
        data: {
          rackId: null,
          startU: null,
          gridColumn: null,
          columnSpan: null,
          location: "STORAGE",
        },
      }),
    ]);

    revalidatePath("/topology");
    revalidatePath(`/assets/${assetId}`);
    revalidatePath("/assets");
    revalidatePath("/storages");
    if (target.storageId) revalidatePath(`/storages/${target.storageId}`);
    if (asset.rackId) revalidatePath(`/racks/${asset.rackId}`);
    for (const id of dependentIds) revalidatePath(`/assets/${id}`);
    return { ok: true };
  }

  const rack = await prisma.rack.findUnique({
    where: { id: target.rackId },
    select: { id: true, totalU: true, columnCount: true, depthInches: true },
  });
  if (!rack) return { ok: false, reason: "Rack not found." };

  if (asset.rackUnits == null || asset.rackUnits < 1) {
    return {
      ok: false,
      reason: "Asset has no Rack U height — edit it and set Rack units first.",
    };
  }

  const isRackForm = asset.formFactor === "RACK";
  const columnSpan = isRackForm ? rack.columnCount : asset.columnSpan ?? 1;
  const gridColumn = isRackForm ? 0 : target.gridColumn;

  const others = await prisma.asset.findMany({
    where: {
      rackId: rack.id,
      id: { not: assetId },
      startU: { not: null },
      rackUnits: { not: null },
      state: { notIn: [...INACTIVE_STATES] },
    },
    select: {
      id: true,
      category: true,
      startU: true,
      rackUnits: true,
      gridColumn: true,
      columnSpan: true,
      formFactor: true,
      requiresSupport: true,
      rackFace: true,
      depthInches: true,
    },
  });

  const candidateRackFace =
    asset.rackFace ??
    (THIN_CATEGORIES.has(asset.category) ? "FRONT" : null);

  const candidate: PlacedAsset = {
    id: assetId,
    category: asset.category,
    startU: target.startU,
    rackUnits: asset.rackUnits,
    gridColumn,
    columnSpan,
    requiresSupport: asset.requiresSupport,
    rackFace: candidateRackFace,
    depthInches: asset.depthInches ?? null,
  };

  // Re-validate the moved asset's own placement (bounds / overlap / support).
  const result = validatePlacement(
    candidate,
    others.map((o) => toPlaced(o, rack.columnCount)),
    rack.totalU,
    rack.columnCount,
    rack.depthInches ?? 24.0,
  );
  if (!result.ok) return result;

  // Re-derive the cascade set from the new layout — ignore any client input.
  const dependentIds = (
    asset.rackId === rack.id && asset.startU != null
      ? await computeUnsupportedAfterMove(
          rack.id,
          assetId,
          candidate,
          rack.columnCount,
        )
      : []
  ).map((d) => d.id);

  await prisma.$transaction([
    prisma.asset.update({
      where: { id: assetId },
      data: {
        rackId: rack.id,
        startU: target.startU,
        gridColumn,
        columnSpan,
        storageId: null,
        location: "RACKED",
        ...(candidateRackFace !== (asset.rackFace ?? null)
          ? { rackFace: candidateRackFace }
          : {}),
      },
    }),
    prisma.asset.updateMany({
      where: { id: { in: dependentIds } },
      data: {
        rackId: null,
        startU: null,
        gridColumn: null,
        columnSpan: null,
        location: "STORAGE",
      },
    }),
  ]);

  revalidatePath("/topology");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/storages");
  revalidatePath(`/racks/${rack.id}`);
  if (asset.rackId && asset.rackId !== rack.id) {
    revalidatePath(`/racks/${asset.rackId}`);
  }
  for (const id of dependentIds) revalidatePath(`/assets/${id}`);
  return { ok: true };
}
