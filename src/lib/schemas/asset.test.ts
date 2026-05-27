import { describe, expect, it } from "vitest";
import { assetSchema } from "./asset";

// Minimal valid asset payload — fills the required text/enum fields and
// leaves everything else blank. Helper so each test can override one thing.
function base(overrides: Record<string, string> = {}) {
  return {
    codename: "SRV-1",
    name: "Test Server",
    category: "SERVER",
    formFactor: "RACK",
    rackUnits: "2",
    ...overrides,
  };
}

describe("assetSchema", () => {
  it("accepts a minimal RACK asset", () => {
    const r = assetSchema.safeParse(base());
    expect(r.success).toBe(true);
  });

  it("rejects missing codename", () => {
    const r = assetSchema.safeParse(base({ codename: "" }));
    expect(r.success).toBe(false);
  });

  it("rejects an invalid category", () => {
    const r = assetSchema.safeParse(base({ category: "NOT_A_CATEGORY" }));
    expect(r.success).toBe(false);
  });

  it("requires rackUnits when formFactor is RACK", () => {
    const r = assetSchema.safeParse(base({ rackUnits: "" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      const issues = r.error.issues.map((i) => i.path.join("."));
      expect(issues).toContain("rackUnits");
    }
  });

  it("requires rackUnits when formFactor is TOWER", () => {
    const r = assetSchema.safeParse(
      base({ formFactor: "TOWER", rackUnits: "" }),
    );
    expect(r.success).toBe(false);
  });

  it("allows rackUnits to be omitted on non-rack form factors", () => {
    const r = assetSchema.safeParse(
      base({ formFactor: "NON_RACK", rackUnits: "" }),
    );
    expect(r.success).toBe(true);
  });

  it("trims whitespace from optional text fields and normalises blanks to null", () => {
    const r = assetSchema.safeParse(base({ manufacturer: "  HP  ", model: "" }));
    expect(r.success).toBe(true);
    if (r.success) {
      // optionalText collapses "" → null and trims around real values.
      expect(r.data.manufacturer).toBe("HP");
    }
  });

  it("coerces purchasePrice from string to number", () => {
    const r = assetSchema.safeParse(base({ purchasePrice: "249.99" }));
    expect(r.success).toBe(true);
    if (r.success) {
      // optionalNumber parses to a number.
      expect(r.data.purchasePrice).toBeCloseTo(249.99);
    }
  });
});
