// Shared geometry for the faceplate designer (asset form) and the diagram
// render. Every port/bay/outlet is drawn at its REAL physical size, scaled by a
// pixels-per-inch that derives from the rack-unit height (1U = 1.75"), so a
// drive bay or RJ45 jack looks the size it actually is relative to the device.

export const FACE_COLS = 12; // horizontal grid resolution of a device face
export const U_INCHES = 1.75; // one rack unit in inches
export const RACK_FACE_INCHES = 19; // default usable face width for rack gear

export type FaceId = "FRONT" | "REAR";

// Real-world element sizes in inches (width × height as mounted on the face).
export const ELEMENT_INCHES = {
  bayLFF: { w: 4.0, h: 1.0 }, // 3.5" drive in a caddy
  baySFF: { w: 2.85, h: 0.62 }, // 2.5" drive in a caddy
  bayM2: { w: 0.9, h: 0.45 },
  port: { w: 0.62, h: 0.55 }, // RJ45 jack
  portSfp: { w: 0.53, h: 0.45 }, // SFP cage
  outlet: { w: 0.9, h: 0.9 }, // C13 / NEMA
  psu: { w: 3.3, h: 1.6 }, // PSU module
} as const;

export const ELEMENT_GAP_INCHES = 0.07;

export type FaceWidthSource = number; // usable face width in inches

export function bayElementInches(driveSize: string) {
  return driveSize === "LFF"
    ? ELEMENT_INCHES.bayLFF
    : driveSize === "M2"
      ? ELEMENT_INCHES.bayM2
      : ELEMENT_INCHES.baySFF;
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
  rackUnits: number;
};

const clampCols = (n: number) => Math.max(1, Math.min(FACE_COLS, Math.round(n)));

// Per-element physical size for a block's elements.
function elementInches(b: BlockSpec): { w: number; h: number } {
  switch (b.kind) {
    case "bay":
      return bayElementInches(b.driveSize ?? "SFF");
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

// Resolve the effective columns for a block's element matrix. An explicit
// `columns` wins; otherwise pick as many as fit across the face (a single row
// when they fit, wrapping when they don't).
export function resolveColumns(b: BlockSpec, faceWidthInches: number): number {
  const n = elementCount(b);
  if (n <= 0) return 1;
  if (b.columns && b.columns > 0) return Math.min(b.columns, n);
  if (b.rows && b.rows > 0) return Math.max(1, Math.ceil(n / b.rows));
  const el = elementInches(b);
  const fit = Math.max(1, Math.floor(faceWidthInches / (el.w + ELEMENT_GAP_INCHES)));
  return Math.min(n, fit);
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
  if (b.kind === "annotation") return { w: 1, h: 1 };
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
