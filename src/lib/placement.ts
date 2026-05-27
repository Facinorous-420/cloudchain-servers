// Rack placement validation — CLAUDE.md §7. Pure functions so both the
// server action (authoritative) and the client (preview / hover feedback)
// can share the same rules.

export type Placement = {
  // Bottom-most U occupied (U1 = floor).
  startU: number;
  rackUnits: number;
  // 0-indexed column for towers. Rack-form assets always span the full
  // width, in which case the caller passes gridColumn=0 + columnSpan=rack.columnCount.
  gridColumn: number;
  columnSpan: number;
};

// Extra fields for thin items (patch panels, blank panels, shelves) that can
// be mounted from a specific rack face rather than occupying the full depth.
type ThinItemFields = {
  rackFace?: string | null;    // "FRONT" | "REAR" | null (null = full depth)
  depthInches?: number | null; // physical depth — used for shelf coexistence check
  category?: string;           // used to determine if depth check is needed
};

export type PlacedAsset = Placement &
  ThinItemFields & {
    id: string;
    requiresSupport: boolean;
  };

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

// Inclusive U range a placement occupies.
function uRange(p: Placement): { from: number; to: number } {
  return { from: p.startU, to: p.startU + p.rackUnits - 1 };
}

// Inclusive column range a placement occupies.
function colRange(p: Placement): { from: number; to: number } {
  return { from: p.gridColumn, to: p.gridColumn + p.columnSpan - 1 };
}

function rangesOverlap(
  a: { from: number; to: number },
  b: { from: number; to: number },
): boolean {
  return a.from <= b.to && b.from <= a.to;
}

// Does the candidate placement collide with any of the other already-placed
// assets? Accounts for thin items on opposite faces: FRONT vs REAR items at
// the same U never overlap spatially.
export function checkOverlap(
  candidate: Placement & ThinItemFields,
  others: (Placement & ThinItemFields)[],
): ValidationResult {
  const candU = uRange(candidate);
  const candC = colRange(candidate);
  const candFace = candidate.rackFace ?? null;

  for (const o of others) {
    if (!rangesOverlap(uRange(o), candU) || !rangesOverlap(colRange(o), candC)) {
      continue; // no U+column overlap
    }
    const oFace = o.rackFace ?? null;

    // Thin items on opposite faces can share the same U — no spatial overlap.
    if (candFace && oFace && candFace !== oFace) {
      continue;
    }

    // A full-depth item (rackFace=null) blocks both faces; any item at the
    // same U/column conflicts with it.
    return {
      ok: false,
      reason: "Overlaps another asset already at that position.",
    };
  }
  return { ok: true };
}

// For shelves on opposite faces at the same U, their combined depth must fit
// within the rack. Patch panels and blank panels are trivially thin so they
// are exempt from this check. Pass rackDepthInches=24 if unknown (standard).
export function checkShelfDepth(
  candidate: Placement & ThinItemFields,
  others: (Placement & ThinItemFields)[],
  rackDepthInches: number,
): ValidationResult {
  if (candidate.category !== "SHELF" || !candidate.rackFace) return { ok: true };

  const candU = uRange(candidate);
  const candC = colRange(candidate);
  const targetFace = candidate.rackFace === "FRONT" ? "REAR" : "FRONT";

  for (const o of others) {
    if (o.rackFace !== targetFace) continue;
    if (!rangesOverlap(uRange(o), candU) || !rangesOverlap(colRange(o), candC)) continue;
    if (o.category !== "SHELF") continue;

    const candDepth = candidate.depthInches ?? 0;
    const oDepth = o.depthInches ?? 0;
    if (candDepth > 0 || oDepth > 0) {
      if (candDepth + oDepth > rackDepthInches) {
        return {
          ok: false,
          reason: `Shelf depths too large: ${candDepth}" + ${oDepth}" exceeds the rack's ${rackDepthInches}" depth.`,
        };
      }
    }
  }
  return { ok: true };
}

// Support rule (CLAUDE.md §7): requiresSupport assets must rest on the rack
// floor OR on another asset whose top edge is directly beneath them, and
// this must hold for EVERY column they occupy. Rail-mounted gear (rack
// form, requiresSupport=false) doesn't need support and can float.
export function checkSupport(
  candidate: Placement & { requiresSupport: boolean },
  others: PlacedAsset[],
): ValidationResult {
  if (!candidate.requiresSupport) return { ok: true };
  if (candidate.startU === 1) return { ok: true };
  const targetUBelow = candidate.startU - 1;
  const candC = colRange(candidate);
  for (let col = candC.from; col <= candC.to; col++) {
    const supported = others.some((o) => {
      const oC = colRange(o);
      const oTop = o.startU + o.rackUnits - 1;
      // Thin items (rackFace != null, e.g. patch panels, blank panels) are
      // only surface-mounted on one rack face and cannot physically bear the
      // weight of a tower or shelf item resting on top of them.
      const isFullDepth = !o.rackFace;
      return oC.from <= col && col <= oC.to && oTop === targetUBelow && isFullDepth;
    });
    if (!supported) {
      return {
        ok: false,
        reason: `Column ${col + 1} is unsupported — needs the rack floor or a full-depth item directly below.`,
      };
    }
  }
  return { ok: true };
}

// In-bounds check so we reject placements that run off the top of the
// rack or off the side of the column grid.
export function checkInBounds(
  candidate: Placement,
  totalU: number,
  columnCount: number,
): ValidationResult {
  if (candidate.rackUnits < 1)
    return { ok: false, reason: "Rack units must be 1 or higher." };
  if (candidate.columnSpan < 1)
    return { ok: false, reason: "Column span must be 1 or higher." };
  if (candidate.startU < 1)
    return { ok: false, reason: "Start U must be 1 or higher." };
  if (candidate.startU + candidate.rackUnits - 1 > totalU)
    return {
      ok: false,
      reason: `Asset extends past U${totalU} (top of rack).`,
    };
  if (candidate.gridColumn < 0)
    return { ok: false, reason: "Grid column must be 0 or higher." };
  if (candidate.gridColumn + candidate.columnSpan > columnCount)
    return {
      ok: false,
      reason: `Asset extends past column ${columnCount}.`,
    };
  return { ok: true };
}

// Convenience composite — runs the checks in order and returns the first failure.
// rackDepthInches defaults to 24" (standard rack depth) if not provided.
export function validatePlacement(
  candidate: Placement & { requiresSupport: boolean } & ThinItemFields,
  others: PlacedAsset[],
  totalU: number,
  columnCount: number,
  rackDepthInches = 24.0,
): ValidationResult {
  const bounds = checkInBounds(candidate, totalU, columnCount);
  if (!bounds.ok) return bounds;
  const overlap = checkOverlap(candidate, others);
  if (!overlap.ok) return overlap;
  const depth = checkShelfDepth(candidate, others, rackDepthInches);
  if (!depth.ok) return depth;
  return checkSupport(candidate, others);
}
