// Derives the next renewal date for a license from the purchase date and the
// chosen renewal period. PERPETUAL or missing inputs yield null.

import type { RENEWAL_PERIODS } from "@/lib/enums";

type RenewalPeriod = (typeof RENEWAL_PERIODS)[number];

export function computeRenewalDate(
  purchaseDate: Date | null,
  period: RenewalPeriod | null,
): Date | null {
  if (!purchaseDate || !period || period === "PERPETUAL") return null;

  const d = new Date(purchaseDate);
  switch (period) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      break;
    case "BI_WEEKLY":
      d.setDate(d.getDate() + 14);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      break;
    case "QUARTERLY":
      d.setMonth(d.getMonth() + 3);
      break;
    case "BI_ANNUAL":
      d.setMonth(d.getMonth() + 6);
      break;
    case "ANNUAL":
      d.setFullYear(d.getFullYear() + 1);
      break;
    case "TWO_YEARS":
      d.setFullYear(d.getFullYear() + 2);
      break;
    case "FIVE_YEARS":
      d.setFullYear(d.getFullYear() + 5);
      break;
    case "TEN_YEARS":
      d.setFullYear(d.getFullYear() + 10);
      break;
  }
  return d;
}
