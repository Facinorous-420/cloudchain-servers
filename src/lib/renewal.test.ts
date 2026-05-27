import { describe, expect, it } from "vitest";
import { computeRenewalDate } from "./renewal";

// Local-midnight Date so setMonth / setFullYear (which work in local time)
// don't shift the day off by one when the test runs in a non-UTC tz. This
// matches how the form passes dates in too — they come out of <input type
// ="date"> as a local-midnight Date.
const D = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const ymd = (date: Date | null) => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

describe("computeRenewalDate", () => {
  it("returns null when the purchase date is missing", () => {
    expect(computeRenewalDate(null, "ANNUAL")).toBeNull();
  });

  it("returns null when the period is missing or perpetual", () => {
    expect(computeRenewalDate(D("2026-01-01"), null)).toBeNull();
    expect(computeRenewalDate(D("2026-01-01"), "PERPETUAL")).toBeNull();
  });

  it("adds a day for DAILY", () => {
    expect(ymd(computeRenewalDate(D("2026-01-01"), "DAILY"))).toBe(
      "2026-01-02",
    );
  });

  it("adds 7 days for WEEKLY", () => {
    expect(ymd(computeRenewalDate(D("2026-01-01"), "WEEKLY"))).toBe(
      "2026-01-08",
    );
  });

  it("adds 14 days for BI_WEEKLY", () => {
    expect(ymd(computeRenewalDate(D("2026-01-01"), "BI_WEEKLY"))).toBe(
      "2026-01-15",
    );
  });

  it("adds one calendar month for MONTHLY", () => {
    expect(ymd(computeRenewalDate(D("2026-01-15"), "MONTHLY"))).toBe(
      "2026-02-15",
    );
  });

  it("adds three months for QUARTERLY", () => {
    expect(ymd(computeRenewalDate(D("2026-01-15"), "QUARTERLY"))).toBe(
      "2026-04-15",
    );
  });

  it("adds six months for BI_ANNUAL", () => {
    expect(ymd(computeRenewalDate(D("2026-01-15"), "BI_ANNUAL"))).toBe(
      "2026-07-15",
    );
  });

  it("adds one year for ANNUAL", () => {
    expect(ymd(computeRenewalDate(D("2026-01-15"), "ANNUAL"))).toBe(
      "2027-01-15",
    );
  });

  it("adds two years for TWO_YEARS", () => {
    expect(ymd(computeRenewalDate(D("2026-01-15"), "TWO_YEARS"))).toBe(
      "2028-01-15",
    );
  });

  it("adds five years for FIVE_YEARS", () => {
    expect(ymd(computeRenewalDate(D("2026-01-15"), "FIVE_YEARS"))).toBe(
      "2031-01-15",
    );
  });

  it("adds ten years for TEN_YEARS", () => {
    expect(ymd(computeRenewalDate(D("2026-01-15"), "TEN_YEARS"))).toBe(
      "2036-01-15",
    );
  });
});
