// Shared constants for the faceplate designer (asset form) and the diagram
// render. A device face is a coarse grid the user drops blocks onto; blocks
// keep their natural size and are positioned by their grid-cell origin.

export const FACE_COLS = 12; // horizontal grid resolution of a device face
export const FACE_ROW_PX = 40; // designer row height in px

export type FaceId = "FRONT" | "REAR";

// Does this asset/face have a hand-designed layout? (any block with coords set)
export function hasCustomLayout(
  blocks: { face?: string | null; gridRow?: number | null; gridCol?: number | null }[],
  face: FaceId,
): boolean {
  return blocks.some(
    (b) =>
      (b.face ?? null) === face && b.gridRow != null && b.gridCol != null,
  );
}

// Normalised description of a placeable block, enough to size its footprint.
export type BlockSpec = {
  kind: "bay" | "port" | "outlet" | "builtin" | "psu" | "annotation";
  count?: number;
  columns?: number | null;
  rows?: number | null;
  ethernet?: number;
  sfp?: number;
  annotationKind?: "TEXT" | "SPACER" | "DIVIDER";
  colSpan?: number | null;
  rowSpan?: number | null;
  rackUnits: number;
};

const clampCols = (n: number) => Math.max(1, Math.min(FACE_COLS, Math.round(n)));

// Footprint of a block in grid cells (w columns × h rows). Drives the chip
// size, overlap checks, and the diagram render — so the designer and the rack
// always agree. Drive bays fill the device's full U height; ports/outlets are
// short; the user's chosen rows×columns shape sets the width.
export function blockSpan(b: BlockSpec): { w: number; h: number } {
  const U = Math.max(1, Math.floor(b.rackUnits));
  const count = b.count ?? 0;
  switch (b.kind) {
    case "bay":
      return { w: clampCols(b.columns || Math.min(count || 1, FACE_COLS)), h: U };
    case "port":
    case "outlet": {
      const cols = b.columns || Math.ceil((count || 1) / (b.rows || 2));
      const h = Math.max(1, Math.min(U, Math.ceil((b.rows ?? 2) / 2)));
      return { w: clampCols(cols), h };
    }
    case "builtin":
      return { w: clampCols(Math.ceil(((b.ethernet || 0) + (b.sfp || 0)) / 2) || 1), h: 1 };
    case "psu":
      return { w: 1, h: 1 };
    case "annotation":
      // Text / spacer / divider each occupy exactly one grid cell.
      return { w: 1, h: 1 };
    default:
      return { w: 1, h: 1 };
  }
}

export type Rect = { row: number; col: number; w: number; h: number };

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.col < b.col + b.w &&
    b.col < a.col + a.w &&
    a.row < b.row + b.h &&
    b.row < a.row + a.h
  );
}

// Clamp a top-left cell so a w×h block stays inside a cols×rows face.
export function clampCell(
  row: number,
  col: number,
  w: number,
  h: number,
  rows: number,
): { row: number; col: number } {
  return {
    col: Math.max(1, Math.min(col, FACE_COLS - w + 1)),
    row: Math.max(1, Math.min(row, Math.max(1, rows - h + 1))),
  };
}
