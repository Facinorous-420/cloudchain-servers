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
