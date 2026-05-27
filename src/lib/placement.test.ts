import { describe, expect, it } from "vitest";
import {
  checkInBounds,
  checkOverlap,
  checkSupport,
  validatePlacement,
  type PlacedAsset,
} from "./placement";

// Helper for the common "rack-form" placement (full-width spans).
function rackForm(
  startU: number,
  rackUnits: number,
  columnCount = 6,
): { startU: number; rackUnits: number; gridColumn: number; columnSpan: number } {
  return { startU, rackUnits, gridColumn: 0, columnSpan: columnCount };
}

const RACK_25U = 25;
const COLS = 6;

describe("checkInBounds", () => {
  it("accepts a placement that sits inside the rack", () => {
    expect(checkInBounds(rackForm(1, 2), RACK_25U, COLS)).toEqual({ ok: true });
    expect(checkInBounds(rackForm(24, 2), RACK_25U, COLS)).toEqual({ ok: true });
  });

  it("rejects startU < 1", () => {
    const r = checkInBounds(rackForm(0, 1), RACK_25U, COLS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Start U/i);
  });

  it("rejects placements that run off the top", () => {
    const r = checkInBounds(rackForm(25, 2), RACK_25U, COLS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/past U25/);
  });

  it("rejects columns past the rack's columnCount", () => {
    const r = checkInBounds(
      { startU: 1, rackUnits: 1, gridColumn: 5, columnSpan: 2 },
      RACK_25U,
      COLS,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/past column/);
  });

  it("rejects rackUnits < 1", () => {
    const r = checkInBounds(rackForm(1, 0), RACK_25U, COLS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Rack units/i);
  });

  it("rejects columnSpan < 1", () => {
    const r = checkInBounds(
      { startU: 1, rackUnits: 1, gridColumn: 0, columnSpan: 0 },
      RACK_25U,
      COLS,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Column span/i);
  });
});

describe("checkOverlap", () => {
  const other: PlacedAsset[] = [
    { id: "a", ...rackForm(10, 2), requiresSupport: false },
  ];

  it("accepts placements that don't touch others", () => {
    expect(checkOverlap(rackForm(1, 1), other)).toEqual({ ok: true });
    expect(checkOverlap(rackForm(20, 4), other)).toEqual({ ok: true });
  });

  it("rejects U-range overlap with the same column range", () => {
    const r = checkOverlap(rackForm(11, 1), other);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Overlaps/);
  });

  it("accepts overlap on U range if columns don't overlap (tower case)", () => {
    const others: PlacedAsset[] = [
      {
        id: "tower-a",
        startU: 1,
        rackUnits: 4,
        gridColumn: 0,
        columnSpan: 2,
        requiresSupport: true,
      },
    ];
    // A tower in cols 2-3 at the same U range — no overlap.
    expect(
      checkOverlap(
        { startU: 1, rackUnits: 4, gridColumn: 2, columnSpan: 2 },
        others,
      ),
    ).toEqual({ ok: true });
  });
});

describe("checkSupport", () => {
  it("doesn't require support when requiresSupport=false", () => {
    expect(
      checkSupport(
        { ...rackForm(15, 1), requiresSupport: false },
        [],
      ),
    ).toEqual({ ok: true });
  });

  it("accepts a supported asset sitting on the rack floor (startU=1)", () => {
    expect(
      checkSupport(
        { ...rackForm(1, 4), requiresSupport: true },
        [],
      ),
    ).toEqual({ ok: true });
  });

  it("rejects an asset floating in mid-air", () => {
    const r = checkSupport(
      { ...rackForm(10, 2), requiresSupport: true },
      [],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unsupported/i);
  });

  it("accepts when a supporter's top edge is directly underneath", () => {
    // Supporter at U1-2 (top edge = U2). Candidate starts at U3.
    const others: PlacedAsset[] = [
      { id: "s", ...rackForm(1, 2), requiresSupport: true },
    ];
    expect(
      checkSupport(
        { ...rackForm(3, 4), requiresSupport: true },
        others,
      ),
    ).toEqual({ ok: true });
  });

  it("rejects when there's a gap between the supporter and the candidate", () => {
    // Supporter at U1-2 (top edge = U2). Candidate at U4 (one U gap).
    const others: PlacedAsset[] = [
      { id: "s", ...rackForm(1, 2), requiresSupport: false },
    ];
    const r = checkSupport(
      { ...rackForm(4, 2), requiresSupport: true },
      others,
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a requiresSupport item sitting on a thin item (patch panel / blank panel)", () => {
    // A patch panel at U1 has rackFace="FRONT" — it is only surface-mounted and
    // cannot physically hold a tower on top of it.
    const others: PlacedAsset[] = [
      { id: "pp", ...rackForm(1, 1), requiresSupport: false, rackFace: "FRONT" },
    ];
    const r = checkSupport(
      { ...rackForm(2, 2), requiresSupport: true },
      others,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unsupported/i);
  });

  it("accepts a requiresSupport item sitting on a full-depth item (no rackFace)", () => {
    const others: PlacedAsset[] = [
      { id: "srv", ...rackForm(1, 2), requiresSupport: false, rackFace: null },
    ];
    expect(
      checkSupport({ ...rackForm(3, 2), requiresSupport: true }, others),
    ).toEqual({ ok: true });
  });

  it("rejects a tower when only some of its columns are supported", () => {
    // Tower spans cols 0-3 at U3-4. Supporter under col 0-1 only.
    const others: PlacedAsset[] = [
      {
        id: "s",
        startU: 1,
        rackUnits: 2,
        gridColumn: 0,
        columnSpan: 2,
        requiresSupport: true,
      },
    ];
    const r = checkSupport(
      {
        startU: 3,
        rackUnits: 2,
        gridColumn: 0,
        columnSpan: 4,
        requiresSupport: true,
      },
      others,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Column 3/);
  });
});

describe("validatePlacement (composite)", () => {
  it("returns the first failure in order: bounds → overlap → support", () => {
    // Out-of-bounds even though it also collides with an existing asset.
    const others: PlacedAsset[] = [
      { id: "x", ...rackForm(1, 25), requiresSupport: false },
    ];
    const r = validatePlacement(
      { ...rackForm(25, 5), requiresSupport: false },
      others,
      RACK_25U,
      COLS,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/past U25/);
  });

  it("passes a well-placed rack-form asset on the floor", () => {
    expect(
      validatePlacement(
        { ...rackForm(1, 2), requiresSupport: true },
        [],
        RACK_25U,
        COLS,
      ),
    ).toEqual({ ok: true });
  });
});
