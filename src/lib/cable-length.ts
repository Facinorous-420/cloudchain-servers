// Cable-length estimator. Pure functions used by the Connection form to give
// the user a length estimate as soon as both endpoints are picked.
//
// Geometry model (homelab rack, single vertical cable channel on the LEFT):
//
//   vertical_inches    = |center_U_of_A - center_U_of_B| × 1.75
//   horizontal_per_end = LEFT-side port → 6"  (stub to cable channel)
//                        RIGHT-side port → 24" (cross full chassis to LEFT cable channel)
//   service_loop       = serviceLoopInches unless `isPatch` is true
//
//   total_inches       = vertical + horizontal_A + horizontal_B + service_loop
//
// The raw figure is rounded up to the next standard cable length so the
// suggestion matches something you can actually buy.

export type DeviceSide = "LEFT" | "CENTER" | "RIGHT";

export type EndpointGeometry = {
  startU: number | null;
  rackUnits: number | null;
  side: DeviceSide;
  rackId?: string | null;
};

// Standard cable lengths in feet. Cat6 distribution sizes for Ethernet, IEC
// C13/C14 sizes for power.
const ETHERNET_FEET = [1, 2, 3, 5, 7, 10, 14, 25, 50, 75, 100];
const POWER_FEET = [1, 2, 3, 6, 10, 15];

const U_HEIGHT_INCHES = 1.75;
const HORIZ_LEFT_INCHES = 6;
const HORIZ_RIGHT_INCHES = 24;
export const DEFAULT_SERVICE_LOOP_INCHES = 12;

export type EstimateResult = {
  feet: number; // rounded-up to a standard length
  rawInches: number; // raw straight-line + horizontal + loop estimate
  breakdown: string; // human-readable explanation for the form
};

// Returned instead of EstimateResult when estimation is deliberately skipped
// (e.g. cross-rack) — the caller should show the reason as a note.
export type EstimateFailure = {
  reason: string;
};

export function estimateCableLengthFeet(
  a: EndpointGeometry,
  b: EndpointGeometry,
  options: {
    isPatch: boolean;
    kind: "ethernet" | "power";
    serviceLoopInches?: number;
  },
): EstimateResult | EstimateFailure | null {
  // Both endpoints are in named racks but different ones — no in-rack geometry available.
  if (a.rackId && b.rackId && a.rackId !== b.rackId) {
    return {
      reason:
        "Devices are in different racks — cable length cannot be estimated from rack positions. Enter the actual length manually.",
    };
  }

  // One or both endpoints lack a rack position.
  if (
    a.startU == null ||
    a.rackUnits == null ||
    b.startU == null ||
    b.rackUnits == null
  ) {
    return null;
  }

  const aCenter = a.startU + a.rackUnits / 2;
  const bCenter = b.startU + b.rackUnits / 2;
  const verticalInches = Math.abs(aCenter - bCenter) * U_HEIGHT_INCHES;

  const aHoriz = a.side === "RIGHT" ? HORIZ_RIGHT_INCHES : HORIZ_LEFT_INCHES;
  const bHoriz = b.side === "RIGHT" ? HORIZ_RIGHT_INCHES : HORIZ_LEFT_INCHES;
  const loop = options.isPatch
    ? 0
    : (options.serviceLoopInches ?? DEFAULT_SERVICE_LOOP_INCHES);

  const rawInches = verticalInches + aHoriz + bHoriz + loop;
  const rawFeet = Math.ceil(rawInches / 12);

  const standards = options.kind === "power" ? POWER_FEET : ETHERNET_FEET;
  const feet = standards.find((l) => l >= rawFeet) ?? rawFeet;

  const breakdown =
    `vertical ${Math.round(verticalInches)}" + horizontal ${aHoriz + bHoriz}" ` +
    `+ ${options.isPatch ? "no loop (patch)" : `service loop ${loop}"`} ` +
    `= ${Math.ceil(rawInches)}" (~${rawFeet} ft) → round up to ${feet} ft`;

  return { feet, rawInches, breakdown };
}
