// Formats a Date for an <input type="date"> value (YYYY-MM-DD).
export function dateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

// Display a Date in the form's local style: "Mar 5, 2026". Returns null for
// null/undefined so detail panels can show a dim placeholder.
export function formatDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Display a Decimal/number/string value as a money amount with the project's
// default currency formatting. The value is rendered to two decimals.
export function formatMoney(
  v: { toString(): string } | number | null | undefined,
): string | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v.toString());
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
