// Shared geometry for the faceplate designer (asset form) and the diagram
// render. Every port/bay/outlet is drawn at its REAL physical size, scaled by a
// pixels-per-inch that derives from the rack-unit height (1U = 1.75"), so a
// drive bay or RJ45 jack looks the size it actually is relative to the device.

export const FACE_COLS = 12; // horizontal grid resolution of a device face
export const U_INCHES = 1.75; // one rack unit in inches
export const RACK_FACE_INCHES = 19; // default usable face width for rack gear

export type FaceId = "FRONT" | "REAR";

// Real-world element sizes in inches (width × height as mounted on the face).
// Used to size each block's footprint and to bound how many fit per row/column.
export const ELEMENT_INCHES = {
  bayLFF: { w: 3.0, h: 1.0 }, // 3.5" drive in a caddy, mounted flat
  baySFF: { w: 1.12, h: 0.6 }, // 2.5" drive in a caddy
  bayM2: { w: 0.9, h: 0.45 },
  port: { w: 0.62, h: 0.55 }, // RJ45 jack
  portSfp: { w: 0.5, h: 0.45 }, // SFP cage
  outlet: { w: 0.95, h: 0.95 }, // C13 / NEMA
  psu: { w: 2.0, h: 1.1 }, // hot-swap PSU module (typical 1U server)
} as const;

export const ELEMENT_GAP_INCHES = 0.07;

export type FaceWidthSource = number; // usable face width in inches

export function bayElementInches(driveSize: string, vertical = false) {
  const el =
    driveSize === "LFF"
      ? ELEMENT_INCHES.bayLFF
      : driveSize === "M2"
        ? ELEMENT_INCHES.bayM2
        : ELEMENT_INCHES.baySFF;
  return vertical && driveSize !== "LFF" ? { w: el.h, h: el.w } : el;
}

export function portElementInches(portType?: string | null) {
  return portType && /SFP|QSFP|FIBER/i.test(portType)
    ? ELEMENT_INCHES.portSfp
    : ELEMENT_INCHES.port;
}

// Normalised description of a placeable block, enough to size its footprint.
export type BlockSpec = {
  kind: "bay" | "port" | "outlet" | "builtin" | "psu" | "annotation";
  count?: number;
  columns?: number | null;
  rows?: number | null;
  driveSize?: string;
  portType?: string | null;
  ethernet?: number;
  sfp?: number;
  annotationKind?: "TEXT" | "SPACER" | "DIVIDER";
  vertical?: boolean; // SFF/M2 bays: portrait orientation (slot height > width)
  rackUnits: number;
};

const clampCols = (n: number) => Math.max(1, Math.min(FACE_COLS, Math.round(n)));

// Per-element physical size for a block's elements.
function elementInches(b: BlockSpec): { w: number; h: number } {
  switch (b.kind) {
    case "bay":
      return bayElementInches(b.driveSize ?? "SFF", b.vertical);
    case "port":
      return portElementInches(b.portType);
    case "outlet":
      return ELEMENT_INCHES.outlet;
    case "builtin":
      return ELEMENT_INCHES.port;
    case "psu":
      return ELEMENT_INCHES.psu;
    default:
      return { w: 0.6, h: 0.6 };
  }
}

// How many elements a block has (bays/ports/outlets/NICs).
function elementCount(b: BlockSpec): number {
  if (b.kind === "builtin") return (b.ethernet ?? 0) + (b.sfp ?? 0);
  if (b.kind === "psu") return 1;
  return b.count ?? 0;
}

// Physical limits on a block's element matrix, given the face geometry.
//  - maxCols: most elements that fit across the face width
//  - maxRows: most rows that fit in the device's U height
//  - capacity: maxCols × maxRows (the most elements that fit at all)
//  - minCols: fewest columns so the rows still fit the height
//  - fits: whether all the block's elements fit on the face
export function columnBounds(
  b: BlockSpec,
  faceWidthInches: number,
): { maxCols: number; maxRows: number; minCols: number; capacity: number; fits: boolean; effMax: number } {
  const el = elementInches(b);
  const n = elementCount(b);
  const faceHeightInches = U_INCHES * Math.max(1, Math.floor(b.rackUnits));
  const maxCols = Math.max(1, Math.floor(faceWidthInches / (el.w + ELEMENT_GAP_INCHES)));
  const maxRows = Math.max(1, Math.floor(faceHeightInches / (el.h + ELEMENT_GAP_INCHES)));
  const capacity = maxCols * maxRows;
  const minCols = Math.max(1, Math.ceil(n / maxRows));
  // effMax caps columns at the element count — a 2-port group can't have 27 columns.
  const effMax = Math.min(maxCols, n);
  return { maxCols, maxRows, minCols, capacity, fits: n <= capacity, effMax };
}

// Resolve the effective columns for a block's element matrix, always clamped so
// every element fits the face: between minCols (enough rows for the height) and
// maxCols (fits the width). An explicit `columns`/`rows` is honoured within
// those bounds; otherwise default to filling the width in as few rows as fit.
export function resolveColumns(b: BlockSpec, faceWidthInches: number): number {
  const n = elementCount(b);
  if (n <= 0) return 1;
  const { maxCols, minCols } = columnBounds(b, faceWidthInches);
  let cols: number;
  if (b.columns && b.columns > 0) cols = b.columns;
  else if (b.rows && b.rows > 0) cols = Math.ceil(n / b.rows);
  else cols = Math.min(n, maxCols);
  // Clamp to [minCols..maxCols]; minCols may exceed maxCols when it can't fit,
  // in which case cap at maxCols (best effort) and the caller flags "doesn't fit".
  cols = Math.min(cols, maxCols);
  cols = Math.max(cols, Math.min(minCols, maxCols));
  return Math.max(1, cols);
}

// Total physical size of a block's element matrix, in inches.
export function groupInches(
  b: BlockSpec,
  faceWidthInches: number,
): { wIn: number; hIn: number; cols: number; rows: number } {
  const n = elementCount(b);
  const el = elementInches(b);
  const cols = resolveColumns(b, faceWidthInches);
  const rows = Math.max(1, Math.ceil(n / cols));
  return {
    wIn: cols * el.w + (cols - 1) * ELEMENT_GAP_INCHES,
    hIn: rows * el.h + (rows - 1) * ELEMENT_GAP_INCHES,
    cols,
    rows,
  };
}

// Footprint of a block in grid cells (w columns × h rows), derived from its real
// physical size relative to the face. Pixel-independent, so the designer and the
// rack always agree.
export function blockSpan(b: BlockSpec, faceWidthInches: number): { w: number; h: number } {
  if (b.kind === "annotation") {
    // A DIVIDER runs the full device height; TEXT and SPACER occupy one row.
    const h = b.annotationKind === "DIVIDER" ? Math.max(1, Math.floor(b.rackUnits)) : 1;
    return { w: 1, h };
  }
  const g = groupInches(b, faceWidthInches);
  return {
    w: clampCols(Math.ceil((FACE_COLS * g.wIn) / faceWidthInches)),
    h: Math.max(1, Math.min(Math.max(1, Math.floor(b.rackUnits)), Math.ceil(g.hIn / U_INCHES))),
  };
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
