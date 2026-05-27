import { describe, expect, it } from "vitest";
import { estimateCableLengthFeet, type EstimateResult } from "./cable-length";

function asResult(r: unknown): EstimateResult {
  if (!r || typeof r !== "object" || !("feet" in r)) {
    throw new Error("Expected EstimateResult but got: " + JSON.stringify(r));
  }
  return r as EstimateResult;
}

describe("estimateCableLengthFeet", () => {
  it("returns null if either endpoint is unplaced", () => {
    const a = { startU: null, rackUnits: 1, side: "LEFT" as const };
    const b = { startU: 5, rackUnits: 1, side: "LEFT" as const };
    expect(
      estimateCableLengthFeet(a, b, { isPatch: false, kind: "ethernet" }),
    ).toBeNull();
    expect(
      estimateCableLengthFeet(b, a, { isPatch: false, kind: "ethernet" }),
    ).toBeNull();
  });

  it("rounds same-U same-side ethernet up to the next standard length", () => {
    // Same U, same side: vertical ~0", horizontal 12", + 12" loop = ~24" (~2ft).
    // Next Cat6 standard length is 2 ft.
    const r = asResult(estimateCableLengthFeet(
      { startU: 10, rackUnits: 1, side: "LEFT" },
      { startU: 10, rackUnits: 1, side: "LEFT" },
      { isPatch: false, kind: "ethernet" },
    ));
    expect(r.feet).toBe(2);
  });

  it("skips the service loop when isPatch is true", () => {
    const looped = asResult(estimateCableLengthFeet(
      { startU: 10, rackUnits: 1, side: "LEFT" },
      { startU: 11, rackUnits: 1, side: "LEFT" },
      { isPatch: false, kind: "ethernet" },
    ));
    const patch = asResult(estimateCableLengthFeet(
      { startU: 10, rackUnits: 1, side: "LEFT" },
      { startU: 11, rackUnits: 1, side: "LEFT" },
      { isPatch: true, kind: "ethernet" },
    ));
    // Patch should be shorter — fewer inches before rounding.
    expect(patch.rawInches).toBeLessThan(looped.rawInches);
  });

  it("opposite-side ports add ~18 horizontal inches vs same-side", () => {
    const sameSide = asResult(estimateCableLengthFeet(
      { startU: 10, rackUnits: 1, side: "LEFT" },
      { startU: 10, rackUnits: 1, side: "LEFT" },
      { isPatch: true, kind: "ethernet" },
    ));
    const opposite = asResult(estimateCableLengthFeet(
      { startU: 10, rackUnits: 1, side: "LEFT" },
      { startU: 10, rackUnits: 1, side: "RIGHT" },
      { isPatch: true, kind: "ethernet" },
    ));
    expect(opposite.rawInches - sameSide.rawInches).toBe(18);
  });

  it("vertical distance scales linearly with |ΔU| × 1.75\"", () => {
    const close = asResult(estimateCableLengthFeet(
      { startU: 1, rackUnits: 1, side: "LEFT" },
      { startU: 2, rackUnits: 1, side: "LEFT" },
      { isPatch: true, kind: "ethernet" },
    ));
    const far = asResult(estimateCableLengthFeet(
      { startU: 1, rackUnits: 1, side: "LEFT" },
      { startU: 11, rackUnits: 1, side: "LEFT" },
      { isPatch: true, kind: "ethernet" },
    ));
    // |ΔU| difference is 9, so vertical grows by 9 × 1.75 = 15.75 inches.
    expect(far.rawInches - close.rawInches).toBeCloseTo(15.75, 5);
  });

  it("uses power standard sizes for power cables", () => {
    const r = asResult(estimateCableLengthFeet(
      { startU: 1, rackUnits: 1, side: "LEFT" },
      { startU: 15, rackUnits: 1, side: "LEFT" },
      { isPatch: false, kind: "power" },
    ));
    // Power standards: 1,2,3,6,10,15. The estimate should land on one of these.
    expect([1, 2, 3, 6, 10, 15]).toContain(r.feet);
  });

  it("breakdown string mentions vertical, horizontal, and loop sizes", () => {
    const r = asResult(estimateCableLengthFeet(
      { startU: 10, rackUnits: 2, side: "LEFT" },
      { startU: 15, rackUnits: 1, side: "RIGHT" },
      { isPatch: false, kind: "ethernet" },
    ));
    expect(r.breakdown).toMatch(/vertical/i);
    expect(r.breakdown).toMatch(/horizontal/i);
    expect(r.breakdown).toMatch(/loop/i);
  });

  it("returns EstimateFailure with reason for cross-rack connections", () => {
    const r = estimateCableLengthFeet(
      { startU: 1, rackUnits: 1, side: "LEFT", rackId: "rack-a" },
      { startU: 5, rackUnits: 1, side: "LEFT", rackId: "rack-b" },
      { isPatch: false, kind: "ethernet" },
    );
    expect(r).not.toBeNull();
    expect(r).toHaveProperty("reason");
  });
});
